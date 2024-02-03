import parseLinkHeader from 'parse-link-header';

type HTTPMethod = 'GET' | 'POST';

const GITHUB_BASE_URL = 'https://api.github.com';

export class GithubClient {
  public get = this.createMethod('GET');
  public post = this.createMethod('POST');

  private createMethod(method: HTTPMethod) {
    return async function <A = unknown>(url: string, options?: RequestInit) {
      const res = await fetch(GITHUB_BASE_URL + url, {
        method,
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        },
      });

      const data = (await res.json()) as A;

      return { data, res };
    };
  }

  public async paginate<A>(url: string, options?: { stopPredicate?: (data: A) => boolean }) {
    const { stopPredicate } = options ?? {};
    const allData = [] as A[];

    const { data, res } = await this.get<A[]>(url);

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
      const nextData = await this.paginate<A>(next.url.split(GITHUB_BASE_URL)[1], {
        stopPredicate,
      });

      allData.push(...nextData);
    }

    return allData;
  }
}

export const cockhubClient = new GithubClient();
