import { getApiUrl } from '../apiUrl';
import { Dependency, ReleasesMap, releasesSchema } from 'common/src/types';
import { useMutation } from 'react-query';

async function sendDependencies(dependencies: Dependency[]) {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/dependencies`, {
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
  return useMutation<ReleasesMap, Error, Dependency[]>({ mutationFn: sendDependencies });
}
