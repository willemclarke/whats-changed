import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { getReleases } from './utils';
import { dependencySchema } from '../../common/src/types';
import { z } from '../../common/src';
import * as db from './database';
import path from 'path';
import helmet from 'helmet';
import history from 'connect-history-api-fallback';

const app = express();
const port = process.env.PORT ?? 3000;

db.init();

app.use(cors());
app.use(bodyParser.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      },
    },
  })
);

app.post('/dependencies', async (req, res) => {
  const unknown = z.array(dependencySchema).safeParse(req.body);

  if (!unknown.success) {
    return res.json(400).json('Unable to parse provided body');
  }

  const releases = await getReleases(unknown.data);
  res.status(200).json(releases);
});

app.use(history());

if (import.meta.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

app.listen(port, async () => {
  console.log(`Listening on port ${port}...`);
});
