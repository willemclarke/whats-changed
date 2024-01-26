import { z } from 'zod';

export const dependencySchema = z.object({ name: z.string(), version: z.string() });

export type Dependency = z.infer<typeof dependencySchema>;

type Repository = {
  owner: string;
  name: string;
};

const repositorySchema = z.object({
  type: z.string(),
  url: z.string(),
});

const npmSchema = z.object({
  repository: repositorySchema,
});

export async function getRepositoryInfo(dependency: Dependency): Promise<Repository> {
  const res = await fetch(`https://registry.npmjs.org/${dependency.name}`);
  const data = await res.json();

  const parsed = npmSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error('Unable to parse into zod schema');
  }

  const splitUrl = parsed.data.repository.url.split('/');
  return { owner: splitUrl[3], name: splitUrl[4].split('.')[0] };
}

// TODO: need to parse
export async function getReleaseNotes(repository: Repository) {
  const res = await fetch(
    `https://api.github.com/repos/${repository.owner}/${repository.name}/releases`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      },
    }
  );
  const data = await res.json();
  return data;
}

export async function getReleases(dependencies: Dependency[]) {
  const repositories = await Promise.all(dependencies.slice(2).map(getRepositoryInfo));
  const releases = await Promise.all(repositories.map(getReleaseNotes));
  return releases;
}
