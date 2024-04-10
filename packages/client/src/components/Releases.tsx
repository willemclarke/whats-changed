import {
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  VStack,
  HStack,
  Text,
  Tag,
  Link,
} from '@chakra-ui/react';
import * as indexedDb from '@client/indexedDb';
import { R } from 'common/src';
import { Release } from 'common/src/types';

function dependencyStatus(releases: Release[]) {
  const head = R.first(releases);

  switch (head?.kind) {
    case 'withReleaseNote': {
      return `${releases.length} versions`;
    }
    case 'packageNotFound': {
      return 'Package has no releases';
    }
    case 'withoutReleaseNote': {
      return 'Up to date';
    }
  }
}

interface Props {
  releasesQuery: ReturnType<typeof indexedDb.useGetReleasesQuery>;
}

export function Releases(props: Props) {
  const { releasesQuery } = props;

  if (releasesQuery.isLoading || !releasesQuery.data) {
    return <Spinner />;
  }

  return (
    <>
      {Object.entries(releasesQuery.data).map(([dependency, releases]) => {
        const status = dependencyStatus(releases);

        return (
          <Accordion allowToggle width={700} key={dependency}>
            <AccordionItem>
              <AccordionButton>
                <HStack flex="1" textAlign="left" alignItems="center">
                  <Text>{dependency}</Text>
                  {status && <Text fontSize="xs">({status})</Text>}
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4} maxH={300} overflowY="scroll">
                <VStack spacing={2}>
                  {releases.map((release) => {
                    switch (release.kind) {
                      case 'withReleaseNote': {
                        return (
                          <HStack spacing={2} key={release.tagName} width="100%">
                            <Tag>{release.tagName}</Tag>
                            <Link href={release.url} target="_blank">
                              {release.url}
                            </Link>
                          </HStack>
                        );
                      }
                      case 'packageNotFound': {
                        return <Text key={release.dependencyName}>Not found</Text>;
                      }
                      case 'withoutReleaseNote': {
                        return <Text key={release.dependencyName}>Up to date</Text>;
                      }
                    }
                  })}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        );
      })}
    </>
  );
}
