import { z } from 'zod';

// -- raw is to represent raw package.json dep/devDep keys
const rawDepsSchema = z.record(z.string());

export const rawSchema = z.object({
  dependencies: rawDepsSchema,
  devDependencies: rawDepsSchema,
});

export type RawSchema = z.infer<typeof rawSchema>;

// -- what we send/ recieve back from API
const dependencySchema = z.object({ name: z.string(), version: z.string() });

export type Dependency = z.infer<typeof dependencySchema>;
