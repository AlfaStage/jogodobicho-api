import { GlobalScraper } from './scrapers/GlobalScraper.js';

async function main() {
    const scraper = new GlobalScraper();
    console.log('Rodando scraper completo (salvando no SQLite)...');
    await scraper.execute();
    console.log('Finalizado.');
}

main().catch(e => console.error(e));
