import semver from 'semver';
import { z } from 'zod';
import type { Dependency } from '../../common/src/types';
import { R } from '../../common/src/index';
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

const releaseNoteSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  html_url: z.string(),
});

const releaseNotesSchema = z.array(releaseNoteSchema);

type ReleaseNote = z.infer<typeof releaseNoteSchema>;

const parseVersion = (version: string) => {
  const coerced = semver.coerce(version);

  if (!coerced) {
    throw new Error('Invalid version format');
  }

  return coerced.version;
};

const getNewerReleases = (currentVersion: string, releases: ReleaseNote[]) => {
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

export async function getReleaseNotes(repository: Repository) {
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

  const parsedReleases = releaseNotesSchema.safeParse(data);

  if (!parsedReleases.success) {
    console.error('parsedError:', parsedReleases.error);
    throw new Error('Unable to parse into zod schema');
  }

  const currentVersion = parseVersion(repository.version);
  const newerReleases = getNewerReleases(currentVersion, parsedReleases.data);

  return newerReleases.map((release) => {
    return {
      ...release,
      dependencyName: repository.name.toLowerCase(),
    };
  });
}

export async function getReleases(dependencies: Dependency[]) {
  const deps = dependencies.slice(0, 2);

  const repositories = await Promise.all(deps.map(getRepositoryInfo));
  const releases = await Promise.all(repositories.map(getReleaseNotes));

  const grouped = R.groupBy(releases.flat(), (dep) => dep.dependencyName);
  return grouped;
}
