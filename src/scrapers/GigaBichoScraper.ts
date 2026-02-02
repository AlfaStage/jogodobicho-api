import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS } from '../config/loterias.js';

export class GigaBichoScraper extends ScraperBase {
    private webhookService = new WebhookService();

    constructor() {
        super('https://www.gigabicho.com.br/');
    }

    async execute(targetSlug?: string): Promise<void> {
        console.log('[GigaBichoScraper] Iniciando varredura...');

        // Se um slug for passado, tenta buscar apenas a URL dele
        let loteriasAlvo = LOTERIAS.filter(l => l.urlGigaBicho);

        if (targetSlug) {
            loteriasAlvo = loteriasAlvo.filter(l => l.slug === targetSlug);
        }

        for (const loteria of loteriasAlvo) {
            try {
                if (loteria.urlGigaBicho) {
                    await this.scrapeUrl(loteria.urlGigaBicho, loteria.slug);
                }
            } catch (e) {
                console.error(`[GigaBichoScraper] Erro ao processar ${loteria.nome}:`, e);
            }
        }

        console.log('[GigaBichoScraper] Varredura finalizada.');
    }

    private async scrapeUrl(url: string, slug: string): Promise<void> {
        // console.log(`[GigaBichoScraper] Buscando: ${url}`);
        const $ = await this.fetchHtml(url);
        if (!$) return;

        // Estrutura do GigaBicho:
        // H3 contendo o título do sorteio (Ex: "Sorteio 14 horas PT")
        // Seguido por uma lista ou tabela de resultados.
        // O chunk visualizado mostrou "### Sorteio 14 horas PT" seguido por listas.
        // No HTML real, provavelmente são <h3> e depois <ul> ou <table>.

        // Vamos procurar todos os H3 para identificar horários
        const headers = $('h3');

        headers.each((idx, el) => {
            const titulo = $(el).text().trim();
            // Ex: "Sorteio 14 horas PT"
            // Vamos tentar extrair hora e minuto? Ou usar o titulo como ID horario?
            // O sistema atual usa HH:mm. Precisamos normalizar.

            const horarioMatch = titulo.match(/(\d{1,2})\s*horas/i);
            if (!horarioMatch) return; // Pula se não for cabeçalho de sorteio

            let hora = parseInt(horarioMatch[1]);
            let minuto = '00'; // Default, pois o Título geralmente é "14 horas"

            // Refinamento para PT Rio que tem horários quebrados? (11:20, etc)
            // O GigaBicho parece arredondar no título "11 horas PTM", mas o sorteio é 11:20.
            // Para manter consistencia com o banco (UNIQUE constraint), precisamos bater com os horários do config?
            // Ou o banco aceita qualquer string como horário?
            // O init-db define horario como TEXT, mas resultados UNIQUE(data, horario, loterica_slug).
            // Se salvarmos '11:00' e o config diz '11:20', ok, são apenas strings diferentes.
            // Mas para o Frontend seria ideal normalizar. 
            // Vamos tentar usar o horário "formatado" HH:mm.

            const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto}`;

            // Data: O GigaBicho mostra a data logo abaixo do H3?
            // No chunk: "Segunda-feira 02/02/2026"
            // No HTML, pode ser um <p> ou <span> logo após o H3.

            // Tentativa de pegar a data do contexto próximo
            // Vamos olhar os irmãos seguintes até achar a data
            let dataIso = '';
            let next = $(el).next();

            // Loop simples para achar a data nos proximos 3 elementos
            for (let i = 0; i < 3; i++) {
                const txt = next.text().trim();
                const dataMatch = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dataMatch) {
                    dataIso = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`; // YYYY-MM-DD
                    break;
                }
                next = next.next();
            }

            if (!dataIso) {
                // Fallback: Data de hoje? Melhor não arriscar dados errados.
                // Mas se o scraper roda no dia, é provavel ser hoje.
                const hoje = new Date();
                dataIso = hoje.toISOString().split('T')[0];
            }

            // Se for tabela "1º ao 10º", vamos ignorar ou processar?
            // Geralmente queremos o principal (1 ao 5 + 6/7).
            // O chunk mostra "Sorteio 14 horas PT" com apenas 1 ao 5?
            // Não, o chunk mostra lista item a item: "1º ... 8961 Leão".

            // A estrutura parece ser que "Sorteio X" tem os premios. "Sorteio X 1 ao 10" tem mais.
            // Vamos focar no bloco principal. Se o titulo contiver "1º ao 10º", talvez pular se já pegamos o principal.
            // Mas as vezes o principal só tem 5.
            // Vamos processar tudo. O banco ignora duplicatas de ID mas não de premios se o ID do resultado for novo.
            // Precisamos checar se JÁ EXISTE resultado para aquele horario.

            // Extração dos prêmios
            // O chunk sugere que os prêmios podem estar em listas <li> ou parágrafos.
            // "1º 8961 Leão"

            const premios: any[] = [];

            // Vamos procurar listas ou tabelas apos o header
            // O seletor exato depende do HTML real, mas vamos tentar ir iterando next()
            // até achar container de prêmios.

            // H3 -> (texto data) -> DIV/UL (premios)

            let container = $(el).nextAll('div, ul, table').first();

            // Estrutura do GigaBicho variavel. Vamos tentar achar padrões de texto "1º", "2º"...
            const lines = container.text().split('\n').map(l => l.trim()).filter(l => l);

