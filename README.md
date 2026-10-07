# Theca web

The web app of [Theca](https://git.pband.ch/theca/docs): a SvelteKit single-page app, served by the [core](https://git.pband.ch/theca/core) server and shipped in the CE image.

Contributing: see [CONTRIBUTING.md](https://git.pband.ch/theca/docs/src/branch/prod/CONTRIBUTING.md).

## Development

Prerequisites: Node.js 24, `git-cliff` for releases, and a Gitea token with package read (`@theca/client` and the core releases' `openapi.json` are private), read by `.npmrc` and the scripts: `GITEA_TOKEN` in the environment, or the file `.secrets/gitea_token` (ignored by git), which the scripts read. npm itself only reads the variable:

```sh
GITEA_TOKEN=$(cat .secrets/gitea_token) npm install
```

```sh
scripts/dev.sh                 # start the dev server (core's latest rc + Postgres, set up), on :8093,
                               # its emails in Mailpit on :8095, a server to set up on :8094
scripts/dev.sh --fresh         # that last server back to never set up (the setup wizard's test)
scripts/dev.sh --down          # stop it all (start over: then rm -rf data/)
npm run dev                    # the app on :5193, /api and /dav proxied to :8093; login dev@theca.test theca-dev-password
scripts/ci.sh [lint|build|test] # every CI check natively, or one step (test needs scripts/dev.sh)
scripts/install-hooks.sh       # run scripts/ci.sh before every push (bypass: git push --no-verify)
scripts/api-types.sh           # the API types from the pinned core release (after bumping @theca/client)
scripts/release.sh --dry-run   # the next version and its changelog (releases: see CONTRIBUTING.md)
```

License: AGPL-3.0.
