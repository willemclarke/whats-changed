import { z } from 'zod';

// poor mans FP result type
export type Result<A, B> = { kind: 'success'; data: A } | { kind: 'failure'; meta: B };

// what we initially send from front-end to back-end
export const dependencySchema = z.object({ name: z.string(), version: z.string() });

export type Dependency = z.infer<typeof dependencySchema>;

// Releases type is generated from the backend and sent
// to the client
const withReleaseNote = z.object({
  kind: z.literal('withReleaseNote'),
  dependencyName: z.string(),
  tagName: z.string(),
  version: z.string(),
  url: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  createdAt: z.string(),
});

const withoutReleaseNote = z.object({
  kind: z.literal('withoutReleaseNote'),
  dependencyName: z.string(),
});

const releaseNotFound = z.object({
  kind: z.literal('packageNotFound'),
  dependencyName: z.string(),
});

const releaseUnion = z.discriminatedUnion('kind', [
  withReleaseNote,
  withoutReleaseNote,
  releaseNotFound,
]);

export const releasesSchema = z.record(z.string(), z.array(releaseUnion));

export type WithReleaseNote = z.infer<typeof withReleaseNote>;
export type WithoutReleaseNote = z.infer<typeof withoutReleaseNote>;
export type NoFoundReleases = z.infer<typeof releaseNotFound>;

export type Release = WithReleaseNote | WithoutReleaseNote | NoFoundReleases;

export type ReleasesMap = Record<string, Release[]>;
