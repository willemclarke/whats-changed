import semver from 'semver';
import { z } from 'zod';
import type { Dependency, Release, Releases } from '../../common/src/types';
import { R } from '../../common/src/index';
import { githubClient } from './github-client';
import * as P from 'purify-ts';

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

type ReleaseNoteRaw = z.infer<typeof releaseNoteSchema>;

export function decode<A>(args: { schema: z.ZodSchema<A>; value: unknown }): P.Either<string, A> {
  const parsed = args.schema.safeParse(args.value);

  if (!parsed.success) {
    return P.Left(parsed.error.message);
  }

  return P.Right(parsed.data);
}

export async function getRepositoryInfo(
  dependency: Dependency
): Promise<P.Either<Error, Repository>> {
  const request = P.Either.encase(() => fetch(`https://registry.npmjs.org/${dependency.name}`));

  return P.EitherAsync<Error, unknown>(async ({ liftEither }) => {
    const response = await liftEither(request);
    return await response.json();
  }).chain((json) =>
    P.EitherAsync<Error, Repository>(({ liftEither, throwE }) => {
      // decode returns Either<string, A>, need to lift into EitherAsync
      const decoded = decode({ schema: npmSchema, value: json })
        .map(({ repository }) => {
          const splitUrl = repository.url.split('/');

          return {
            owner: splitUrl[3],
            name: splitUrl[4].split('.')[0],
            version: dependency.version,
          };
        })
        .mapLeft((err) => throwE(new Error(err)));

      return liftEither(decoded);
    })
  );
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

  const name = repository.name.toLowerCase();

  if (R.isEmpty(releases)) {
    return [
      {
        kind: 'withoutReleaseNote',
        dependencyName: name,
      },
    ];
  }

  return releases.map((release) => {
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

  const currentVersion = parseVersion(repository.version);
  const newerReleases = getNewerReleases(currentVersion, releases);

  const name = repository.name.toLowerCase();

  if (R.isEmpty(newerReleases)) {
    return [
      {
        kind: 'withoutReleaseNote',
        dependencyName: name,
      },
    ];
  }

  return newerReleases.map((release) => {
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
  const rights = P.Either.rights(repositories);
  const releases = await Promise.all(rights.map(getReleaseNotes));
  const flattenedReleases = releases.flat();

  const groupedReleases = R.groupBy(flattenedReleases, (dep) => dep.dependencyName);
  return groupedReleases;
}
