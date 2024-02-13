import { Dependency, Releases, releasesSchema } from 'common/src/types';
import { useMutation } from 'react-query';

async function sendDependencies(dependencies: Dependency[]) {
  const response = await fetch('http://localhost:8080/dependencies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dependencies),
  });

  const data = await response.json();
  const parsed = releasesSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error('Failed to parse');
  }

  return parsed.data;
}

export function useProcessDeps() {
  return useMutation<Releases, Error, Dependency[]>({ mutationFn: sendDependencies });
}
