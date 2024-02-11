import { z } from 'zod';

// -- raw is to represent raw package.json dep/devDep keys
const rawDepsSchema = z.record(z.string());

export const rawSchema = z
  .object({
    dependencies: rawDepsSchema,
    devDependencies: rawDepsSchema,
  })
  .transform(({ dependencies, devDependencies }) => [
    ...Object.entries(dependencies),
    ...Object.entries(devDependencies),
  ]);

export type RawSchema = z.infer<typeof rawSchema>;
