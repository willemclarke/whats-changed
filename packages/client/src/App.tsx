import React from 'react';
import { RawSchema, rawSchema } from './types';
import { useProcessDeps } from './hooks/useProcessDeps';
import { Button, Flex, Text, Textarea, VStack } from '@chakra-ui/react';
import { Dependency } from 'common/src/types';

function cleanVersion(version: string) {
  const chars = version.split('');

  if (chars[0] === '^' || chars[0] === '~') {
    return version.slice(1);
  }

  return version;
}

const isUnsupportedVersion = (version: string): boolean => {
  switch (version) {
    case 'latest':
    case 'workspace:*': {
      return true;
    }
    default: {
      return false;
    }
  }
};

function toDependencies(raw: RawSchema): Dependency[] {
  const deps = Object.entries(raw.dependencies).flatMap(([name, version]) => {
    if (isUnsupportedVersion(version)) {
      return [];
    }

    return { name, version: cleanVersion(version) };
  });

  const devDeps = Object.entries(raw.devDependencies).flatMap(([name, version]) => {
    if (isUnsupportedVersion(version)) {
      return [];
    }

    return { name, version: cleanVersion(version) };
  });

  return deps.concat(devDeps);
}

export function App() {
  const [input, setInput] = React.useState('');
  const processDepsMutation = useProcessDeps();

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input) {
        return;
      }

      const unknown = rawSchema.safeParse(JSON.parse(input));

      if (!unknown.success) {
        return;
      }

      const dependencies = toDependencies(unknown.data);

      return processDepsMutation.mutateAsync(dependencies);
    },
    [input]
  );

  const buttonText = processDepsMutation.isLoading
    ? 'Submitting for processing..'
    : 'Submit for processing';

  return (
    <Flex height="100%" width="100%" justifyContent="center">
      <VStack spacing={3}>
        <Text fontSize="xl">whats-changed</Text>
        <form onSubmit={onSubmit}>
          <VStack spacing={2}>
            <Textarea
              value={input}
              height={400}
              width={250}
              onChange={onChange}
              placeholder="paste package json here"
            />
            <Button type="submit">{buttonText}</Button>
          </VStack>
        </form>
      </VStack>
    </Flex>
  );
}
