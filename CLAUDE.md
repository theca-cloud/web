@../docs/CLAUDE.md

# This repo: `web`

The web app: a SvelteKit + TypeScript SPA (`adapter-static`), no database, served by the core server (`WEB_DIR`). V1 scope: a full web app (`../docs/features.md`): browse, upload, download, versions, trash, search, previews, plus every account and admin page. Design: `../docs/decisions.md` (Architecture; Repository, CI and releases: this repo publishes a `web` image holding only the build, which `ce` assembles with `core`).

- **Uploads and downloads** go through the `@theca/client` WASM package (Gitea npm registry), the same engine as the CLI: never re-implemented in TypeScript. **It runs in a Web Worker**, never on the page's thread (`../docs/decisions.md`, Architecture): set up with the first transfer.
- **API types** are generated from the `openapi.json` of the pinned `core` release (attached to its Gitea release), never written by hand: `scripts/api-types.sh` writes `src/lib/api.d.ts` (committed, checked by CI) with `openapi-typescript`, used through `openapi-fetch` (a thin typed `fetch` wrapper reading those types: no generated client).
- **Pinned `core` release: one pin**, the exact version of `@theca/client` in `package.json`; `scripts/api-types.sh` reads it, so the engine and the types always come from the same release. Read `../docs/BREAKING.md` before bumping it. `core`'s source is in `../core` (read it, don't edit it from here: an API gap is a `core` change and release).
- **Pages the server links to** (they must exist, with these paths): `/setup?token=` (first-run setup, printed in the logs), `/verify?token=` (email verification), `/reset?token=` (password reset), `/invite?token=` (invitations), `/login?error=` (a failed OIDC login), `/` (after an OIDC login).
- **Known `core` gaps for this app** (`../core/roadmap/15. one-way doors.md`, Findings): library members, dedup namespaces and creating or renaming company organizations have no endpoints yet. Plan them as a `core` step early.
- The plan goes in `roadmap/`, as in `../core/roadmap/`: `00. global.md` first, then one file per step, each written right before implementing it.
- **Dev server**: `scripts/dev.sh` (core's latest rc + Postgres, set up with the dev admin, on :8093; `PUBLIC_URL` is the Vite dev server's :5173, which must proxy `/api` and `/dav` to :8093, so links and presigned URLs lead to the app on one origin). For a local core change: `cargo run` in `../core`.
- **Tooling, copied from `cli` (where it was debugged)**: `scripts/ci.sh` (lint, build, test; the Woodpecker steps and the pre-push hook call it), the pipelines in `.woodpecker/` (path filters, the release merge into `dev` skipped), `scripts/release.sh` and `release-ci.sh` (the `web` image, the tag and the release). `scripts/ci.sh` calls npm scripts the first step must define: `lint`, `check`, `build`, `test` (Vitest), `test:e2e` (Playwright); the CI's Playwright image tag follows `@playwright/test`.
- **Tests**: Vitest for logic, and **Playwright flows end to end against the real server** (login, upload, download, versions, trash...), as the CLI's batch tests: in CI the server serves the build (`WEB_DIR`), as in production. They catch what unit tests can't.

@README.md
