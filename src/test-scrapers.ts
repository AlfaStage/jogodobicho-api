import { ScraperService } from './services/ScraperService.js';
import db from './db.js';

async function test() {
    console.log('--- Teste de Scrapers ---');
    const service = new ScraperService();

    // Tentar executar.
    // O GlobalScraper pode demorar, então vamos ver os logs.
    await service.executeGlobal();

    // Validar se temos dados no banco (opcional, visual)
    const count = db.prepare('SELECT COUNT(*) as c FROM resultados').get() as any;
    console.log('Total de resultados no banco:', count.c);
}

test();
