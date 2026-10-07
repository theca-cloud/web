#!/usr/bin/env sh
# Every CI check, run natively: `scripts/ci.sh` runs them all (locally, and the
# pre-push hook); `scripts/ci.sh <step>` runs one, as the Woodpecker steps do:
#   lint   formatting, lint, types (npm run lint, npm run check), and the API
#          types up to date with the pinned core release (scripts/api-types.sh)
#   test   unit tests (npm test), then the end-to-end ones (npm run test:e2e)
#          against THECA_TEST_SERVER (default: scripts/dev.sh's), set up first
#          if fresh (scripts/setup.sh, the storage at THECA_TEST_STORAGE), on
#          the app at THECA_TEST_APP: in CI the server itself, serving build/
#          (WEB_DIR) as in production; unset, the tests start the dev server
#   build  the static app in build/ (npm run build)
# Dependencies are installed first if missing (npm ci). @theca/client is on the
# private registry: GITEA_TOKEN (see the README).
set -eu
cd "$(dirname "$0")/.."
# The registry token: GITEA_TOKEN, else .secrets/gitea_token (ignored by git).
export GITEA_TOKEN="${GITEA_TOKEN:-$(cat .secrets/gitea_token 2>/dev/null)}"

step=${1:-all}
case "$step" in
    all | lint | test | build) ;;
    *)
        echo "usage: scripts/ci.sh [lint|test|build]" >&2
        exit 2
        ;;
esac

[ -d node_modules ] || npm ci

if [ "$step" = all ] || [ "$step" = lint ]; then
    npm run lint
    npm run check
    scripts/api-types.sh
    git diff --exit-code -- src/lib/api.d.ts ||
        { echo "src/lib/api.d.ts is stale: run scripts/api-types.sh and commit it" >&2; exit 1; }
fi
if [ "$step" = all ] || [ "$step" = build ]; then
    npm run build
fi
if [ "$step" = all ] || [ "$step" = test ]; then
    npm test
    server=${THECA_TEST_SERVER:-http://localhost:8093}
    # The server may still be starting (CI): wait for up to a minute.
    attempt=0
    until curl -fsS "$server/api/health" >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
            echo "no server at $server: run scripts/dev.sh" >&2
            exit 1
        fi
        sleep 2
    done
    scripts/setup.sh "$server" "${THECA_TEST_STORAGE:-/files}"
    THECA_TEST_SERVER=$server npm run test:e2e
fi
echo "CI checks passed ($step)"
