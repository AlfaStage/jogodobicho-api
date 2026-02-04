import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { logger } from '../utils/logger.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';
import { LoteriaPendente } from '../services/ScraperService.js';

export class GlobalScraper extends ScraperBase {
    private webhookService = new WebhookService();
    protected serviceName = 'GlobalScraper';

    constructor() {
        super('https://www.ojogodobicho.com/resultados.htm');
    }

    async execute(targets: LoteriaPendente[] | LotericaConfig[] = LOTERIAS, targetSlug?: string, shouldNotify: boolean = true): Promise<void> {
        // Converter para formato padronizado se necessário
        const loteriasPendentes: LoteriaPendente[] = this.isLoteriaPendenteArray(targets) 
            ? targets 
            : (targets as LotericaConfig[]).map(l => ({ loteria: l, horariosPendentes: l.horarios || [] }));

        logger.info(this.serviceName, `Iniciando varredura global (${loteriasPendentes.length} lotéricas)...`);

        // Filtrar apenas lotéricas alvo que têm URL definida
        const urlsToScrape = loteriasPendentes
            .filter(lp => lp.loteria.url && lp.loteria.url.length > 0)
            .map(lp => ({ url: lp.loteria.url!, horariosPendentes: lp.horariosPendentes }));

        // Agrupar por URL (podem haver múltiplas lotéricas com a mesma URL)
        const urlMap = new Map<string, string[]>();
        for (const item of urlsToScrape) {
            const existing = urlMap.get(item.url) || [];
            // Merge horários pendentes, removendo duplicatas
            const merged = [...new Set([...existing, ...item.horariosPendentes])];
            urlMap.set(item.url, merged);
        }

        for (const [url, horariosPendentes] of urlMap) {
            try {
                await this.scrapeUrl(url, horariosPendentes, shouldNotify);
            } catch (e) {
                logger.error(this.serviceName, `Erro ao processar ${url}:`, e);
            }
        }

        logger.success(this.serviceName, 'Varredura finalizada');
    }

    private isLoteriaPendenteArray(targets: any[]): targets is LoteriaPendente[] {
        return targets.length > 0 && 'loteria' in targets[0] && 'horariosPendentes' in targets[0];
    }

    private async scrapeUrl(url: string, horariosPendentes: string[], shouldNotify: boolean): Promise<void> {
        // Usar fetchHtmlWithRetry que tem retry infinito e delay automático
        const $ = await this.fetchHtmlWithRetry(url);
        if (!$) return;

        // Identificar qual loterica é baseada na URL
        const config = LOTERIAS.find(l => l.url === url);
        if (!config) return;

        let lotericaSlug = config.slug;

        const tables = $('table');

        for (let i = 0; i < tables.length; i++) {
            const table = $(tables[i]);
            const caption = table.find('caption').text().trim();

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
                if (txt && idx > 0) headers.push(txt);
            });

            const resultadosMap = new Map<string, any[]>();
            const rows = table.find('tbody tr');

            rows.each((rowIdx, rowEl) => {
                const cells = $(rowEl).find('td');
                const posicao = parseInt($(cells[0]).text().trim());
                if (isNaN(posicao)) return;

                for (let j = 1; j < cells.length; j++) {
                    if (j - 1 >= headers.length) continue;

                    const horario = headers[j - 1];
                    if (!horario) continue;

                    // Filtrar apenas horários pendentes
                    if (!horariosPendentes.includes(horario)) return;

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

                        logger.success(this.serviceName, `Gravado: ${lotericaSlug} - ${dataIso} - ${horario}`);

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
}
