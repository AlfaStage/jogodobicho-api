import { GigaBichoScraper } from './scrapers/GigaBichoScraper.js';
import db from './db.js';

async function testLookGoias() {
    console.log('--- Testando Resultados Look Goiás ---');

    const scraper = new GigaBichoScraper();
    const slug = 'look-goias';

    console.log(`[1] Executando scraper para ${slug}...`);
    await scraper.execute(slug);

    console.log('[2] Consultando banco de dados para a data de hoje...');
    const today = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
        SELECT r.horario, p.posicao, p.milhar, p.bicho
        FROM resultados r
        JOIN premios p ON r.id = p.resultado_id
        WHERE r.loterica_slug = ? AND r.data = ?
        ORDER BY r.horario ASC, p.posicao ASC
    `);

    const rows = stmt.all(slug, today) as any[];

    if (rows.length === 0) {
        console.log('Nenhum resultado encontrado para hoje no banco de dados.');
    } else {
        console.log(`Encontrados ${rows.length} registros de prêmios.`);

        const groupedByHorario = rows.reduce((acc, current) => {
            if (!acc[current.horario]) acc[current.horario] = [];
            acc[current.horario].push(current);
            return acc;
        }, {});

        for (const [horario, premios] of Object.entries(groupedByHorario)) {
            console.log(`\nHorário: ${horario}`);
            (premios as any[]).forEach(p => {
                console.log(`${p.posicao}º ${p.milhar} - ${p.bicho}`);
            });
        }
    }

    db.close();
    console.log('\n--- Teste Finalizado ---');
}

testLookGoias();
