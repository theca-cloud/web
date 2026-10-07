#!/usr/bin/env sh
# Sets a fresh instance up with the dev admin (the tests log in as it), raises
# the login rate limits (the tests log in more often than people do), and
# sends emails to Mailpit (`mailpit:1025`, in the compose and in CI) at once.
# Idempotent. Used by scripts/dev.sh and the CI.
#   scripts/setup.sh <server url> <storage path, as the server sees it>
set -eu
url=$1
storage=$2
email=dev@theca.test
password=theca-dev-password

if curl -fsS "$url/api/v1/setup" | grep -q '"required":true'; then
    curl -fsS -o /dev/null -X POST -H 'Content-Type: application/json' "$url/api/v1/setup" -d '{
        "admin_email": "'"$email"'", "admin_password": "'"$password"'",
        "organization": "Dev",
        "storages": [{"name": "local", "implementation": "filesystem", "path": "'"$storage"'"}]}'
    echo "Set up: admin $email / $password"
fi

# The session as a Bearer token, read from the login's Set-Cookie: the cookie
# is `Secure`, which curl neither keeps nor sends over plain HTTP but to
# localhost (the CI's server is http://theca:8080).
session=$(curl -fsS -D - -o /dev/null -H 'Content-Type: application/json' "$url/api/v1/auth/login" \
    -d '{"email": "'"$email"'", "password": "'"$password"'"}' |
    sed -n 's/^[Ss]et-[Cc]ookie: theca_session=\([^;]*\).*/\1/p' | tr -d '\r')
curl -fsS -o /dev/null -X PATCH -H "Authorization: Bearer $session" -H 'Content-Type: application/json' \
    "$url/api/v1/admin/settings" -d '{"rate_limit_login_ip": "10000/60", "rate_limit_login_account": "10000/60",
        "rate_limit_email_address": "10000/60", "rate_limit_email_ip": "10000/60",
        "smtp_host": "mailpit", "smtp_port": "1025", "smtp_tls": "none", "smtp_from": "Theca <theca@dev.theca.test>",
        "job_email_send_interval_secs": "1"}'
curl -fsS -o /dev/null -X POST -H "Authorization: Bearer $session" "$url/api/v1/auth/logout"
