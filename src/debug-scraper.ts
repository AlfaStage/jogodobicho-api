import { OjogodobichoScraper } from './scrapers/OjogodobichoScraper.js';

async function main() {
    const scraper = new OjogodobichoScraper();
    console.log('Rodando scraper completo (salvando no SQLite)...');
    await scraper.execute();
    console.log('Finalizado.');
}

main().catch(e => console.error(e));
