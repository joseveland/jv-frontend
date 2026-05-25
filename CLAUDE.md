# jv-frontend — Claude Code Context

## Memory Instructions

This file (along with `AGENTS.md`) is the persistent memory for this project. Whenever the user says "remember", "save", or asks you to keep something in mind for the future:

1. Update **this file** (`CLAUDE.md`) with the new information under the most relevant section, or create a new section if needed.
2. Update **`AGENTS.md`** with the same information, keeping its leaner style.
3. Do not use local Claude memory files for this repo — these two files are the source of truth.

## Project

Personal site by Jose V. Started as a portfolio, currently running as a blog + small tools hub. A format change is planned for the future — keep that in mind when suggesting architecture decisions.

Angular SPA (no SSR) deployed to AWS S3 + CloudFront via GitHub Actions, using Terraform for infrastructure.

## Repo Structure

```
jv-frontend/
├── angular/          # Angular app (all npm/ng commands run from here)
│   ├── src/
│   │   ├── app/
│   │   │   ├── projects.config.ts     # Single source of truth for all projects
│   │   │   ├── app.routes.ts
│   │   │   ├── guards/
│   │   │   │   └── project-enabled.guard.ts  # Redirects to / if project.enabled === false
│   │   │   ├── components/
│   │   │   │   ├── home/          # Landing page (hero, projects grid, about, contact)
│   │   │   │   ├── blog-list/     # "Writings" — post list
│   │   │   │   ├── blog-post/     # Individual post
│   │   │   │   ├── qr/            # QR decode (upload/camera) + QR generate
│   │   │   │   └── stress/        # Stress Relief — binaural beat configurator + Web Audio player
│   │   │   ├── models/            # BlogPost, BlogAuthor
│   │   │   └── services/
│   │   │       ├── blog.service.ts
│   │   │       └── stress.service.ts   # POST /generate → ArrayBuffer; apiUrl is a TODO placeholder
│   │   ├── assets/
│   │   │   └── blog-posts/        # Markdown content files loaded at runtime
│   │   ├── styles/
│   │   │   ├── _home-theme.scss   # Cream + terracotta
│   │   │   ├── _blog-theme.scss   # Blue-slate + shared .project-footer styles
│   │   │   ├── _qr-theme.scss     # Teal/green
│   │   │   └── _stress-theme.scss # Cyan (from color-hex.com/color-palette/71125)
│   │   └── index.html / main.ts / styles.scss
│   └── angular.json / package.json / tsconfig*.json
├── scripts/
│   ├── sync_to_s3.py           # Smart S3 deploy + CloudFront invalidation
│   └── requirements.txt
├── terraform/                  # AWS infra (S3, CloudFront, IAM, logging)
│   ├── env/dev/ and env/staging/
│   └── *.tf
└── .github/workflows/
    └── angular-deploy.yml      # Manual-trigger deploy (dev or staging)
```

## Common Commands

All run from `angular/`:

```bash
npm install          # install dependencies
npm start            # dev server (ng serve, live reload, http://localhost:4200)
npm run build        # production build → dist/jv-frontend/browser/
npm test             # unit tests (ng test, ChromeHeadless)
```

Manual deploy (after building):

```bash
cd angular/
pip install -r ../scripts/requirements.txt
python ../scripts/sync_to_s3.py \
  "dist/jv-frontend/browser/" \
  "jvelandia-jv-frontend-angular-app" \
  "<CLOUDFRONT_DISTRIBUTION_ID>"
```

## Architecture Notes

- **Blog content** lives as `.md` files in `src/assets/blog-posts/`. Post metadata (title, slug, tags, author, readTime) is hardcoded in `BlogService`. Loading a post fetches the markdown via HTTP and merges it with metadata.
- **Routes**: `/` → home, `/blog` → "Writings" list, `/blog/:slug` → post detail, `/qr` → QR tool, `/stress` → Stress Relief, `**` → `/`
- **App shell** (`app.component`) has no header or footer — each page component is fully self-contained.
- **S3 bucket** is private (no public access). CloudFront accesses it via OAI. SPA routing handled by CloudFront error pages (403/404 → index.html).
- **Bucket name**: `jvelandia-jv-frontend-angular-app` (prefix ensures global uniqueness)
- **Terraform state** is stored in a separate S3 bucket (`Xxxx-tf-states`).
- **IAM user**: `terraform-deployer` with a policy of the same name.

### Projects Config & Guard

`src/app/projects.config.ts` is the **single source of truth** for all child projects:

