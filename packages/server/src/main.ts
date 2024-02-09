import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { getReleases } from './utils';
import { dependencySchema } from '../../common/src/types';
import { Database } from 'bun:sqlite';

(() => {
  // https://bun.sh/docs/api/sqlite
  const db = new Database('whats-changed.sqlite');

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY NOT NULL,
  dependency_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  release_notes TEXT NOT NULL
);
`);

  const app = express();
  const port = process.env.PORT ?? 8080;

  app.use(cors());
  app.use(bodyParser.json());

  app.post('/dependencies', async (req, res) => {
    const unknown = z.array(dependencySchema).safeParse(req.body);

    if (!unknown.success) {
      return res.json(400).json('Unable to parse provided body');
    }

    const releases = await getReleases(unknown.data);
    console.log({ releases });

    res.status(200).json(releases);
  });

  app.listen(port, async () => {
    console.log(`Listening on port ${port}...`);
  });
})();
