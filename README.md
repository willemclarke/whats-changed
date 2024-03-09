# whats-changed

**WIP**

Little app where you can paste the contents of a `package.json` file into a input field and get back list of github release urls (if any) for each dependency.

I plan to have this hosted at some point, in the meanwhile, to run locally

- git clone
- bun install
- create a `.env` file in `/server` and add a `GITHUB_ACCESS_TOKEN` (will need to generate a [personal access token](GITHUB_ACCESS_TOKEN))
- Terminal pane/window one:
  - `cd packages/server` -> `bun run server:dev`
- Terminal pane/window two:
  - `cd packagers.client` -> `bun run dev`
