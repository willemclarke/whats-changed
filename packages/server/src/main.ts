import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { decode, getReleases } from './utils';
import { dependencySchema } from '../../common/src/types';
import { createDb } from '@server/database/schema';

const app = express();
const port = process.env.PORT ?? 8080;

createDb();

app.use(cors());
app.use(bodyParser.json());

app.post('/dependencies', async (req, res) => {
  decode({ schema: z.array(dependencySchema), value: req.body })
    .map(async (dependencies) => {
      const releases = await getReleases(dependencies);
      return res.status(200).json(releases);
    })
    .mapLeft((_) => res.json(400).json('Unable to parse provided body'));
});

app.listen(port, async () => {
  console.log(`Listening on port ${port}...`);
});
