import semver from 'semver';
import { z } from 'zod';
import type { Dependency } from '../../common/src/types';
import { githubClient } from './github-client';

type Repository = {
  owner: string;
  name: string;
  version: string;
};

const repositorySchema = z.object({
  type: z.string(),
  url: z.string(),
});

const npmSchema = z.object({
  repository: repositorySchema,
});

const releaseNotesSchema = z.array(
  z.object({
    tag_name: z.string(),
    name: z.string().nullish(),
    body: z.string(),
    created_at: z.string(),
  })
);

type ReleaseNotes = z.infer<typeof releaseNotesSchema>;
type ReleaseNote = ReleaseNotes[number];

const parseVersion = (version: string) => {
  const coerced = semver.coerce(version);

  if (!coerced) {
    throw new Error('Invalid version format');
  }

  return coerced.version;
};

const getNewerReleases = (currentVersion: string, releases: ReleaseNotes) => {
  return releases.filter((release) => {
    const releaseVersion = parseVersion(release.tag_name);
    const isNewer = semver.compare(releaseVersion, currentVersion) === 1;
    return isNewer;
  });
};

export async function getRepositoryInfo(dependency: Dependency): Promise<Repository> {
  const res = await fetch(`https://registry.npmjs.org/${dependency.name}`);
  const data = await res.json();

  const parsed = npmSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error('Unable to parse into zod schema');
  }

  const splitUrl = parsed.data.repository.url.split('/');
  return { owner: splitUrl[3], name: splitUrl[4].split('.')[0], version: dependency.version };
}

export async function getReleaseNotes(repository: Repository): Promise<ReleaseNotes> {
  const data = await githubClient.paginate<ReleaseNote>(
    `/repos/${repository.owner}/${repository.name}/releases?per_page=100`,
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

  const parsed = releaseNotesSchema.safeParse(data);

  if (!parsed.success) {
    console.error('parsedError:', parsed.error);
    throw new Error('Unable to parse into zod schema');
  }

  const currentVersion = parseVersion(repository.version);
  const newerReleases = getNewerReleases(currentVersion, parsed.data);

  return newerReleases;
}

export async function getReleases(dependencies: Dependency[]) {
  const dep = dependencies[7];
  console.log({ dep });
  const repositories = await Promise.all([dep].map(getRepositoryInfo));
  const releases = await Promise.all(repositories.map(getReleaseNotes));

  return releases;
}
