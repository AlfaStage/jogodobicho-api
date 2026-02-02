
import { CronJob } from 'cron';
import { ScraperService } from './ScraperService.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';
import { ContentScraper } from '../scrapers/ContentScraper.js';
import { LOTERIAS } from '../config/loterias.js';

export class CronService {
    private scraperService = new ScraperService();
    private horoscopo = new HoroscopoScraper();
    private content = new ContentScraper();
    private jobs: CronJob[] = [];

    constructor() {
        console.log('[CronService] Inicializando...');
        this.start();
    }

    start() {
        // 1. Agendar Jobs Dinâmicos Baseados no Config
        let configuredJobs = 0;

        LOTERIAS.forEach(loteria => {
            if (loteria.horarios && loteria.horarios.length > 0) {
                loteria.horarios.forEach(horario => {
                    // Simples parser HH:mm
                    const [hStr, mStr] = horario.split(':');
                    const h = parseInt(hStr);
                    const m = parseInt(mStr);

                    // Agendar para 30 minutos APÓS o fechamento (divulgação)
                    // + 1 minuto de margem = 31 minutos após fechamento
                    let targetH = h;
                    let targetM = m + 31;

                    if (targetM >= 60) {
                        targetM -= 60;
                        targetH += 1;
                    }
                    if (targetH >= 24) targetH -= 24;

                    const cronPattern = `${targetM} ${targetH} * * * `;

                    try {
                        const job = new CronJob(cronPattern, () => {
                            this.runScraper(`Agendado ${loteria.nome} (${horario})`);
                        }, null, true, 'America/Sao_Paulo');
                        this.jobs.push(job);
                        configuredJobs++;
                    } catch (err) {
                        console.error(`[CronService] Erro ao agendar ${loteria.nome}: `, err);
                    }
                });
            }
        });

        // 2. Job de Segurança (Fallback) a cada 30 minutos
        // Caso algum horário seja perdido ou atrase muito
        this.jobs.push(
            new CronJob('*/30 * * * *', () => this.runScraper('Fallback 30min'), null, true, 'America/Sao_Paulo')
        );

        // 3. Horóscopo (06:00 DIARIO)
        this.jobs.push(
            new CronJob('0 6 * * *', () => this.runHoroscopo(), null, true, 'America/Sao_Paulo')
        );

        // 4. Conteúdo (Semanal)
        this.jobs.push(
            new CronJob('0 9 * * 1', () => this.runContent(), null, true, 'America/Sao_Paulo')
        );

        console.log(`[CronService] Iniciado com ${configuredJobs} triggers de loterias + jobs de rotina.`);
    }

    private async runScraper(reason: string) {
        console.log(`[CRON] Executando scraper: ${reason} `);
        try {
            await this.scraperService.executeGlobal();
            console.log(`[CRON] Scraper finalizado.`);
        } catch (error: any) {
            console.error(`[CRON] Erro no scraper: ${error.message} `);
        }
    }

    private async runHoroscopo() {
        console.log(`[CRON] Atualizando horóscopo...`);
        try {
            await this.horoscopo.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no horóscopo: ${error.message} `);
        }
    }

    private async runContent() {
        console.log(`[CRON] Atualizando conteúdo estático...`);
        try {
            await this.content.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no conteúdo: ${error.message} `);
        }
    }
}
