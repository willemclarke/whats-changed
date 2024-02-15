import React from 'react';
import { RawSchema, rawSchema } from './types';
import { useProcessDeps } from './hooks/useProcessDeps';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  HStack,
  Link,
  Spinner,
  Tag,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { Dependency } from 'common/src/types';
import { useToast } from './hooks/useToast';
import { R } from '../../common/src/index';
import * as indexedDb from './indexedDb';

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

function toDependencies(rawDependencies: RawSchema): Dependency[] {
  return rawDependencies.flatMap(([name, version]) => {
    if (isUnsupportedVersion(version)) {
      return [];
    }

    return { name, version: cleanVersion(version) };
  });
}

export function App() {
  const [input, setInput] = React.useState('');
  const releasesQuery = indexedDb.useGetReleasesQuery();

  const toasts = useToast();
  const processDepsMutation = useProcessDeps();

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (R.isEmpty(input)) {
        return;
      }

      const unknown = rawSchema.safeParse(JSON.parse(input));

      if (!unknown.success) {
        return;
      }

      const dependencies = toDependencies(unknown.data);

      return processDepsMutation.mutateAsync(dependencies, {
        onSuccess: async (releases) => {
          await indexedDb.setReleases(releases);
          releasesQuery.refetch();
        },
        onError: (error) => {
          if (error instanceof Error) {
            toasts.errorToast(error.message);
          } else {
            toasts.errorToast('Unknown error occurred');
          }
        },
      });
    },
    [input]
  );

  return (
    <Flex height="100%" width="100%" justifyContent="center">
      <HStack spacing={2}>
        <VStack spacing={3}>
          <Text fontSize="2xl">whats-changed</Text>
          <form onSubmit={onSubmit}>
            <VStack spacing={2}>
              <Textarea
                value={input}
                height={400}
                width={250}
                onChange={onChange}
                placeholder="paste package json here"
              />
              <Button
                type="submit"
                isLoading={processDepsMutation.isLoading}
                loadingText="Processing dependencies"
              >
                Submit for processing
              </Button>
            </VStack>
          </form>
        </VStack>
        <VStack>
          {releasesQuery.isLoading || !releasesQuery.data ? (
            <Spinner />
          ) : (
            Object.entries(releasesQuery.data).map(([dependency, releases]) => {
              const hasReleases = R.first(releases)?.kind === 'withReleaseNote';

              return (
                <Accordion allowToggle width={500} key={dependency}>
                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box as="span" flex="1" textAlign="left">
                          {dependency}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    {hasReleases && (
                      <AccordionPanel pb={4} height={500} overflowY="scroll">
                        <VStack spacing={2}>
                          {releases.map((release) => {
                            if (release.kind === 'withReleaseNote') {
                              return (
                                <HStack spacing={2} key={release.tagName}>
                                  <Tag>{release.tagName}</Tag>
                                  <Link href={release.url}>{release.url}</Link>
                                </HStack>
                              );
                            }

                            return null;
                          })}
                        </VStack>
                      </AccordionPanel>
                    )}
                  </AccordionItem>
                </Accordion>
              );
            })
          )}
        </VStack>
      </HStack>
    </Flex>
  );
}
