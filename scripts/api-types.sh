#!/usr/bin/env sh
# The API types (src/lib/api.d.ts, committed) from the openapi.json of the core
# release this app is pinned to: the exact version of @theca/client in
# package.json. One pin for both, so the engine and the types never drift.
# Run it after bumping @theca/client (read ../docs/BREAKING.md first).
set -eu
cd "$(dirname "$0")/.."
# The registry token: GITEA_TOKEN, else .secrets/gitea_token (ignored by git).
export GITEA_TOKEN="${GITEA_TOKEN:-$(cat .secrets/gitea_token 2>/dev/null)}"

version=$(node -p "require('./package.json').dependencies['@theca/client']")
case "$version" in
[0-9]*.[0-9]*.[0-9]*) ;;
*)
    echo "@theca/client must be pinned to an exact version in package.json, not '$version'" >&2
    exit 1
    ;;
esac
spec=$(mktemp)
trap 'rm -f "$spec"' EXIT
curl -fsSL -H "Authorization: token ${GITEA_TOKEN:?GITEA_TOKEN: see the README}" -o "$spec" \
    "https://git.pband.ch/theca/core/releases/download/v$version/openapi.json"
npx openapi-typescript "$spec" -o src/lib/api.d.ts
