import { Dependency } from 'common/src/types';
import { RawDependencies } from './types';

function cleanVersion(version: string) {
  const chars = version.split('');

  if (chars[0] === '^' || chars[0] === '~') {
    return version.slice(1);
  }

  return version;
}

function isTypesDependency(name: string): boolean {
  return name.startsWith('@types/');
}

function isUnsupportedVersion(version: string): boolean {
  return version === 'latest';
}

export function toDependencies(rawDependencies: RawDependencies): Dependency[] {
  return rawDependencies.flatMap(([name, version]) => {
    if (isTypesDependency(name) || isUnsupportedVersion(version)) {
      return [];
    }

    return { name, version: cleanVersion(version) };
  });
}

export function tryJson(value: string) {
  try {
    return { kind: 'success', value: JSON.parse(value) } as const;
  } catch {
    return { kind: 'failure' } as const;
  }
}
