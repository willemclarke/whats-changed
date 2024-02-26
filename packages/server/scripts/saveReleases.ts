import { getAllReleaseNotes } from '../src/utils';
import type { WithReleaseNote } from '../../common/src/types';
import { async } from '../../common/src/utils';
import { getDb } from '../src/database/schema';
import type { Package } from './fetchTop5kpackages';

function getOwnerAndRepoFromUrl(url: string) {
  const splitUrl = url.split('/');
  return { owner: splitUrl[3], name: splitUrl[4] };
}

async function run() {
  const file = Bun.file('./top5kpackages.json');
  const packagesJSON = await file.text();
  const allPackages = JSON.parse(packagesJSON) as Package[];

  const somePackages = allPackages.slice(10, 15);

  const db = getDb();

  async.map(
    somePackages,
    async (pkg) => {
      if (!pkg.links.repository) {
        throw new Error('No repository link');
      }

      const { owner, name } = getOwnerAndRepoFromUrl(pkg.links.repository);

      const releases = await getAllReleaseNotes({ name, owner, version: pkg.version });
      const validReleases = releases.filter(
        (r) => r.kind === 'withReleaseNote'
      ) as WithReleaseNote[];

      const insert = db.prepare(
        `INSERT INTO releases (id, name, tag_name, release_url) 
         VALUES ($id, $name, $tag_name, $release_url)
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
            $name: name,
            $tag_name: r.tagName,
            $release_url: r.url,
          };
        })
      );
    },
    { concurrency: 20 }
  );
}

run();
