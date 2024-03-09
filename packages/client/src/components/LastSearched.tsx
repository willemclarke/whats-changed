import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  PopoverArrow,
  Flex,
  PopoverCloseButton,
  PopoverBody,
} from '@chakra-ui/react';

interface Props {
  lastSearched: string | null;
  onCopyToClipboard: () => void;
}

export function LastSearched(props: Props) {
  const { lastSearched, onCopyToClipboard } = props;

  if (!lastSearched) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button size="xs">Show last searched</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverArrow />
        <Flex p={2} justifyContent="space-between">
          <Button size="xs" onClick={onCopyToClipboard}>
            Copy
          </Button>
          <PopoverCloseButton />
        </Flex>
        <PopoverBody>
          <pre>{lastSearched}</pre>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
