import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { WebhookService } from '../services/WebhookService.js';
import * as cheerio from 'cheerio';
import { LotericaConfig } from '../config/loterias.js';
import { scrapingStatusService } from '../services/ScrapingStatusService.js';

interface PalpiteGrupo {
    bicho: string;
    grupo: number;
    dezenas: string;
}

interface BingoPremio {
    numero: string;
    extracao: string;
    premio: string;
}

export class PalpitesScraper extends ScraperBase {
    private webhookService = new WebhookService();
    protected serviceName = 'PalpitesScraper';

    constructor() {
        super('https://www.resultadofacil.com.br/palpites-do-dia');
    }

    // Adaptado para assinatura da base: targetSlug será usado como 'mode'
    async execute(targets?: LotericaConfig[], targetSlug?: string, shouldNotify: boolean = true): Promise<void> {
        const mode = (targetSlug === 'bingos') ? 'bingos' : 'palpites';
        const horario = (mode === 'bingos') ? '23:30' : '07:00';
        const dataHojeIso = new Date().toISOString().split('T')[0];

        logger.info(this.serviceName, `Iniciando varredura modo: ${mode}`);

        // Registrar tentativa
        scrapingStatusService.registerAttempt(mode, horario, dataHojeIso);
        scrapingStatusService.registerPending(mode, (mode === 'bingos' ? 'Bingos do Dia' : 'Palpites do Dia'), horario, dataHojeIso);

        const $ = await this.fetchHtmlWithRetry();
        if (!$) {
            const errorMsg = 'Falha ao carregar página de palpites';
            logger.error(this.serviceName, errorMsg);
            scrapingStatusService.registerError(mode, horario, dataHojeIso, errorMsg);
            return;
        }

        if (mode === 'palpites') {
            await this.scrapePalpitesDoDia($, dataHojeIso);
        } else if (mode === 'bingos') {
            await this.scrapeBingosDoDia($, dataHojeIso);
        }
    }

    private async scrapePalpitesDoDia($: cheerio.CheerioAPI, data: string) {
        // Verificar se já existe
        const exists = db.prepare('SELECT id FROM palpites_dia WHERE data = ?').get(data);
        if (exists) {
            logger.info(this.serviceName, `Palpites para ${data} já coletados.`);
            return;
        }

        // 1. Grupos/Bichos do dia
        const grupos: PalpiteGrupo[] = [];
        // Seletores baseados na estrutura analisada:
        // h4 com texto "🏆[Bicho] - Grupo [XX]" seguido por p com "Dezenas: ..."

        $('h4').each((i: number, el: any) => {
            const text = $(el).text().trim(); // Ex: "🏆Elefante - Grupo 12"
            if (!text.includes('Grupo')) return;

            const match = text.match(/[🏆]?\s*([A-Za-zçãéêíóôõú]+)\s*-\s*Grupo\s*(\d+)/i);
            if (match) {
                const bicho = match[1].trim();
                const grupo = parseInt(match[2]);

                // O parágrafo seguinte contém as dezenas
                const dezenasTxt = $(el).next('p').text().trim(); // Ex: "Dezenas: 45, 46, 47, 48"
                const dezenasMatch = dezenasTxt.match(/Dezenas:\s*([\d,\s]+)/i);

                if (dezenasMatch) {
                    grupos.push({
                        bicho,
                        grupo,
                        dezenas: dezenasMatch[1].trim()
                    });
                }
            }
        });

        // 2. Milhar do dia
        const milhares: string[] = [];
        // Procurar Heading "MILHAR do dia" e pegar o parágrafo seguinte com números
        const milharHeader = $('h4:contains("MILHAR do dia")');
        if (milharHeader.length) {
            const milesTxt = milharHeader.nextAll('p').eq(1).text().trim(); // Geralmente é o segundo p, o primeiro diz "Nosso palpite..."
            // Texto ex: "1458 - 1484 - 1548 ..."
            // Extrair sequências de 4 dígitos
            const matches = milesTxt.match(/\b\d{4}\b/g);
            if (matches) {
                milhares.push(...matches);
            }
        }

        // 3. Centena do dia
        const centenas: string[] = [];
        const centenaHeader = $('h4:contains("CENTENA do dia")');
        if (centenaHeader.length) {
            const centTxt = centenaHeader.nextAll('p').eq(1).text().trim();
            const matches = centTxt.match(/\b\d{3}\b/g);
            if (matches) {
                centenas.push(...matches);
            }
        }

        if (grupos.length === 0 && milhares.length === 0) {
            logger.warn(this.serviceName, 'Nenhum palpite encontrado. Estrutura pode ter mudado.');
            return;
        }

        // Salvar no BD
        this.savePalpites(data, grupos, milhares, centenas);
    }

