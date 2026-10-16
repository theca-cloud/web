#!/usr/bin/env sh
# Starts the dev server (the core this app is built for: the @theca/client pin,
# with Postgres), set up with the dev admin. Idempotent: run it as often as needed.
#   scripts/dev.sh          start
#   scripts/dev.sh --down   stop, keeping the data
#   scripts/dev.sh --fresh  the second server (setup wizard tests) back to never set up
# Start over: scripts/dev.sh --down && rm -rf data/
set -eu
cd "$(dirname "$0")/.."
export HOST_USER="$(id -u):$(id -g)"
# The compose's core image: the pin, for docker compose (it reads .env).
printf 'CORE_VERSION=%s\n' "$(node -p "require('./package.json').dependencies['@theca/client']")" >.env

if [ "${1:-}" = --down ]; then
    docker compose down
    exit 0
fi
if [ "${1:-}" = --fresh ]; then
    docker compose rm -sf theca-fresh fresh-db
    docker compose exec postgres dropdb -U theca --if-exists theca_fresh
    rm -rf data/files-fresh
fi

mkdir -p data/secrets data/db data/files data/files-fresh
for key in server.key data.key; do
    [ -s "data/secrets/$key" ] || openssl rand -hex 32 >"data/secrets/$key"
done
printf postgres://theca:theca@postgres:5432/theca >data/secrets/database_url
printf postgres://theca:theca@postgres:5432/theca_fresh >data/secrets/database_url_fresh

docker compose pull -q theca
docker compose up -d --wait
scripts/setup.sh http://localhost:8093 /files
echo "Server: http://localhost:8093 (admin dev@theca.test / theca-dev-password)"
echo "Emails: http://localhost:8095; a server to set up: http://localhost:8094"
