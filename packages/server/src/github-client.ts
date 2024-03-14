import parseLinkHeader from 'parse-link-header';
import type { z } from '../../common/src';

type HTTPMethod = 'GET' | 'POST';

const GITHUB_BASE_URL = 'https://api.github.com';

export class GithubClient {
  public get = this.createMethod('GET');
  public post = this.createMethod('POST');

  // TODO: understand how to handle errors here in a good way
  private createMethod(method: HTTPMethod) {
    return async function <A = unknown>(
      url: string,
      schema: z.ZodSchema<A>,
      options?: RequestInit
    ): Promise<{ data: A; res: Response }> {
      const res = await fetch(GITHUB_BASE_URL + url, {
        method,
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${Bun.env.GITHUB_ACCESS_TOKEN}`,
        },
      });

      const rateLimitHeader = res.headers.get('x-ratelimit-remaining');

      if (rateLimitHeader === '0') {
        throw new Error('Rate limit has been met');
      }

      if (!res.ok) {
        console.log({
          body: res.body,
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
        throw new Error('Error fetching');
      }

      const data = await res.json();
      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        throw new Error('Failed to parse into provided schema');
      }

      return { data: parsed.data, res };
    };
  }

  public async paginate<A>(
    url: string,
    schema: z.ZodSchema<A[]>,
    options?: { stopPredicate?: (data: A) => boolean }
  ) {
    const { stopPredicate } = options ?? {};
    const allData = [] as A[];

    const { data, res } = await this.get(url, schema);

    if (!res.ok) {
      return [];
    }

    allData.push(...data);

    if (stopPredicate) {
      const shouldStop = data.some(stopPredicate);

      if (shouldStop) {
        return allData;
      }
    }

    const paginationLinks = parseLinkHeader(res.headers.get('link'));

    if (!paginationLinks) {
      return allData;
    }

    const { next } = paginationLinks;
    if (next) {
      const nextData = await this.paginate<A>(next.url.split(GITHUB_BASE_URL)[1], schema, {
        stopPredicate,
      });

      allData.push(...nextData);
    }

    return allData;
  }
}

export const githubClient = new GithubClient();
