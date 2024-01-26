import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { getRepositoryInfo } from './utils';

const dependencySchema = z.object({ name: z.string(), version: z.string() });

const app = express();
const port = process.env.PORT ?? 8080;

app.use(cors());
app.use(bodyParser.json());

app.post('/dependencies', async (req, res) => {
  const unknown = z.array(dependencySchema).safeParse(req.body);

  if (!unknown.success) {
    return res.json(400).json('Unable to parse provided body');
  }

  const repo = await getRepositoryInfo(unknown.data[0]?.name);
  console.log(repo);

  res.status(200).json(unknown.data);
});

app.listen(port, async () => {
  console.log(`Listening on port ${port}...`);
});
