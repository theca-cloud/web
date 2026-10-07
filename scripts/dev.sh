#!/usr/bin/env sh
# Starts the dev server (core's latest release candidate, with Postgres), set
# up with the dev admin. Idempotent: run it as often as needed.
#   scripts/dev.sh          start (pulling the latest rc)
#   scripts/dev.sh --down   stop, keeping the data
# Start over: scripts/dev.sh --down && rm -rf data/
set -eu
cd "$(dirname "$0")/.."
export HOST_USER="$(id -u):$(id -g)"

if [ "${1:-}" = --down ]; then
    docker compose down
    exit 0
fi

mkdir -p data/secrets data/db data/files
for key in server.key data.key; do
    [ -s "data/secrets/$key" ] || openssl rand -hex 32 >"data/secrets/$key"
done
printf postgres://theca:theca@postgres:5432/theca >data/secrets/database_url

docker compose pull -q theca
docker compose up -d --wait
scripts/setup.sh http://localhost:8093 /files
echo "Server: http://localhost:8093 (admin dev@theca.test / theca-dev-password)"
