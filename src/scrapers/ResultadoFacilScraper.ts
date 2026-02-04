import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';
import { LoteriaPendente } from '../services/ScraperService.js';
import { logger } from '../utils/logger.js';

export class ResultadoFacilScraper extends ScraperBase {
    private webhookService = new WebhookService();
    protected serviceName = 'ResultadoFacilScraper';

    constructor() {
        super('https://www.resultadofacil.com.br/');
    }

    async execute(targets: LoteriaPendente[] | LotericaConfig[] = LOTERIAS, targetSlug?: string, shouldNotify: boolean = true): Promise<void> {
        logger.info(this.serviceName, 'Iniciando varredura...');

        // Converter para formato padronizado se necessário
        const loteriasPendentes: LoteriaPendente[] = this.isLoteriaPendenteArray(targets) 
            ? targets 
            : (targets as LotericaConfig[]).map(l => ({ loteria: l, horariosPendentes: l.horarios || [] }));

        // Pegar loterias com URL do ResultadoFacil
        const loteriasAlvo = loteriasPendentes.filter(lp => lp.loteria.urlResultadoFacil);

        for (const lp of loteriasAlvo) {
            try {
                if (lp.loteria.urlResultadoFacil) {
                    await this.scrapeUrl(lp.loteria.urlResultadoFacil, lp.loteria.slug, lp.horariosPendentes);
                }
            } catch (e: any) {
                logger.warn(this.serviceName, `Falha ao acessar ${lp.loteria.nome}: ${e.message}`);
                // Não lançar erro para não interromper o fluxo de outros scrapers
            }
        }
    }

    private isLoteriaPendenteArray(targets: any[]): targets is LoteriaPendente[] {
        return targets.length > 0 && 'loteria' in targets[0] && 'horariosPendentes' in targets[0];
    }

    private async scrapeUrl(url: string, slug: string, horariosPendentes: string[]): Promise<void> {
        // Headers simulando browser real para evitar 403
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
        };

        try {
            // Usar fetchHtmlWithRetry que tem retry infinito, rotação de User-Agents e delay automático
            const $ = await this.fetchHtmlWithRetry(url, headers);
            if (!$) return;

            // Parser logic here (implementado no futuro)
            // Filtrar por horariosPendentes quando implementado
            logger.info(this.serviceName, `Página carregada: ${slug} - Horários pendentes: ${horariosPendentes.join(', ')}`);

        } catch (e: any) {
            // Outros erros ainda são lançados
            throw e;
        }

        return;
    }
}
