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

# A host port: the one .env has, else `default` or the next free one (another
# project may hold it), kept in .env from then on.
port() {
    value=$(sed -n "s/^$1=//p" .env 2>/dev/null)
    if [ -z "$value" ]; then
        value=$2
        while nc -z 127.0.0.1 "$value" 2>/dev/null; do
            value=$((value + 1))
        done
    fi
    echo "$value"
}
app_port=$(port APP_PORT 5193)
server_port=$(port SERVER_PORT 8093)
fresh_port=$(port FRESH_PORT 8094)
mailpit_port=$(port MAILPIT_PORT 8095)
# Read by docker compose (the core image: the pin; the ports), Vite and the
# tests (the URLs).
cat >.env <<ENV
# Written by scripts/dev.sh. Ports: edit them here, then run it again.
CORE_VERSION=$(node -p "require('./package.json').dependencies['@theca/client']")
APP_PORT=$app_port
SERVER_PORT=$server_port
FRESH_PORT=$fresh_port
MAILPIT_PORT=$mailpit_port
THECA_TEST_SERVER=http://localhost:$server_port
THECA_TEST_FRESH=http://localhost:$fresh_port
THECA_TEST_MAILPIT=http://localhost:$mailpit_port
ENV

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
scripts/setup.sh "http://localhost:$server_port" /files
echo "Server: http://localhost:$server_port (admin dev@theca.test / theca-dev-password)"
echo "Emails: http://localhost:$mailpit_port; a server to set up: http://localhost:$fresh_port"
echo "The app: npm run dev, on http://localhost:$app_port"
