# whats-changed

**WIP**

Little app where you can paste the contents of a `package.json` file into a input field and get back a list of github release url's (if any) for every version > your dependency version. To try aid in performance as fetching releases from github can be quite slow, we use a SQLite DB which contains releases for the top 5000 npm packages by popularity. If the releases are in the cache requests should be quite fast. If they aren't, requests will be considerably slower... but the DB will be updated to have the releases for those dependencies in the future.

I plan to have this hosted at some point, in the meanwhile, to run locally:

- git clone
- bun install
- create a `.env` file in `/server` and add a `GITHUB_ACCESS_TOKEN` (will need to generate a [personal access token](GITHUB_ACCESS_TOKEN))
- run `bun dev` from root dir:

To run scripts:
cd into `/server/scripts` and either run either `bun run fetchTop5kPackages` / `bun run saveReleases.ts`
