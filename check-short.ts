import db from './src/db.js';
const totals = db.prepare('SELECT COUNT(*) as c FROM premios').get() as any;
console.log('Total de registros em premios:', totals.c);

const results = db.prepare('SELECT resultado_id, COUNT(*) as total FROM premios GROUP BY resultado_id HAVING total > 5 ORDER BY total DESC LIMIT 5').all() as any[];
for (const r of results) {
    const d = db.prepare('SELECT loterica_slug, horario, data FROM resultados WHERE id = ?').get(r.resultado_id) as any;
    console.log(`${d.loterica_slug} | ${d.data} ${d.horario} | ${r.total} premios`);
}
