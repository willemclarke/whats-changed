import { z } from 'zod';

const repositorySchema = z.object({
  type: z.string(),
  url: z.string(),
});

const npmSchema = z.object({
  repository: repositorySchema,
});

type Repository = z.infer<typeof repositorySchema>;

export async function getRepositoryInfo(name: string): Promise<Repository> {
  const res = await fetch(`https://registry.npmjs.org/${name}`);
  const data = await res.json();

  const parsed = npmSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error('Unable to parse into zod schema');
  }

  return parsed.data.repository;
}
