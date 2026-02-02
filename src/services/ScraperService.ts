import { GlobalScraper } from '../scrapers/GlobalScraper.js';
import { GigaBichoScraper } from '../scrapers/GigaBichoScraper.js';
import { ResultadoFacilScraper } from '../scrapers/ResultadoFacilScraper.js';

export class ScraperService {
    private primary = new GlobalScraper();
    private secondary = new GigaBichoScraper();
    private tertiary = new ResultadoFacilScraper();

    async executeGlobal(): Promise<void> {
        console.log('[ScraperService] Iniciando ciclo de scraping multi-fonte...');

        // Estratégia: Rodar Primary e Secondary em paralelo ou sequencial?
        // Sequencial é mais seguro para não sobrecarregar banco com writes concorrentes (mesmo com lock).
        // E permite logica de "se primary falhar".

        // Mas como queremos redundancia, melhor rodar ambos, pois um pode ter atualizado e o outro não.
        // O banco (INSERT OR IGNORE) lida com duplicação.

        // 1. O Jogo do Bicho (Primary)
        try {
            await this.primary.execute();
        } catch (e) {
            console.error('[ScraperService] Erro no Primary (GlobalScraper):', e);
        }

        // 2. GigaBicho (Secondary)
        try {
            await this.secondary.execute();
        } catch (e) {
            console.error('[ScraperService] Erro no Secondary (GigaBicho):', e);
        }

        // 3. ResultadoFacil (Tertiary - Fallback/Test)
        try {
            await this.tertiary.execute();
        } catch (e) {
            console.error('[ScraperService] Erro no Tertiary (ResultadoFacil):', e);
        }

        console.log('[ScraperService] Ciclo finalizado.');
    }
}
