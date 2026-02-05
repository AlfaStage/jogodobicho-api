import db from './src/db.js';
const query = `
    SELECT resultado_id, COUNT(*) as total_premios 
    FROM premios 
    GROUP BY resultado_id 
    ORDER BY total_premios DESC 
    LIMIT 10;
`;
const results = db.prepare(query).all();
console.log('Top resultados por num de premios:', JSON.stringify(results, null, 2));

for (const res of results as any[]) {
    if (res.total_premios > 7) {
        const details = db.prepare('SELECT loterica_slug, horario, data FROM resultados WHERE id = ?').get(res.resultado_id) as any;
        console.log(`Resultado ${res.resultado_id}: ${details.loterica_slug} - ${details.data} ${details.horario} (${res.total_premios} premios)`);
    }
}
