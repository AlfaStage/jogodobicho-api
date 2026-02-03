import db from './src/db.js';
import { HoroscopoScraper } from './src/scrapers/HoroscopoScraper.js';

// Criar tabela se não existir
db.exec(`
    CREATE TABLE IF NOT EXISTS horoscopo_diario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signo TEXT NOT NULL,
        texto TEXT,
        numeros TEXT,
        data TEXT NOT NULL,
        UNIQUE(signo, data)
    )
`);

console.log('✅ Tabela horoscopo_diario verificada/criada');

// Executar scraper
const scraper = new HoroscopoScraper();

async function run() {
    console.log('🔄 Executando scraper de horóscopo...\n');
    await scraper.execute();

    console.log('\n📊 Verificando dados salvos:');
    const today = new Date().toISOString().split('T')[0];
    const results = db.prepare('SELECT signo, numeros FROM horoscopo_diario WHERE data = ?').all(today);

    for (const r of results as any[]) {
        console.log(`  ${r.signo}: ${r.numeros}`);
    }

    console.log(`\n✅ ${results.length} signos salvos para hoje.`);
    db.close();
}

run();