```typescript
interface Project {
  title, summary, description, tags[], link, linkLabel, enabled, icon: ProjectIcon
}
```

- `enabled: false` → card hidden on home page AND `projectEnabledGuard` redirects the route to `/`
- `enabled: isDevMode()` → visible in `ng serve`, hidden in production builds (no environment files needed)
- All project routes carry `canActivate: [projectEnabledGuard]`
- To add a project: add entry to `PROJECTS`, add route, add `*ngSwitchCase` SVG block in `home.component.html`

### npm packages added

- `jsqr` — QR code decode from canvas ImageData (browser-only)
- `qrcode` + `@types/qrcode` — QR code generation to data URL
- Both listed in `allowedCommonJsDependencies` in `angular.json`

## Terraform Infrastructure

Terraform provisions all AWS infra before any app deployment. Run this first when setting up a new environment; get `cloud_front_distribution_id` from outputs to use in the deploy workflow.

**Resources created (`terraform/`):**

| File | Resources |
|---|---|
| `s3.tf` | App S3 bucket (private, versioning on, SPA website config) |
| `cloud_front.tf` | CloudFront OAI + distribution + S3 bucket policy (OAI → GetObject) |
| `logs.tf` | Optional logs S3 bucket (only created if `logs_bucket_name` var is set) |

**Naming conventions:**
- App bucket: `jvelandia-{project_name}-{app_bucket_name}` → e.g. `jvelandia-jv-frontend-angular-app`
- Logs bucket: `{project_name}-{logs_bucket_name}` (optional)
- TF state bucket: `jvelandia-tf-states`, key: `jv-frontend/terraform.tfstate`

**Key design decisions in `cloud_front.tf`:**
- OAI (not OAC) connects CloudFront to the private S3 bucket
- SPA routing: 403 and 404 errors redirect to `/index.html` with HTTP 200
- HTTPS enforced (`redirect-to-https`); uses default `*.cloudfront.net` cert by default (custom domain via `cloud_front_aliases` + `acm_certificate_arn` vars, currently commented out)
- CloudFront logs bucket is optional/conditional — enabled by setting `logs_bucket_name` in `.tfvars`
- `PriceClass_100` (US, Canada, Europe only) to reduce cost

**Terraform outputs** (useful after `apply`):
- `cloud_front_distribution_id` — needed as `CLOUDFRONT_DISTRIBUTION_ID` secret in GitHub Environments
- `cloud_front_domain_name` — the `*.cloudfront.net` URL to access the app
- `s3_bucket_website_endpoint` — direct S3 URL (HTTP only, useful for debugging)

**Env config files:**
- `terraform/env/dev/backend.tfvars` — TF state backend (region, bucket, key)
- `terraform/env/dev/default.tfvars` — variables: `aws_account_id`, `aws_region`, `environment`, `app_bucket_name`, optional `logs_bucket_name`

### Terraform GitHub Actions Workflows

Three workflows work together:

| Workflow | Trigger | Purpose |
|---|---|---|
| `terraform-validate-plan.yml` | Auto on push/PR to `main`/`develop` when `terraform/**` changes | TFLint + `terraform validate` + `terraform fmt -check` + plan for dev (plan commented on PR) |
| `terraform-plan.yml` | `workflow_call` only (reusable) | Shared plan logic: init → plan → upload artifact → comment PR |
| `terraform-plan-apply.yml` | Manual `workflow_dispatch` | Runs `terraform-plan.yml` then applies the saved plan artifact |

**Typical infra setup flow:**
1. Make changes to `terraform/` and push/open a PR → `terraform-validate-plan.yml` auto-runs (validates + plans, comments plan on PR)
2. Merge to `main`
3. Run `terraform-plan-apply.yml` manually (choose `dev` or `staging`) to apply

## Deployment Pipeline

GitHub Actions (`angular-deploy.yml`) is `workflow_dispatch` only — no auto-trigger on push.

1. `npm ci` + `npm run build -- --configuration=production`
2. `sync_to_s3.py` — MD5 hash comparison skips unchanged files, sets correct MIME types and `Cache-Control` headers, deletes removed files, creates and waits for CloudFront invalidation
3. Credentials come from GitHub Environment secrets per environment (`dev`, `staging`): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `CLOUDFRONT_DISTRIBUTION_ID`

**Caching strategy in `sync_to_s3.py`:**
- CSS, JS, images, fonts: `max-age=31536000, immutable` (1 year)
- Everything else: `max-age=3600` (1 hour)
- HTML does NOT use `no-cache` — instead, CloudFront invalidation at deploy time handles cache busting