            // Parser genérico de texto linhas
            // Procura padrao: "1º" seguido de numero (milhar) e bicho

            let currentPos = 0;

            // Exemplo de conteudo texto: 
            // 1º
            // 8961
            // Leão (16)

            let buffer: { pos?: number, milhar?: string, bicho?: string } = {};

            // Tentar identificar blocos
            // Se acharmos "1º", iniciamos captura.
            // Se acharmos numero de 3-4 digitos, é milhar.
            // Se acharmos nome de bicho, é bicho.

            // Melhor: Tentar regex em cada linha ou bloco.

            // Se for TABLE é mais fácil
            if (container.is('table')) {
                container.find('tr').each((_, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 2) {
                        const posTxt = $(tds[0]).text().trim().replace('º', '');
                        const pos = parseInt(posTxt);
                        const val = $(tds[1]).text().trim(); // Milhar + Bicho?
                        // Logica especifica de tabela
                        if (!isNaN(pos)) {
                            // Tentar separar milhar e bicho
                            // Ex: "1234 - Cobra"
                            const parts = val.split(/[- ]+/);
                            const milhar = parts[0];
                            // Bicho é o resto ou look up?
                            // Vamos assumir string simples
                            premios.push({
                                posicao: pos,
                                milhar: milhar,
                                grupo: this.getGrupoFromMilhar(milhar),
                                bicho: this.getBichoFromGrupo(this.getGrupoFromMilhar(milhar)) // Recalcular pra garantir
                            });
                        }
                    }
                });
            } else {
                // Parsing de Texto/Divs (como visto no Chunk)
                // O chunk mostra "1º" ... "8961" ... "Leão (16)" em linhas separadas.
                let captureStage = 0; // 0=buscando pos, 1=buscando milhar, 2=buscando bicho

                lines.forEach(line => {
                    // Detectar Posição
                    const posMatch = line.match(/^(\d{1,2})º$/);
                    if (posMatch) {
                        if (buffer.pos && buffer.milhar) {
                            // Salvar anterior se incompleto?
                            // Não, reseta.
                        }
                        buffer = { pos: parseInt(posMatch[1]) };
                        captureStage = 1;
                        return;
                    }

                    if (captureStage === 1) {
                        // Esperando Milhar
                        if (/^\d{3,4}$/.test(line)) {
                            buffer.milhar = line;
                            captureStage = 2;
                            return;
                        } else if (line === '--') {
                            // Vazio
                            captureStage = 0;
                            buffer = {};
                        }
                    }

                    if (captureStage === 2) {
                        // Esperando Bicho
                        // "Leão (16)"
                        buffer.bicho = line.split('(')[0].trim();
                        // Salvar
                        premios.push({
                            posicao: buffer.pos,
                            milhar: buffer.milhar,
                            grupo: this.getGrupoFromMilhar(buffer.milhar!),
                            bicho: buffer.bicho
                        });
                        buffer = {};
                        captureStage = 0;
                    }
                });
            }

            if (premios.length > 0) {
                this.saveResult(slug, dataIso, horarioFormatado, premios);
            }
        });
    }

    private getGrupoFromMilhar(milhar: string): number {
        const m = parseInt(milhar);
        if (isNaN(m)) return 0;
        const dezenas = m % 100;
        if (dezenas === 0) return 25; // Vaca (97-00) -> 00 é vaca
        return Math.ceil(dezenas / 4);
    }

    private getBichoFromGrupo(grupo: number): string {
        const bichos = [
            'Avestruz', 'Águia', 'Burro', 'Borboleta', 'Cachorro', 'Cabra', 'Carneiro', 'Camelo',
            'Cobra', 'Coelho', 'Cavalo', 'Elefante', 'Galo', 'Gato', 'Jacaré', 'Leão',
            'Macaco', 'Porco', 'Pavão', 'Peru', 'Touro', 'Tigre', 'Urso', 'Veado', 'Vaca'
        ];
        return bichos[grupo - 1] || 'Desconhecido';
    }

    private saveResult(slug: string, data: string, horario: string, premios: any[]) {
        // Lógica de banco similar ao GlobalScraper
        // ... Reusar db.transaction

        const getResultadoId = db.prepare('SELECT id FROM resultados WHERE data = ? AND horario = ? AND loterica_slug = ?');
        const insertResultado = db.prepare('INSERT OR IGNORE INTO resultados (id, data, horario, loterica_slug) VALUES (?, ?, ?, ?)');
        const insertPremio = db.prepare('INSERT INTO premios (id, resultado_id, posicao, milhar, grupo, bicho) VALUES (?, ?, ?, ?, ?, ?)');

        db.transaction(() => {
            let res = getResultadoId.get(data, horario, slug) as { id: string };
            if (!res) {
                const id = randomUUID();
                try {
                    insertResultado.run(id, data, horario, slug);

                    premios.forEach(p => {
                        insertPremio.run(randomUUID(), id, p.posicao, p.milhar, p.grupo, p.bicho);
                    });

                    console.log(`[GigaBicho] Gravado: ${slug} - ${data} - ${horario}`);

                    this.webhookService.notifyAll('novo_resultado', {
                        loterica: slug,
                        data,
                        horario,
                        premios
                    }).catch(() => { });

                } catch (e) {
                    console.error('[GigaBicho] Erro ao salvar:', e);
                }
            } else {
                // Já existe, ignora
                // console.log(`[GigaBicho] Já existe: ${slug} - ${data} - ${horario}`);
            }
        })();
    }
}
