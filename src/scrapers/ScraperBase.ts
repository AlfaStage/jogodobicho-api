import axios from 'axios';
import * as cheerio from 'cheerio';
// Removed Prisma types

export abstract class ScraperBase {
    protected baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    protected async fetchHtml(url: string = this.baseUrl): Promise<cheerio.CheerioAPI | null> {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            return cheerio.load(data);
        } catch (error) {
            console.error(`Erro ao buscar HTML de ${url}:`, error);
            return null;
        }
    }

    abstract execute(): Promise<void>;
}
