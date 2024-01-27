import { z } from 'zod';

// -- what we send from front-end to back-end
export const dependencySchema = z.object({ name: z.string(), version: z.string() });

export type Dependency = z.infer<typeof dependencySchema>;
