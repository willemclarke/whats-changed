import React from 'react';
import { rawDependenciesSchema } from './types';
import { useProcessDeps } from './hooks/useProcessDeps';
import { Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useToast } from './hooks/useToast';
import { R } from '../../common/src/index';
import * as indexedDb from './indexedDb';
import * as utils from './utils';
import { useLocalStorage } from './hooks/useLocalStorage';
import { LastSearched } from './components/LastSearched';
import { PackageInput } from './components/PackageInput';
import { Releases } from './components/Releases';

export function App() {
  const [input, setInput] = React.useState('');
  const [lastSearched, setLastSearched] = useLocalStorage<string | null>('last_searched', null);

  const releasesQuery = indexedDb.useGetReleasesQuery();
  const processDepsMutation = useProcessDeps();

  const { errorToast, infoToast } = useToast();

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const onCopyToClipboard = React.useCallback(() => {
    if (lastSearched) {
      navigator.clipboard.writeText(lastSearched);
    }
  }, [lastSearched]);

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
          setLastSearched(input);
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
      <LastSearched lastSearched={lastSearched} onCopyToClipboard={onCopyToClipboard} />
      <Flex width="100%" my={4} justifyContent="center">
        <HStack spacing={2} alignItems="start">
          <VStack spacing={3} h="100%">
            <PackageInput
              input={input}
              onChange={onChange}
              onSubmit={onSubmit}
              isLoading={processDepsMutation.isLoading}
            />
          </VStack>
          <VStack spacing={2} h="100%">
            <Releases releasesQuery={releasesQuery} />
          </VStack>
        </HStack>
      </Flex>
    </Flex>
  );
}
