import { getAllReleaseNotes } from '../src/utils';
import type { WithReleaseNote } from '../../common/src/types';
import { async } from '../../common/src/utils';
import { getDb } from '../src/database/schema';
import type { Package } from './fetchTop5kpackages';
import { R } from '../../common/src';

/*
  This script will read the `./top5kpackages.json` and for each individual package,
  it will fetch the releases from github and write into our SQLite DB
*/

function getOwnerAndRepoFromUrl(url: string) {
  const splitUrl = url.split('/');
  return { owner: splitUrl[3], name: splitUrl[4] };
}

async function run() {
  const file = Bun.file('./top5kpackages.json');

  // not zod decoding here as we encoded on write to the json file
  const packagesJSON = await file.text();
  const allPackages = JSON.parse(packagesJSON) as Package[];

  const db = getDb();

  async.map(
    allPackages.slice(0, 10),
    async (pkg) => {
      const { owner, name } = getOwnerAndRepoFromUrl(pkg.links.repository ?? '');

      try {
        const releases = await getAllReleaseNotes({
          dependencyName: pkg.name,
          name,
          owner,
        });
        const validReleases = releases.filter(
          (r) => r.kind === 'withReleaseNote'
        ) as WithReleaseNote[];

        const insert = db.prepare(
          `INSERT INTO releases (id, name, tag_name, version, release_url)
           VALUES ($id, $name, $tag_name, $version, $release_url)
           ON CONFLICT (name, tag_name) DO NOTHING
          `
        );
        const insertReleases = db.transaction((releases) => {
          for (const release of releases) {
            insert.run(release);
          }
        });

        insertReleases(
          validReleases.map((r) => {
            return {
              $id: crypto.randomUUID(),
              $name: name.toLowerCase(),
              $tag_name: r.tagName,
              $version: r.version,
              $release_url: r.url,
            };
          })
        );
      } catch (error) {
        // experiment
        // console.log({ error });
        // Bun.write('failedAt.json', JSON.stringify({ failedAt: pkg.name }));
      }
    },
    { concurrency: 5 }
  );
}

run();
