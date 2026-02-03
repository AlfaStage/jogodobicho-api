import db from './db.js';

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
    url TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;




import { LOTERIAS } from './config/loterias.js';

console.log('Inicializando banco de dados...');
db.exec(schema);

// Inserir lotéricas do arquivo de configuração
for (const loteria of LOTERIAS) {
  db.prepare('INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES (?, ?, ?)')
    .run(loteria.id, loteria.slug, loteria.nome);
}
console.log(`Lotericas verificadas: ${LOTERIAS.length}`);

console.log('Banco de dados inicializado com sucesso!');
db.close();
