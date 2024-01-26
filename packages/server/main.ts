import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';

const dependencySchema = z.object({ name: z.string(), version: z.string() });

type Dependency = z.infer<typeof dependencySchema>;

const app = express();
const port = process.env.PORT ?? 8080;

app.use(cors());
app.use(bodyParser.json());

app.post('/dependencies', (req, res) => {
  const unknown = z.array(dependencySchema).safeParse(req.body);

  if (!unknown.success) {
    return res.json(400).json('Unable to parse provided body');
  }

  // TODO: send parsed data off to service
  console.log(unknown.data);
  res.status(200).json(unknown.data);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
