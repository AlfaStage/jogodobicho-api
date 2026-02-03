import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';

export class GlobalScraper extends ScraperBase {
    private webhookService = new WebhookService();

    constructor() {
        super('https://www.ojogodobicho.com/resultados.htm');
    }

    async execute(targets: LotericaConfig[] = LOTERIAS, targetSlug?: string, shouldNotify: boolean = true): Promise<void> {
        console.log(`[GlobalScraper] Iniciando varredura global (${targets.length} alvos)...`);

        // Filtrar apenas lotéricas alvo que têm URL definida
        const urlsToScrape = targets
            .filter(l => l.url && l.url.length > 0)
            .map(l => l.url!);

        // Remover duplicatas (ex: jb-bahia e paratodos-bahia podem usar a mesma URL)
        const uniqueUrls = [...new Set(urlsToScrape)];

        for (const url of uniqueUrls) {
            try {
                await this.scrapeUrl(url, shouldNotify);
            } catch (e) {
                console.error(`[GlobalScraper] Erro ao processar ${url}:`, e);
            }
        }

        console.log('[GlobalScraper] Varredura finalizada.');
    }

    private async scrapeUrl(url: string, shouldNotify: boolean): Promise<void> {
        // console.log(`Buscando dados de: ${url}`); 
        // (Reduzir log spam se rodar muito frequente)
        const $ = await this.fetchHtml(url);
        if (!$) return;

        // Identificar qual loterica é baseada na URL
        // Pode haver múltiplas lotéricas para mesma URL (ex: bahia)
        // O ideal é tentar descobrir pelo título da tabela ou contexto, mas por simplificação
        // vamos mapear a URL para o SLUG principal associado a ela na config.
        // Se houverem conflitos (mesma URL, slugs diferentes), vamos precisar de logica extra.
        // Por ora, vamos simplificar: Salvar com o slug da PRIMEIRA lotérica que tem essa URL.
        const config = LOTERIAS.find(l => l.url === url);
        if (!config) return;

        let lotericaSlug = config.slug;

        // Lógica específica para desambiguar se necessário, ou aceitar que urls compartilhadas
        // salvarão no slug principal. Para separar Bahia/Paratodos Bahia na mesma página,
        // precisariamos analisar o conteúdo da tabela.
        // O site ojogodobicho geralmente tem tabelas separadas? Vamos assumir que sim.

        const tables = $('table');

        for (let i = 0; i < tables.length; i++) {
            const table = $(tables[i]);
            const caption = table.find('caption').text().trim(); // "Data..."

            // Tentar identificar subtitulo ou classe que indique a banca específica?
            // Difícil sem ver o HTML exato de páginas multiplas.
            // Vamos manter o slug base da URL.

            const dataMatch = caption.match(/(\d{1,2}) de ([A-Za-zç]+) de (\d{4})/);
            if (!dataMatch) continue;

            const day = dataMatch[1].padStart(2, '0');
            const monthName = dataMatch[2].toLowerCase();
            const year = dataMatch[3];
            const months: { [key: string]: string } = {
                'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'mar\u00E7o': '03',
                'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
                'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
            };
            const month = months[monthName];
            if (!month) continue;

            const dataIso = `${year}-${month}-${day}`;
            const headers: string[] = [];
            table.find('thead th').each((idx, el) => {
                const txt = $(el).text().trim();
                // Ignorar colunas vazias ou de cabeçalho irrelevante
                if (txt && idx > 0) headers.push(txt);
            });

            const resultadosMap = new Map<string, any[]>();
            const rows = table.find('tbody tr');

            rows.each((rowIdx, rowEl) => {
                const cells = $(rowEl).find('td');
                const posicao = parseInt($(cells[0]).text().trim());
                if (isNaN(posicao)) return;

                for (let j = 1; j < cells.length; j++) {
                    // Cuidado com limites array
                    if (j - 1 >= headers.length) continue;

                    const horario = headers[j - 1];
                    if (!horario) continue;

                    const cell = $(cells[j]);
                    const conteudo = cell.text().trim();
                    const bichoNome = cell.attr('title') || 'Desconhecido';

                    if (!conteudo || conteudo.includes('0000') || conteudo === '-') continue;

                    const parts = conteudo.split('-');
                    if (parts.length < 2) continue;

                    if (!resultadosMap.has(horario)) resultadosMap.set(horario, []);
                    resultadosMap.get(horario)!.push({
                        posicao,
                        milhar: parts[0],
                        grupo: parseInt(parts[1]),
                        bicho: bichoNome
                    });
                }
            });

            const insertResultado = db.prepare('INSERT OR IGNORE INTO resultados (id, data, horario, loterica_slug) VALUES (?, ?, ?, ?)');
            const getResultadoId = db.prepare('SELECT id FROM resultados WHERE data = ? AND horario = ? AND loterica_slug = ?');
            const insertPremio = db.prepare('INSERT INTO premios (id, resultado_id, posicao, milhar, grupo, bicho) VALUES (?, ?, ?, ?, ?, ?)');

            for (const [horario, premios] of resultadosMap.entries()) {
                // Validação mínima: Jogo do Bicho tem que ter pelo menos 5 prêmios principais
                if (premios.length < 5) {
                    // console.warn(`[GlobalScraper] Ignorando resultado incompleto de ${horario}: apenas ${premios.length} prêmios.`);
                    continue;
                }

                db.transaction(() => {
                    let res = getResultadoId.get(dataIso, horario, lotericaSlug) as { id: string };
                    if (!res) {
                        const id = randomUUID();
                        insertResultado.run(id, dataIso, horario, lotericaSlug);

                        premios.forEach(p => {
                            insertPremio.run(randomUUID(), id, p.posicao, p.milhar, p.grupo, p.bicho);
                        });

                        console.log(`[OK] Gravado: ${lotericaSlug} - ${dataIso} - ${horario}`);

                        if (shouldNotify) {
                            this.webhookService.notifyAll('novo_resultado', {
                                loterica: lotericaSlug,
                                data: dataIso,
                                horario,
                                premios
                            }).catch(() => { });
                        }
                    }
                })();
            }
        }
    }

    // Removido getSlugFromUrl hardcoded em favor do config
    // private getSlugFromUrl(url: string): string { ... }
}
