import React from 'react';
import { rawDependenciesSchema, RawDependencies } from './types';
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
import { useToast } from './hooks/useToast';
import { R } from '../../common/src/index';
import * as indexedDb from './indexedDb';
import * as utils from './utils';

export function App() {
  const [input, setInput] = React.useState('');

  const releasesQuery = indexedDb.useGetReleasesQuery();
  const processDepsMutation = useProcessDeps();

  const { errorToast, infoToast } = useToast();

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (R.isEmpty(input)) {
        return;
      }

      const json = utils.tryJson(input);

      if (json.kind === 'failure') {
        errorToast('Please provide valid JSON input', 5000);
        return;
      }

      const unknown = rawDependenciesSchema.safeParse(json.value);

      if (!unknown.success) {
        infoToast('Ensure validity of package.json contents');
        return;
      }

      const dependencies = utils.toDependencies(unknown.data);

      return processDepsMutation.mutateAsync(dependencies, {
        onSuccess: async (releases) => {
          await indexedDb.setReleases(releases);
          releasesQuery.refetch();
        },
        onError: (error) => {
          if (error instanceof Error) {
            errorToast(error.message);
          } else {
            errorToast('Unknown error occurred');
          }
        },
      });
    },
    [input]
  );

  return (
    <Flex width="100%" justifyContent="center" alignItems="center" direction="column">
      <Text my={2} fontSize="2xl" as="b">
        whats-changed
      </Text>
      <Flex width="100%" my={4} justifyContent="center">
        <HStack spacing={2}>
          <VStack spacing={3}>
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
                  Submit to find out
                </Button>
              </VStack>
            </form>
          </VStack>
          <VStack>
            {releasesQuery.isLoading || !releasesQuery.data ? (
              <Spinner />
            ) : (
              Object.entries(releasesQuery.data).map(([dependency, releases]) => {
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
                      <AccordionPanel pb={4} maxH={300} overflowY="scroll">
                        <VStack spacing={2}>
                          {releases.map((release) => {
                            if (release.kind === 'withReleaseNote') {
                              return (
                                <HStack spacing={2} key={release.tagName}>
                                  <Tag>{release.tagName}</Tag>
                                  <Link href={release.url} target="_blank">
                                    {release.url}
                                  </Link>
                                </HStack>
                              );
                            }

                            return <Text key={release.dependencyName}>Up to date</Text>;
                          })}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                );
              })
            )}
          </VStack>
        </HStack>
      </Flex>
    </Flex>
  );
}
