export const map = async <A, B>(
  arr: A[],
  f: (value: A, index: number) => Promise<B>,
  options?: { concurrency: number }
): Promise<B[]> => {
  const concurrency = options?.concurrency ?? arr.length;

  if (arr.length <= concurrency) {
    return Promise.all(arr.map((item, index) => f(item, index)));
  }

  const inProgress = new Set<Promise<B>>();
  const results: Promise<B>[] = [];

  for (const [index, item] of arr.entries()) {
    if (inProgress.size >= concurrency) {
      await Promise.race(inProgress);
    }

    const itemPromise = f(item, index);
    inProgress.add(itemPromise);
    results.push(itemPromise);

    itemPromise.finally(() => inProgress.delete(itemPromise));
  }

  return Promise.all(results);
};

export const async = { map };
