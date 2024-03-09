import { VStack, Textarea, Button } from '@chakra-ui/react';
import { ReleasesMap } from 'common/src/types';

interface Props {
  input: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<ReleasesMap> | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
}

export function PackageInput(props: Props) {
  const { input, onChange, onSubmit, isLoading } = props;

  return (
    <form onSubmit={onSubmit}>
      <VStack spacing={2}>
        <Textarea
          value={input}
          height={400}
          width={250}
          onChange={onChange}
          placeholder="paste package json here"
        />
        <Button type="submit" isLoading={isLoading} loadingText="Processing dependencies">
          Submit to find out
        </Button>
      </VStack>
    </form>
  );
}
