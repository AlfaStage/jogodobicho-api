import { CronJob } from 'cron';
import { OjogodobichoScraper } from '../scrapers/OjogodobichoScraper.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';
import { ContentScraper } from '../scrapers/ContentScraper.js';

export class CronService {
    private scraper = new OjogodobichoScraper();
    private horoscopo = new HoroscopoScraper();
    private content = new ContentScraper();

    constructor() {
        console.log('CronService inicializado.');
    }

    start() {
        // 1. Cron geral: De hora em hora no minuto 1 (Backup)
        new CronJob('1 * * * *', () => this.runScraper('Cron Horário'), null, true);

        // 2. Horários específicos PT Rio (Release + 1 min aprox)
        // PTM (11:20), PT (14:20), PTV (16:20), PTN (18:20), COR (21:20)
        const ptRioMinutes = '21,22,23,24,25'; // Range para garantir se atrasar um pouco
        new CronJob(`21 11,14,16,18,21 * * *`, () => this.runScraper('PT Rio release check'), null, true);

        // 3. Federal (Sábado e Quarta às 19:00 -> Check 19:01)
        new CronJob('1 19 * * 3,6', () => this.runScraper('Federal release check'), null, true);

        // 4. Look e outros (Costumam sair perto da hora cheia)
        // Vamos rodar a cada 15 minutos para garantir detecção rápida de qualquer lotérica
        new CronJob('*/15 * * * *', () => this.runScraper('Fixed interval check (15m)'), null, true);

        // 5. Horóscopo (Uma vez por dia às 06:00)
        new CronJob('0 6 * * *', () => this.runHoroscopo(), null, true);

        // 6. Regras/História (Uma vez por semana)
        new CronJob('0 2 * * 0', () => this.runContent(), null, true);

        console.log('Jobs agendados com sucesso.');
    }

    private async runScraper(reason: string) {
        console.log(`[CRON] Executando scraper de resultados (${reason})...`);
        try {
            await this.scraper.execute();
            console.log(`[CRON] Scraper de resultados finalizado.`);
        } catch (error: any) {
            console.error(`[CRON] Erro no scraper de resultados: ${error.message}`);
        }
    }

    private async runHoroscopo() {
        console.log(`[CRON] Atualizando horóscopo diário...`);
        try {
            await this.horoscopo.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no horóscopo: ${error.message}`);
        }
    }

    private async runContent() {
        console.log(`[CRON] Atualizando conteúdo estático...`);
        try {
            await this.content.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no conteúdo: ${error.message}`);
        }
    }
}
