@../docs/CLAUDE.md

# This repo: `web`

The web app: a SvelteKit + TypeScript SPA (`adapter-static`), no database, served by the core server (`WEB_DIR`). V1 scope: a full web app (`../docs/features.md`): browse, upload, download, versions, trash, search, previews, plus every account and admin page. Design: `../docs/decisions.md` (Architecture; Repository, CI and releases: this repo publishes a `web` image holding only the build, which `ce` assembles with `core`).

- **Uploads and downloads** go through the `@theca/client` WASM package (Gitea npm registry), the same engine as the CLI: never re-implemented in TypeScript.
- **API types** are generated from the `openapi.json` of the pinned `core` release (attached to its Gitea release), never written by hand.
- **Pinned `core` release**: read `../docs/BREAKING.md` before bumping it. `core`'s source is in `../core` (read it, don't edit it from here: an API gap is a `core` change and release).
- **Pages the server links to** (they must exist, with these paths): `/setup?token=` (first-run setup, printed in the logs), `/verify?token=` (email verification), `/reset?token=` (password reset), `/invite?token=` (invitations), `/login?error=` (a failed OIDC login), `/` (after an OIDC login).
- **Known `core` gaps for this app** (`../core/roadmap/15. one-way doors.md`, Findings): library members, dedup namespaces and creating or renaming company organizations have no endpoints yet. Plan them as a `core` step early.
- The plan goes in `roadmap/`, as in `../core/roadmap/`: `00. global.md` first, then one file per step, each written right before implementing it. Nothing is written yet: start with the global roadmap, discussed with the user.
- A server to develop against: `../core/try/run.sh` (the released image), or `cargo run` in `../core` after `scripts/dev.sh`.

@README.md
