import { z } from 'zod';

// -- what we send from front-end to back-end
export const dependencySchema = z.object({ name: z.string(), version: z.string() });

export type Dependency = z.infer<typeof dependencySchema>;

// -- what we send back to client from server
type WithReleaseNote = {
  kind: 'withReleaseNote';
  dependencyName: string;
  tagName: string;
  url: string;
  name: string | null;
  body: string | null;
  createdAt: string;
};

type WithoutReleaseNote = {
  kind: 'withoutReleaseNote';
  dependencyName: string;
};

export type Release = WithReleaseNote | WithoutReleaseNote;
