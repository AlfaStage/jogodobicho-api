import { ScraperService } from './ScraperService.js';
import db from '../db.js';
import { LOTERIAS } from '../config/loterias.js';
import { logger } from '../utils/logger.js';

export class StartupSyncService {
    private scraperService = new ScraperService();
    private serviceName = 'StartupSyncService';

    async sync(): Promise<void> {
        logger.info(this.serviceName, 'Verificando integridade dos resultados de hoje...');

        const today = new Date().toISOString().split('T')[0];

        // Vamos verificar quais lotéricas (que possuem scraper) estão sem resultados hoje
        const loteriasComScraper = LOTERIAS.filter(l => l.url || l.urlGigaBicho || l.urlResultadoFacil);

        const missingLoterias = [];

        for (const loteria of loteriasComScraper) {
            const result = db.prepare('SELECT count(*) as count FROM resultados WHERE loterica_slug = ? AND data = ?')
                .get(loteria.slug, today) as { count: number };

            if (result.count === 0) {
                missingLoterias.push(loteria.slug);
            }
        }

        if (missingLoterias.length > 0) {
            logger.warn(this.serviceName, `Detectadas ${missingLoterias.length} lotéricas sem resultados hoje: ${missingLoterias.join(', ')}`);
            logger.info(this.serviceName, 'Iniciando sincronização forçada...');

            // Poderíamos rodar apenas para as faltantes, mas o executeGlobal já lida com INSERT OR IGNORE
            // e garante redundância de fontes.
            await this.scraperService.executeGlobal(false);
        } else {
            logger.info(this.serviceName, 'O banco de dados para hoje já possui registros. Nenhuma ação necessária.');
        }
    }
}
