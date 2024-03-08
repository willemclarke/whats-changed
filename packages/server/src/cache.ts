import type { Dependency, Release } from '../../common/src/types';
import { dbReleasesSchema, getDb, type DbRelease } from './database/schema';

const db = getDb();

function toRelease(release: DbRelease): Release {
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

function getDbReleases(dependency: Dependency): DbRelease[] {
  const query = db.query('SELECT * FROM releases WHERE name = $name AND version > $version');
  const execute = query.all({ $name: dependency.name, $version: dependency.version });
  const parsedReleases = dbReleasesSchema.safeParse(execute);

  return parsedReleases.success ? parsedReleases.data : [];
}

function mapReleases(releases: DbRelease[]): Release[] {
  return releases.map(toRelease);
}

export function getReleases(dependency: Dependency): Release[] {
  const dbReleases = getDbReleases(dependency);
  return mapReleases(dbReleases);
}
