import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
import path from 'path';

const dbPath = path.resolve('dev.db');
const db = new Database(dbPath);

const row = db.prepare('SELECT count(*) as count FROM premios').get();
console.log(`Premios no banco: ${row.count}`);

const resultados = db.prepare('SELECT * FROM resultados').all();
console.log(`Resultados no banco: ${resultados.length}`);
if (resultados.length > 0) console.log(resultados[0]);
