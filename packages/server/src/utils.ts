import semver from 'semver';
import { z } from 'zod';
import type { Dependency, Release, Releases } from '../../common/src/types';
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
  return { owner: splitUrl[3], name: splitUrl[4].split('.')[0], version: dependency.version };
}

const parseVersion = (version: string) => {
  const coerced = semver.coerce(version);

  if (!coerced) {
    throw new Error('Invalid version format');
  }

  return coerced.version;
};

const getNewerReleases = (currentVersion: string, releases: ReleaseNoteRaw[]) => {
  return releases.filter((release) => {
    const releaseVersion = parseVersion(release.tag_name);
    const isNewer = semver.compare(releaseVersion, currentVersion) === 1;
    return isNewer;
  });
};

export async function getAllReleaseNotes(repository: Repository): Promise<Release[]> {
  const releases = await githubClient.paginate<ReleaseNoteRaw>(
    `/repos/${repository.owner}/${repository.name}/releases?per_page=100`,
    releaseNotesSchema
  );
  // filter out beta & draft releases
  const filtered = releases.filter((release) => !release.draft && !release.prerelease);

  const name = repository.name.toLowerCase();

  if (R.isEmpty(filtered)) {
    return [
      {
        kind: 'withoutReleaseNote',
        dependencyName: name,
      },
    ];
  }

  return filtered.map((release) => {
    return {
      kind: 'withReleaseNote',
      dependencyName: name,
      createdAt: release.created_at,
      tagName: release.tag_name,
      url: release.html_url,
      body: release.body,
      name: release.name,
    };
  });
}

export async function getReleaseNotes(repository: Repository): Promise<Release[]> {
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
  const filtered = releases.filter((release) => !release.draft && !release.prerelease);

  const currentVersion = parseVersion(repository.version);
  const newerReleases = getNewerReleases(currentVersion, releases);

  const name = repository.name.toLowerCase();

  if (R.isEmpty(filtered)) {
    return [
      {
        kind: 'withoutReleaseNote',
        dependencyName: name,
      },
    ];
  }

  return filtered.map((release) => {
    return {
      kind: 'withReleaseNote',
      dependencyName: name,
      createdAt: release.created_at,
      tagName: release.tag_name,
      url: release.html_url,
      body: release.body,
      name: release.name,
    };
  });
}

export async function getReleases(dependencies: Dependency[]): Promise<Releases> {
  const repositories = await Promise.all(dependencies.map(getRepositoryInfo));
  const releases = await Promise.all(repositories.map(getReleaseNotes));
  const flattenedReleases = releases.flat();

  const groupedReleases = R.groupBy(flattenedReleases, (dep) => dep.dependencyName);
  return groupedReleases;
}
