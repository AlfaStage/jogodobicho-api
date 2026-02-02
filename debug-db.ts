import db from './src/db.js';

console.log('--- Debugging Database ---');

try {
    const lotericas = db.prepare('SELECT * FROM lotericas').all();
    console.log('Lotéricas no banco:', lotericas.map((l: any) => l.slug).join(', '));

    const look = db.prepare('SELECT * FROM lotericas WHERE slug = ?').get('look-goias');
    console.log('Look Goiás existe:', !!look);

    const resultadosCount = db.prepare('SELECT count(*) as c FROM resultados').get() as any;
    console.log('Total de resultados:', resultadosCount.c);

    const lookResultados = db.prepare('SELECT count(*) as c FROM resultados WHERE loterica_slug = ?').get('look-goias') as any;
    console.log('Resultados Look Goiás:', lookResultados.c);

    if (lookResultados.c > 0) {
        const last = db.prepare('SELECT * FROM resultados WHERE loterica_slug = ? ORDER BY data DESC, horario DESC LIMIT 1').get('look-goias') as any;
        console.log('Último resultado Look:', last.data, last.horario);
    }
} catch (e) {
    console.error('Erro:', e);
} finally {
    db.close();
}
