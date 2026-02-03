import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';

export class ResultadoFacilScraper extends ScraperBase {
    private webhookService = new WebhookService();

    constructor() {
        super('https://www.resultadofacil.com.br/');
    }

    async execute(targets: LotericaConfig[] = LOTERIAS, targetSlug?: string): Promise<void> {
        console.log('[ResultadoFacilScraper] Iniciando varredura...');

        let loteriasAlvo = LOTERIAS.filter(l => l.urlResultadoFacil);

        if (targetSlug) {
            loteriasAlvo = loteriasAlvo.filter(l => l.slug === targetSlug);
        }

        for (const loteria of loteriasAlvo) {
            try {
                if (loteria.urlResultadoFacil) {
                    await this.scrapeUrl(loteria.urlResultadoFacil, loteria.slug);
                }
            } catch (e: any) {
                console.warn(`[ResultadoFacilScraper] Falha ao acessar ${loteria.nome}: ${e.message}`);
                // Não lançar erro para não interromper o fluxo de outros scrapers
            }
        }
    }

    private async scrapeUrl(url: string, slug: string): Promise<void> {
        // Headers simulando browser real para evitar 403
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
        };

        try {
            const $ = await this.fetchHtml(url, headers);
            if (!$) return;

            // Parser logic here...
            // Por enquanto, apenas log de sucesso (removido log excessivo)
        } catch (e: any) {
            if (e.response && e.response.status === 429) {
                console.warn(`[ResultadoFacil] Limite de requisições (429) excedido para ${slug}. Pulando.`);
                return;
            }
            throw e;
        }

        return;
    }
}
