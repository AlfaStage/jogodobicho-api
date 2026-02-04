import { GlobalScraper } from '../scrapers/GlobalScraper.js';
import { GigaBichoScraper } from '../scrapers/GigaBichoScraper.js';
import { ResultadoFacilScraper } from '../scrapers/ResultadoFacilScraper.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';
import { logger } from '../utils/logger.js';
import { LotericaConfig } from '../config/loterias.js';

// Interface para rastrear horários específicos pendentes
export interface LoteriaPendente {
    loteria: LotericaConfig;
    horariosPendentes: string[];
}

export class ScraperService {
    private primary = new GlobalScraper();
    private secondary = new GigaBichoScraper();
    private tertiary = new ResultadoFacilScraper();
    private horoscopo = new HoroscopoScraper();
    private serviceName = 'ScraperService';

    async executeTargeted(targets: LoteriaPendente[], shouldNotify: boolean = true): Promise<void> {
        if (targets.length === 0) return;

        const totalHorarios = targets.reduce((sum, t) => sum + t.horariosPendentes.length, 0);
        logger.info(this.serviceName, `Executando varredura direcionada para ${targets.length} lotéricas (${totalHorarios} horários pendentes)...`);

        // Executar Primary apenas para os targets e horários específicos
        try {
            await this.primary.execute(targets, undefined, shouldNotify);
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Primary (Targeted):', e);
        }

        // Executar Secondary apenas para os targets e horários específicos
        try {
            await this.secondary.execute(targets, undefined, shouldNotify);
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Secondary (Targeted):', e);
        }
    }

    async executeGlobal(shouldNotify: boolean = true): Promise<void> {
        logger.info(this.serviceName, 'Iniciando ciclo de scraping GLOBAL multi-fonte...');

        // 1. O Jogo do Bicho (Primary)
        try {
            await this.primary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Primary (GlobalScraper):', e);
        }

        // 2. GigaBicho (Secondary)
        try {
            await this.secondary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Secondary (GigaBicho):', e);
        }

        // 3. ResultadoFacil (Tertiary - Fallback/Test)
        try {
            await this.tertiary.execute(undefined, undefined, shouldNotify);
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Tertiary (ResultadoFacil):', e);
        }

        // 4. Horóscopo (números da sorte por signo)
        try {
            await this.horoscopo.execute();
        } catch (e) {
            logger.error(this.serviceName, 'Erro no Horóscopo Scraper:', e);
        }

        logger.success(this.serviceName, 'Ciclo finalizado');
    }
}