    private async scrapeBingosDoDia($: cheerio.CheerioAPI, data: string) {
        // Verificar se já existem bingos para hoje? 
        // Talvez queiramos atualizar ao longo do dia ou só salvar se não existir.
        // Como roda 23:30, assumimos que é a carga final.
        // Se quisermos rodar mais vezes, teríamos que deletar e reinserir ou verificar diff.
        // Vamos usar abordagem simples: deletar e inserir para a data (update).

        const premiosMilhar: BingoPremio[] = [];
        const premiosCentena: BingoPremio[] = [];
        const premiosGrupo: BingoPremio[] = [];

        // Procurar tabelas. O HTML tem várias tabelas para "Milhares premiadas", "Centenas premiadas", "Grupos premiados"

        $('table').each((i: number, table: any) => {
            const headerText = $(table).find('tr').first().text().trim(); // Ex: "🏆Milhares premiadas"

            let targetArray: BingoPremio[] | null = null;
            if (headerText.includes('Milhares premiadas')) targetArray = premiosMilhar;
            else if (headerText.includes('Centenas premiadas')) targetArray = premiosCentena;
            else if (headerText.includes('Grupos premiados')) targetArray = premiosGrupo;

            if (targetArray) {
                $(table).find('tr').each((j: number, row: any) => {
                    const cells = $(row).find('td');
                    // Estrutura: [Milhar/Centena/Grupo/Bicho] | Extração | Prêmio
                    // As vezes a primeira célula tem texto misturado ou span.
                    // No snapshot:
                    // row "8145 LOTECE - CE, 15:45 (tarde II) 6º Premio":
                    //   cell "8145"
                    //   cell "LOTECE - CE, 15:45 (tarde II)"
                    //   cell "6º Premio"

                    if (cells.length >= 3) {
                        const numero = $(cells[0]).text().trim(); // Ex: "8145" ou "15 - Jacaré"
                        const extracao = $(cells[1]).text().trim();
                        const premio = $(cells[2]).text().trim();

                        // Validar se cabeçalho não foi pego (geralmente usamos th mas vai que...)
                        if (!numero || numero.includes('Extração') || numero.includes('Prêmio')) return;

                        if (targetArray) targetArray.push({ numero, extracao, premio });
                    }
                });
            }
        });

        if (premiosMilhar.length === 0 && premiosCentena.length === 0 && premiosGrupo.length === 0) {
            logger.warn(this.serviceName, 'Nenhum bingo encontrado.');
            return;
        }

        this.saveBingos(data, premiosMilhar, premiosCentena, premiosGrupo);
    }

    private savePalpites(data: string, grupos: PalpiteGrupo[], milhares: string[], centenas: string[]) {
        try {
            const id = randomUUID();
            const insertPalpite = db.prepare('INSERT INTO palpites_dia (id, data) VALUES (?, ?)');
            const insertGrupo = db.prepare('INSERT INTO palpites_grupos (id, palpite_id, bicho, grupo, dezenas) VALUES (?, ?, ?, ?, ?)');
            const insertMilhar = db.prepare('INSERT INTO palpites_milhares (id, palpite_id, numero) VALUES (?, ?, ?)');
            const insertCentena = db.prepare('INSERT INTO palpites_centenas (id, palpite_id, numero) VALUES (?, ?, ?)');

            const transaction = db.transaction(() => {
                insertPalpite.run(id, data);

                for (const g of grupos) {
                    insertGrupo.run(randomUUID() as any, id, g.bicho, g.grupo, g.dezenas);
                }

                for (const m of milhares) {
                    insertMilhar.run(randomUUID() as any, id, m);
                }

                for (const c of centenas) {
                    insertCentena.run(randomUUID() as any, id, c);
                }
            });

            transaction();
            logger.success(this.serviceName, `Palpites salvos para ${data}: ${grupos.length} grupos, ${milhares.length} milhares, ${centenas.length} centenas.`);

            // Webhook notification could be added here
            this.webhookService.notifyAll('novos_palpites', { data, grupos, milhares, centenas }).catch(() => { });

            // Sucesso dos Palpites
            scrapingStatusService.registerSuccess('palpites', '07:00', data, 'scraper', id as any);

        } catch (error: any) {
            logger.error(this.serviceName, 'Erro ao salvar palpites:', error);
            scrapingStatusService.registerError('palpites', '07:00', data, error.message);
        }
    }

    private saveBingos(data: string, milhares: BingoPremio[], centenas: BingoPremio[], grupos: BingoPremio[]) {
        try {
            // Check existence and delete if exists (to allow update)
            const exists = db.prepare('SELECT id FROM bingos_dia WHERE data = ?').get(data) as { id: string } | undefined;

            let bingoId = exists ? exists.id : randomUUID();

            const transaction = db.transaction(() => {
                if (exists) {
                    // Limpar premios antigos para atualizar
                    db.prepare('DELETE FROM bingos_premios WHERE bingo_id = ?').run(bingoId);
                } else {
                    db.prepare('INSERT INTO bingos_dia (id, data) VALUES (?, ?)').run(bingoId, data);
                }

                const insertPremio = db.prepare('INSERT INTO bingos_premios (id, bingo_id, tipo, numero, extracao, premio) VALUES (?, ?, ?, ?, ?, ?)');

                for (const p of milhares) insertPremio.run(randomUUID() as any, bingoId as any, 'milhar', p.numero, p.extracao, p.premio);
                for (const p of centenas) insertPremio.run(randomUUID() as any, bingoId as any, 'centena', p.numero, p.extracao, p.premio);
                for (const p of grupos) insertPremio.run(randomUUID() as any, bingoId as any, 'grupo', p.numero, p.extracao, p.premio);
            });

            transaction();
            logger.success(this.serviceName, `Bingos salvos para ${data}: ${milhares.length} milhares, ${centenas.length} centenas, ${grupos.length} grupos.`);

            // Sucesso do Bingo
            scrapingStatusService.registerSuccess('bingos', '23:30', data, 'scraper', bingoId as any);

        } catch (error: any) {
            logger.error(this.serviceName, 'Erro ao salvar bingos:', error);
            scrapingStatusService.registerError('bingos', '23:30', data, error.message);
        }
    }
}
