import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { getReleases } from './utils';
import { dependencySchema } from '../../common/src/types';
import { Database } from 'bun:sqlite';

const db = new Database('whats-changed.sqlite');

const make_releases_table = db.run(`
CREATE TABLE releases (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  release_url TEXT NOT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
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

  res.status(200).json(releases);
});

app.listen(port, async () => {
  console.log(`Listening on port ${port}...`);
});
