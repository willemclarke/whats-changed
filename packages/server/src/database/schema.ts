import { Database } from 'bun:sqlite';
import { z } from '../../../common/src';

const PATH = `${__dirname}/../../whats-changed.sqlite`;

export const dbReleaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tag_name: z.string(),
  version: z.string(),
  release_url: z.string(),
  created: z.string(),
});

export const dbReleasesSchema = z.array(dbReleaseSchema);

export type DbRelease = z.infer<typeof dbReleaseSchema>;

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
    version TEXT NOT NULL,
    release_url TEXT NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (name, tag_name)
);
`);
}
