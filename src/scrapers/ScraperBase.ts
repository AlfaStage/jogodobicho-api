import axios from 'axios';
import * as cheerio from 'cheerio';
import { LotericaConfig } from '../config/loterias.js';
// Removed Prisma types

export abstract class ScraperBase {
    protected baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    protected async fetchHtml(
        url: string = this.baseUrl,
        customHeaders: Record<string, string> = {},
        silentCodes: number[] = [403, 404, 429]
    ): Promise<cheerio.CheerioAPI | null> {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    ...customHeaders
                },
            });
            return cheerio.load(data);
        } catch (error: any) {
            const status = error.response?.status;
            if (status && silentCodes.includes(status)) {
                // Silencioso: Não logar como erro crítico
                return null;
            }

            if (error.isAxiosError && error.response) {
                console.error(`Erro ${error.response.status} ao buscar HTML de ${url}`);
            } else {
                console.error(`Erro ao buscar HTML de ${url}:`, error.message || error);
            }
            return null;
        }
    }

    abstract execute(targets?: LotericaConfig[], targetSlug?: string): Promise<void>;
}
