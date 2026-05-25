# jv-frontend — AI Agent Context

## Memory Instructions

This file (along with `CLAUDE.md`) is the persistent memory for this project. Whenever the user says "remember", "save", or asks you to keep something in mind for the future:

1. Update **this file** (`AGENTS.md`) with the new information under the most relevant section, or create a new section if needed.
2. Update **`CLAUDE.md`** with the same information, keeping its more detailed style.
3. Do not use local or session-only memory for this repo — these two files are the source of truth.

## Project

Personal site by Jose V. Started as a portfolio, currently a blog + small tools hub. A format change is planned for the future.

Angular SPA (no SSR) deployed to AWS S3 + CloudFront via GitHub Actions. Infrastructure managed with Terraform.

## Repo Structure

```
jv-frontend/
├── angular/
│   ├── src/app/
│   │   ├── projects.config.ts          # Single source of truth for all projects
│   │   ├── app.routes.ts
│   │   ├── guards/
│   │   │   └── project-enabled.guard.ts
│   │   ├── components/
│   │   │   ├── home/        # Hero, compact project cards, about, contact
│   │   │   ├── blog-list/   # "Writings" post list
│   │   │   ├── blog-post/   # Individual post
│   │   │   ├── qr/          # QR decode + generate (pure frontend)
│   │   │   └── stress/      # Binaural beat configurator + Web Audio player
│   │   ├── models/          # BlogPost, BlogAuthor
│   │   └── services/
│   │       ├── blog.service.ts
│   │       └── stress.service.ts   # POST /generate → ArrayBuffer; apiUrl is a TODO
│   ├── src/assets/blog-posts/      # Markdown post content
│   └── src/styles/
│       ├── _home-theme.scss        # Cream + terracotta
│       ├── _blog-theme.scss        # Blue-slate
│       ├── _qr-theme.scss          # Teal/green
│       └── _stress-theme.scss      # Cyan (user-chosen palette)
├── scripts/sync_to_s3.py
├── terraform/env/dev|staging/
└── .github/workflows/angular-deploy.yml
```

## Key Commands

Run from `angular/`:

```bash
npm install         # install deps
npm start           # dev server → http://localhost:4200
npm run build       # production build → dist/jv-frontend/browser/
npm test            # unit tests
```

## Architecture

- Blog metadata hardcoded in `BlogService`; content is `.md` files fetched from `/assets/blog-posts/`
- Routes: `/` → home, `/blog` → Writings list, `/blog/:slug` → post, `/qr` → QR tool, `/stress` → Stress Relief, `**` → `/`
- All project routes have `canActivate: [projectEnabledGuard]`
- App shell has no header or footer — each page is fully self-contained
- S3 bucket is private; CloudFront serves it via OAI; SPA routing via CloudFront error pages
- Bucket: `jvelandia-jv-frontend-angular-app`

### Projects Config

`projects.config.ts` controls home page cards and route access:
- `enabled: false` → hidden from home + route redirects to `/`
- `enabled: isDevMode()` → dev-only (no environment files needed)
- `icon: ProjectIcon` — rendered as inline SVG via `NgSwitch` in template (not `innerHTML` — browser drops SVG injected that way)

### npm extras

`jsqr` (QR decode), `qrcode` + `@types/qrcode` (QR generate) — both in `allowedCommonJsDependencies`.

## Terraform Infrastructure

Provision AWS infra before deploying. Outputs `cloud_front_distribution_id` (needed as GitHub secret).

- `s3.tf` — private S3 app bucket
- `cloud_front.tf` — OAI + distribution; SPA 403/404 → `index.html`; HTTPS enforced
- `logs.tf` — optional logs bucket
- TF state: `jvelandia-tf-states` / `jv-frontend/terraform.tfstate`
- Workflows: `terraform-validate-plan.yml` (auto on PR), `terraform-plan-apply.yml` (manual apply)

## Deploy

Manual GitHub Actions (`workflow_dispatch`) — `dev` or `staging`.
Build → `sync_to_s3.py` (smart S3 sync, MIME types, Cache-Control, CloudFront invalidation).
AWS credentials stored as GitHub Environment secrets.

## UI & Design

- Font: Saira (Google Fonts) — `styles.scss`
- Per-component palettes in `src/styles/` as SCSS partials; `@use 'theme-name'` in component SCSS; no hardcoded hex colors outside theme files
- Palettes: Home (cream/terracotta), Blog (blue-slate), QR (teal), Stress Relief (cyan — `--color-on-accent` is dark, not white, contrast requirement)
- Blog called "Writings" (generic, open to any author)
- **Child project convention**: every child project must have a discrete **footer** `<a href="/">← Jose Velandia</a>` — plain `href`, not `routerLink`, works across separate domains

### Home project cards

CSS grid row expand on hover (`grid-template-rows: 0fr → 1fr`) — no JS. Default: icon + title. Hover: reveals description + tags + link label. Grid: `minmax(160px, 1fr)`, `align-items: start`.

### QR (`/qr`)

Upload + Camera + Generate tabs. Camera zone uses `[hidden]` (not `*ngIf`) to keep `#video` ViewChild stable for async ops. File input reset (`input.value = ''`) after each decode. `.camera-feed[hidden] { display: none }` prevents CSS `display: block` from leaking through `[hidden]`.

### Stress Relief (`/stress`)

Web Audio API player — no `<audio>` element (prevents right-click save). `StressService` returns `ArrayBuffer`, decoded via `AudioContext.decodeAudioData()`, played via `AudioBufferSourceNode`. Custom play/pause/seek/volume UI. `AudioContext` created on the generate button click (autoplay policy). Backend URL is a placeholder — set `apiUrl` in `StressService` when ready. Recommend WAV output (lossless binaural phase).

## Conventions

- SCSS, standalone Angular components, no NgModules
- No active unit tests
- Keep solutions simple — solo personal project
