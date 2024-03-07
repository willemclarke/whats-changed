import type { Dependency } from '../../common/src/types';
import { dbReleasesSchema, getDb, type DbRelease } from './database/schema';

const db = getDb();

function getReleases(dependency: Dependency): DbRelease[] {
  const query = db.query('SELECT * FROM releases WHERE name = $name AND version > $version');
  const execute = query.all({ $name: dependency.name, $version: dependency.version });

  const dbReleases = dbReleasesSchema.safeParse(execute);

  if (!dbReleases.success) {
    return [];
  }

  return dbReleases.data;
}

export function lookup(dependency: Dependency) {
  const query = db.query('SELECT * FROM releases WHERE name = $name AND version > $version');
  const execute = query.all({ $name: dependency.name, $version: dependency.version });

  const parsed = dbReleasesSchema.safeParse(execute);

  if (!parsed.success) {
    return [];
  }

  return parsed.data;
  // const parsed = dbReleasesSchema.safeParse(run);
}