## UI & Design

- **Font**: Saira (Google Fonts, weights 400/500/600/700) — imported in `styles.scss`
- **Theming system**: CSS custom properties (`--color-*`) defined per component scope
  - `styles.scss` `:root` holds structural tokens (font, radius, max-width) and a global baseline palette
  - Each component's theme partial defines `:host { --color-*: ... }` which overrides the root within that component's subtree
  - `angular.json` has `stylePreprocessorOptions.includePaths: ["src/styles"]` so partials import by name: `@use 'home-theme'`
  - **No hardcoded hex colors** outside of `styles.scss` and the theme partials

**Palettes:**

| | Home | Blog | QR | Stress Relief |
|---|---|---|---|---|
| bg | `#faf7f2` cream | `#f4f7fb` blue-slate | `#f2f8f6` teal | `#eef9fc` cyan |
| accent | `#b45309` terracotta | `#2d6be4` blue | `#0f7b5e` teal | `#41c1dd` cyan |

- Stress Relief cyan palette: user-chosen from color-hex.com/color-palette/71125. `--color-on-accent` is dark (`#0d3d4a`) not white — the light accent fails contrast with white text.
- **Blog name**: "Writings" (generic, not "Personal Blog" — meant to be open to any author)
- **Child project convention**: every child project must have a **discrete footer** linking back to the personal home page. Use plain `href` (not `routerLink`) so it works if the project is ever on its own domain.

### Home page project cards

Compact grid (`minmax(160px, 1fr)`, `align-items: start`) with **CSS grid row expand on hover** — no JS, no fixed heights:

- Default: small inline SVG icon (15px) + title in a flex row
- Hover: `.card-body` transitions `grid-template-rows: 0fr → 1fr` + `margin-top: 0 → 0.65rem`, revealing description + tags + link label

Icons are inline SVGs rendered via `NgSwitch` in the template — **not** via `innerHTML`/DomSanitizer (SVG injected via innerHTML is parsed outside the SVG namespace and silently dropped by the browser). Add a new icon by adding a `*ngSwitchCase` block and a new key to `ProjectIcon` in `projects.config.ts`.

### QR component (`/qr`)

Three tabs: Upload Image | Use Camera | Generate

- **Upload / Generate**: use `*ngIf` (removed from DOM when not active)
- **Camera**: uses `[hidden]` — keeps `#video` ViewChild in DOM so `startCamera()` async ops don't crash on a detached element. `.camera-feed[hidden] { display: none }` overrides the `display: block` CSS rule that would otherwise leak through `[hidden]`. `stopCamera()` sets `video.srcObject = null` to prevent black-box residue.
- **File input re-decode fix**: `input.value = ''` after each decode so the `change` event fires on every file selection, not just the first.
- **Decode**: `jsQR` reads `ImageData` from a hidden canvas
- **Generate**: `qrcode` lib → `QRCode.toDataURL()` → `<img>` with Download PNG button

### Stress Relief component (`/stress`)

Binaural beat session configurator. Bands: Delta / Theta / Alpha / Beta / Gamma. Carriers: Pure tone, White/Pink/Brown noise, Rain, Ocean, Forest. Durations: 5/15/30/60 min.

**Audio is played via Web Audio API — no `<audio>` element:**
- `StressService.generate()` POSTs `{ band, carrier, duration_minutes }`, receives `ArrayBuffer` (`responseType: 'arraybuffer'`)
- `AudioContext.decodeAudioData()` → `AudioBuffer` (lives in JS heap, no file URL ever created)
- Custom player: `AudioBufferSourceNode` → `GainNode` → `AudioContext.destination`
- Controls: play/pause (SVG icons), click-to-seek progress bar, volume slider
- No blob URL, no `<audio src>` → no right-click "Save Audio As"
- `AudioContext` created inside the "Generate" click handler (satisfies browser autoplay policy)
- Progress updates via `setInterval` at 250ms

**Why:** User intends to charge for sessions. Removing `<audio>` eliminates the casual download vector. Real protection requires short-lived signed tokens on the backend (future work).

**Backend contract:** set `apiUrl` in `StressService` when ready. POST `/generate` → binary audio response. Recommend WAV (lossless, preserves binaural inter-aural phase) or MP3 320kbps for file size.

## Conventions

- SCSS for styles
- Standalone Angular components (no NgModules)
- No active unit tests yet (test step is a placeholder in CI)
- Keep complexity proportional to a solo personal project — avoid over-engineering
