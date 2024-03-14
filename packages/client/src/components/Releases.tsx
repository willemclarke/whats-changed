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
  Box,
} from '@chakra-ui/react';
import * as indexedDb from '@client/indexedDb';

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
        return (
          <Accordion allowToggle width={700} key={dependency}>
            <AccordionItem>
              <AccordionButton>
                <Box as="span" flex="1" textAlign="left">
                  {dependency}
                </Box>
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
