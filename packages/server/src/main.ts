import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { getReleases } from './utils';
import { dependencySchema } from '../../common/src/types';
import { createDb } from '@server/database/schema';

const app = express();
const port = process.env.PORT ?? 8080;

createDb();

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
