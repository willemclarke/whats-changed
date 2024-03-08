import React from 'react';

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;
type RemoveValue = () => void;

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>, RemoveValue] {
  const storedValue = localStorage.getItem(key);
  const initial = storedValue ? JSON.parse(storedValue) : initialValue;

  const [value, setValue] = React.useState<T>(initial);

  const updateValue: SetValue<T> = React.useCallback(
    (newValue) => {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    },
    [value, localStorage]
  );

  const remove = React.useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [localStorage]);

  return [value, updateValue, remove];
}
