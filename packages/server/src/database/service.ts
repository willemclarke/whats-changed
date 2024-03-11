import type { Release, Dependency, WithReleaseNote } from '../../../common/src/types';
import { getDb, type DbRelease, dbReleasesSchema } from './schema';

const db = getDb();

function toWithReleaseNote(release: DbRelease): WithReleaseNote {
  return {
    kind: 'withReleaseNote',
    dependencyName: release.name,
    name: release.name,
    tagName: release.tag_name,
    version: release.version,
    url: release.release_url,
    createdAt: release.created,
    // not currently storing body in DB
    body: null,
  };
}

function discernReleaseType(release: DbRelease, dependency: Dependency): Release {
  if (release.version === dependency.version) {
    return {
      kind: 'withoutReleaseNote',
      dependencyName: release.name,
    };
  }

  return toWithReleaseNote(release);
}

function fromDbRelease(releases: DbRelease[], dependency: Dependency): Release[] {
  if (releases.length === 1) {
    return releases.map((release) => discernReleaseType(release, dependency));
  }

  return releases
    .filter((release) => release.version !== dependency.version)
    .map((release) => discernReleaseType(release, dependency));
}

function getDbReleases(dependency: Dependency): DbRelease[] {
  const query = db.query(
    'SELECT * FROM releases WHERE name = $name AND version >= $version ORDER BY version desc'
  );
  const execute = query.all({ $name: dependency.name, $version: dependency.version });
  const parsedReleases = dbReleasesSchema.safeParse(execute);

  return parsedReleases.success ? parsedReleases.data : [];
}

export function getReleases(dependency: Dependency): Release[] {
  const dbReleases = getDbReleases(dependency);
  return fromDbRelease(dbReleases, dependency);
}

export async function insertReleases(releases: Release[]) {
  const insert = db.prepare(
    `INSERT INTO releases (id, name, tag_name, version, release_url)
     VALUES ($id, $name, $tag_name, $version, $release_url)
     ON CONFLICT (name, tag_name) DO NOTHING
    `
  );

  const validReleases = releases.filter(
    (release) => release.kind === 'withReleaseNote'
  ) as WithReleaseNote[];

  db.transaction((releases) => {
    for (const release of releases) {
      insert.run(release);
    }
  })(
    validReleases.map((release) => {
      return {
        $id: crypto.randomUUID(),
        $name: release.dependencyName.toLowerCase(),
        $tag_name: release.tagName,
        $version: release.version,
        $release_url: release.url,
      };
    })
  );
}
