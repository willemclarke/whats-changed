import { Database } from 'bun:sqlite';

const PATH = `${__dirname}/../whats-changed.sqlite`;

export function getDb() {
  return new Database(PATH);
}

export function createDb() {
  const db = getDb();

  db.exec('PRAGMA journal_mode = WAL;');

  db.run(`
    CREATE TABLE IF NOT EXISTS releases (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    release_url TEXT NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (name, tag_name)
);
`);
}
