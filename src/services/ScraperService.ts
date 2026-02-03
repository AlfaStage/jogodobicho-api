import { GlobalScraper } from '../scrapers/GlobalScraper.js';
import { GigaBichoScraper } from '../scrapers/GigaBichoScraper.js';
import { ResultadoFacilScraper } from '../scrapers/ResultadoFacilScraper.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';

import { LotericaConfig } from '../config/loterias.js';

export class ScraperService {
    private primary = new GlobalScraper();
    private secondary = new GigaBichoScraper();
    private tertiary = new ResultadoFacilScraper();
    private horoscopo = new HoroscopoScraper();

    async executeTargeted(targets: LotericaConfig[], shouldNotify: boolean = true): Promise<void> {
        if (targets.length === 0) return;

        console.log(`[ScraperService] Executando varredura direcionada para ${targets.length} lotéricas...`);

        // Executar Primary apenas para os targets
        try {
            await this.primary.execute(targets, undefined, shouldNotify);
        } catch (e) {
            console.error('[ScraperService] Erro no Primary (Targeted):', e);
        }

        // Executar Secondary apenas para os targets
        try {
            await this.secondary.execute(targets, undefined, shouldNotify);
        } catch (e) {
            console.error('[ScraperService] Erro no Secondary (Targeted):', e);
        }
    }

    async executeGlobal(shouldNotify: boolean = true): Promise<void> {
        console.log('[ScraperService] Iniciando ciclo de scraping GLOBAL multi-fonte...');

        // 1. O Jogo do Bicho (Primary)
        try {
            await this.primary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            console.error('[ScraperService] Erro no Primary (GlobalScraper):', e);
        }

        // 2. GigaBicho (Secondary)
        try {
            await this.secondary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            console.error('[ScraperService] Erro no Secondary (GigaBicho):', e);
        }

        // 3. ResultadoFacil (Tertiary - Fallback/Test)
        try {
            await this.tertiary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            console.error('[ScraperService] Erro no Tertiary (ResultadoFacil):', e);
        }

        // 4. Horóscopo (números da sorte por signo)
        try {
            await this.horoscopo.execute();
        } catch (e) {
            console.error('[ScraperService] Erro no Horóscopo Scraper:', e);
        }

        console.log('[ScraperService] Ciclo finalizado.');
    }
}
