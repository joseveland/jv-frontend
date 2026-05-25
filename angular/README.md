# Angular App — Local Setup

## Prerequisites

- **Node.js v20+** — [download here](https://nodejs.org/)
- **Angular CLI v19** (optional but recommended for running `ng` commands directly)

  ```bash
  npm install -g @angular/cli
  ```

  Without the global CLI every `ng` command still works via `npm run <script>` since
  the CLI is included as a local dev dependency.

## Install dependencies

Run once after cloning, and again any time `package.json` changes:

```bash
cd angular/
npm install
```

This creates `node_modules/` from `package-lock.json`.

## Run locally

```bash
npm start
```

Starts the dev server at `http://localhost:4200` with live reload — the browser
refreshes automatically when you edit a file. Uses the `development` configuration.

## Build

```bash
npm run build
```

Produces a production-optimised build at `dist/jv-frontend/browser/`.
This is what gets deployed to S3 (see `scripts/sync_to_s3.py` at the repo root).

For a development build with watch mode (rebuilds on file change, no live server):

```bash
npm run watch
```

## Run tests

```bash
npm test
```

Opens Karma in a Chrome window and reruns tests on file changes.
For a single headless run (e.g. in CI):

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

## Common issues

| Problem | Fix |
|---|---|
| `'ng' is not recognized` | Run `npm install` — `node_modules/` is missing. If already installed, install the global CLI: `npm install -g @angular/cli` |
| Port 4200 already in use | `npm start -- --port 4201` |
| Build fails after pulling changes | Delete `node_modules/` and re-run `npm install` |
