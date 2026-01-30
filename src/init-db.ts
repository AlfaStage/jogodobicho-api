import db from './db';

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
  
  -- Seed Lotericas
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('1', 'pt-rio', 'PT Rio');
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('2', 'look', 'Look Goiás');
  INSERT OR IGNORE INTO lotericas (id, slug, nome) VALUES ('3', 'federal', 'Federal');
`;

console.log('Inicializando banco de dados...');
db.exec(schema);
console.log('Banco de dados inicializado com sucesso!');
db.close();
