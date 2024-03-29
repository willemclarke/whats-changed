import React from 'react';
import { useToast as chakraToast } from '@chakra-ui/react';

export function useToast() {
  const toast = chakraToast();

  const successToast = React.useCallback(
    (title: string) => {
      toast({
        title,
        status: 'success',
        isClosable: true,
        duration: 3000,
        position: 'bottom',
      });
    },
    [toast]
  );

  const errorToast = React.useCallback(
    (title: string, duration?: number) => {
      toast({
        title,
        status: 'error',
        isClosable: true,
        duration: duration ?? 3000,
        position: 'bottom',
      });
    },
    [toast]
  );

  const infoToast = React.useCallback(
    (title: string, duration?: number) => {
      toast({
        title,
        status: 'info',
        isClosable: true,
        duration: duration ?? 3000,
        position: 'bottom',
      });
    },
    [toast]
  );

  return {
    toast,
    successToast,
    errorToast,
    infoToast,
  };
}
