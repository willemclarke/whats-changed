import { z } from 'common/src';

// -- raw is to represent raw package.json dep/devDep keys
const rawDepsSchema = z.record(z.string());

export const rawDependenciesSchema = z
  .object({
    dependencies: rawDepsSchema,
    devDependencies: rawDepsSchema,
  })
  .transform(({ dependencies, devDependencies }) => [
    ...Object.entries(dependencies),
    ...Object.entries(devDependencies),
  ]);

export type RawDependencies = z.infer<typeof rawDependenciesSchema>;
