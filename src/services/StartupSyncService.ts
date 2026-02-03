import { ScraperService } from './ScraperService.js';
import db from '../db.js';
import { LOTERIAS } from '../config/loterias.js';

export class StartupSyncService {
    private scraperService = new ScraperService();

    async sync(): Promise<void> {
        console.log('[StartupSyncService] Verificando integridade dos resultados de hoje...');

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
            console.log(`[StartupSyncService] Detectadas ${missingLoterias.length} lotéricas sem resultados hoje: ${missingLoterias.join(', ')}`);
            console.log('[StartupSyncService] Iniciando sincronização forçada...');

            // Poderíamos rodar apenas para as faltantes, mas o executeGlobal já lida com INSERT OR IGNORE
            // e garante redundância de fontes.
            await this.scraperService.executeGlobal(false);
        } else {
            console.log('[StartupSyncService] O banco de dados para hoje já possui registros. Nenhuma ação necessária.');
        }
    }
}
