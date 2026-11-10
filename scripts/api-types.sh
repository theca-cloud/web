#!/usr/bin/env sh
# The API types (src/lib/openapi.d.ts, committed) from the openapi.json of the core
# release this app is pinned to: the exact version of @theca/client in
# package.json. One pin for both, so the engine and the types never drift.
# Run it after bumping @theca/client.
set -eu
cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').dependencies['@theca/client']")
case "$version" in
[0-9]*.[0-9]*.[0-9]*) ;;
*)
    echo "@theca/client must be pinned to an exact version in package.json, not '$version'" >&2
    exit 1
    ;;
esac
# Release tags: vX.Y.Z before 1.0.0, X.Y.Z from it.
case "$version" in 0.*) tag=v$version ;; *) tag=$version ;; esac
spec=$(mktemp)
trap 'rm -f "$spec"' EXIT
# From core's public GitHub mirror, at the tag: the same file its Gitea release
# attaches, and no token needed.
curl -fsSL -o "$spec" "https://raw.githubusercontent.com/theca-cloud/core/$tag/openapi.json"
# Pinned, run apart: it wants TypeScript 5 as a peer, the app has 6.
npx -y openapi-typescript@7.13.0 "$spec" -o src/lib/openapi.d.ts
