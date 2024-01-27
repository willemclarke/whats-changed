import { Dependency } from 'common/src/types';
import { useMutation } from 'react-query';

function postDependencies(dependencies: Dependency[]) {
  return fetch('http://localhost:8080/dependencies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dependencies),
  })
    .then((res) => res.json())
    .then((res) => res);
}

export function useProcessDeps() {
  return useMutation<Dependency[], Error, Dependency[]>({ mutationFn: postDependencies });
}
