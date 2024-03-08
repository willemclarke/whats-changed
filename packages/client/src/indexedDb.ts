import { R } from 'common/src';
import { Release, ReleasesMap } from 'common/src/types';
import { openDB, DBSchema } from 'idb';
import { useQuery } from 'react-query';

const DATABASE_NAME = 'whats-changed';
const OBJECT_NAME = 'releases';

interface Db extends DBSchema {
  releases: {
    key: string;
    value: Release[];
  };
}

const openDbConnection = () => {
  return openDB<Db>(DATABASE_NAME, 1, {
    upgrade: (db) => {
      db.createObjectStore(OBJECT_NAME, { autoIncrement: true });
    },
  });
};

export const getReleases = async () => {
  const db = await openDbConnection();
  const ungroupedReleases = (await db.getAll(OBJECT_NAME)).flat();

  return R.groupBy(ungroupedReleases, (release) => release.dependencyName);
};

export const useGetReleasesQuery = () => {
  return useQuery({ queryKey: 'releases', queryFn: getReleases });
};

export const setReleases = async (releases: ReleasesMap): Promise<void> => {
  const db = await openDbConnection();
  const transaction = db.transaction(OBJECT_NAME, 'readwrite');

  await transaction.store.clear();

  const promises = Object.entries(releases).map(([dependency, releases]) =>
    transaction.store.put(releases, dependency)
  );
  await Promise.all([...promises, transaction.done]);
};
