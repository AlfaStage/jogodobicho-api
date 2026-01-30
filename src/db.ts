import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.resolve('dev.db');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

export default db;
