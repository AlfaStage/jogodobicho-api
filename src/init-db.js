import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
import path from 'path';

const dbPath = path.resolve('dev.db');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

const schema = `
  CREATE TABLE IF NOT EXISTS lotericas (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resultados (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    horario TEXT NOT NULL,
    loterica_slug TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data, horario, loterica_slug)
  );

  CREATE TABLE IF NOT EXISTS premios (
    id TEXT PRIMARY KEY,
    resultado_id TEXT NOT NULL,
    posicao INTEGER NOT NULL,
    milhar TEXT NOT NULL,
    grupo INTEGER NOT NULL,
    bicho TEXT NOT NULL,
    FOREIGN KEY(resultado_id) REFERENCES resultados(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS horoscopo_diario (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    signo TEXT NOT NULL,
    texto TEXT,
    numeros TEXT,
    UNIQUE(data, signo)
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('1', 'pt-rio', 'PT Rio');
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('2', 'look', 'Look Goiás');
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('3', 'federal', 'Federal');
`;

console.log('Inicializando banco de dados...');
db.exec(schema);
console.log('Banco de dados inicializado com sucesso!');
db.close();
