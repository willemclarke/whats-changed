import semver from 'semver';
import type { Dependency, Release, ReleasesMap } from '../../common/src/types';
import { R, z } from '../../common/src/index';
import { githubClient } from './github-client';
import * as db from './database';

type Repository = {
  owner: string;
  name: string;
  version: string;
  dependencyName: string;
};

const repositorySchema = z.object({
  type: z.string(),
  url: z.string(),
});

const npmSchema = z.object({
  repository: repositorySchema,
});

const releaseNoteSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  html_url: z.string(),
  prerelease: z.boolean(),
  draft: z.boolean(),
});

const releaseNotesSchema = z.array(releaseNoteSchema);

type ReleaseNoteRaw = z.infer<typeof releaseNoteSchema>;

export async function getRepositoryInfo(dependency: Dependency): Promise<Repository> {
  const res = await fetch(`https://registry.npmjs.org/${dependency.name}`);
  const data = await res.json();

  const parsed = npmSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error('Unable to parse into zod schema');
  }

  const splitUrl = parsed.data.repository.url.split('/');

  const dependencyName = dependency.name;
  const githubRepoName = splitUrl[4].split('.')[0];

  return { dependencyName, owner: splitUrl[3], name: githubRepoName, version: dependency.version };
}

function parseVersion(version: string) {
  const coerced = semver.coerce(version);

  if (!coerced) {
    throw new Error('Invalid version format');
  }

  return coerced.version;
}

function getNewerReleases(currentVersion: string, releases: ReleaseNoteRaw[]) {
  return releases.filter((release) => {
    const releaseVersion = parseVersion(release.tag_name);
    const isNewer = semver.compare(releaseVersion, currentVersion) === 1;
    return isNewer;
  });
}

// taken from chatgpt, gives a version number from a tagName:
// e.g. v1.4.3 -> 1.4.3, plugin-legacy@5.3.1 -> 5.3.1
export function versionFromTagName(tagName: string) {
  const match = tagName.match(/(?:v\.|v)?([\d.]+)/);
  return match ? match[1] : tagName;
}

function toReleaseNote(release: ReleaseNoteRaw, name: string): Release {
  return {
    kind: 'withReleaseNote',
    dependencyName: name,
    createdAt: release.created_at,
    tagName: release.tag_name,
    version: versionFromTagName(release.tag_name),
    url: release.html_url,
    body: release.body,
    name: release.name,
  };
}

// for usage in `saveReleases.tsx`
export async function getAllReleaseNotes(
  repository: Omit<Repository, 'version'>
): Promise<Release[]> {
  const releases = await githubClient.paginate<ReleaseNoteRaw>(
    `/repos/${repository.owner}/${repository.name}/releases?per_page=100`,
    releaseNotesSchema
  );

  const filteredReleases = releases.filter((release) => !release.draft && !release.prerelease);
  const name = repository.dependencyName.toLowerCase();

  if (R.isEmpty(filteredReleases)) {
    return [
      {
        kind: 'withoutReleaseNote',
        dependencyName: name,
      },
    ];
  }

  return filteredReleases.map((release) => toReleaseNote(release, name));
}

export async function getReleaseNotes(
  repository: Repository
): Promise<{ releases: Release[]; releasesForCache: Release[] }> {
  const releases = await githubClient.paginate<ReleaseNoteRaw>(
    `/repos/${repository.owner}/${repository.name}/releases?per_page=100`,
    releaseNotesSchema,
    {
      stopPredicate: (release) => {
        const isOlder =
          semver.compare(parseVersion(release.tag_name), parseVersion(repository.version)) === -1;

        if (isOlder) {
          console.log(
            'stopped paginating, older version detected in resp:',
            `'${release.tag_name}'`,
            'is older than provided version',
            `'${repository.version}'`
          );
        }

        return isOlder;
      },
    }
  );

  const filteredReleases = releases.filter((release) => !release.draft && !release.prerelease);
  const currentVersion = parseVersion(repository.version);
  const name = repository.dependencyName.toLowerCase();

  const newerReleases = getNewerReleases(currentVersion, filteredReleases);
  // keeping all found releases so we can write these into our db for caching
  const releasesForCache = filteredReleases.map((release) => toReleaseNote(release, name));

  if (R.isEmpty(newerReleases)) {
    return {
      releases: [
        {
          kind: 'withoutReleaseNote',
          dependencyName: name,
        },
      ],
      releasesForCache,
    };
  }

  return {
    releases: newerReleases.map((release) => toReleaseNote(release, name)),
    releasesForCache,
  };
}

function flattenReleases(releases: { releases: Release[]; releasesForCache: Release[] }[]): {
  releases: Release[];
  releasesForCache: Release[];
} {
  return releases.reduce(
    (acc, release) => {
      acc.releases.push(...release.releases);
      acc.releasesForCache.push(...release.releasesForCache);

      return acc;
    },
    { releases: [], releasesForCache: [] }
  );
}

export async function getReleasesFromGithub(dependencies: Dependency[]) {
  const repositories = await Promise.all(dependencies.map(getRepositoryInfo));
  const releases = await Promise.all(repositories.map(getReleaseNotes));
  const flattenedReleases = flattenReleases(releases);

  return flattenedReleases;
}

export async function getReleases(dependencies: Dependency[]): Promise<ReleasesMap> {
  const releasesFromCache = dependencies.flatMap(db.getReleases);
  const cacheKeys = new Set(releasesFromCache.map((release) => release.dependencyName));
  const dependenciesNotInCache = dependencies.filter((dep) => !cacheKeys.has(dep.name));

  // if all the dependencies were in the cache, short
  // circuit and send back to client
  if (R.isEmpty(dependenciesNotInCache)) {
    return R.groupBy(releasesFromCache, (dep) => dep.dependencyName);
  }
  const { releases, releasesForCache } = await getReleasesFromGithub(dependenciesNotInCache);
  // insert the just fetched releases into the cache
  await db.insertReleases(releasesForCache);

  const combinedReleases = releasesFromCache.concat(releases);
  const groupedReleases = R.groupBy(combinedReleases, (release) => release.dependencyName);

  return groupedReleases;
}
