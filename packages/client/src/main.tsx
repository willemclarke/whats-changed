import { QueryClient, QueryClientProvider } from 'react-query';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { App } from './App';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
const root = createRoot(rootElement!);

root.render(
  <ChakraProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ChakraProvider>
);
