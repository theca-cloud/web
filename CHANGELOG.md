# Changelog

Every release of the web app: the `web` image holding its build, assembled with `core` by `ce`.
## [0.2.0] - 2026-10-08

### Features

- The setup says more storages are added later; core 0.17.0

### Build and CI

- Generate the server's keys, core only reads them from 0.17.0
## [0.1.0] - 2026-10-08

### Features

- Skeleton, the app with its tooling, engine worker and Service Worker
- Auth pages: login (TOTP, OIDC providers and errors), registration, verification, password reset, invitations, the setup wizard
- Browse: the sidebar frame, libraries and folders by URL, and organizing files
- Transfers: uploads through the Web Worker, downloads streamed by the Service Worker
- Trash, versions, search, previews
- The account page, and the password strength bar
- The organization's settings, its usage, new organizations
- The admin's pages

### Fixes

- Logging out of a session already gone goes to the login
- Error pages: in the app's frame (sidebar kept), with a message per status and a way back

### Documentation

- Openapi-fetch for the API; the Service Worker is V1 (downloads), V2 adds previews
- The server also links to /account

### Build and CI

- Dev server, CI and release tooling, copied from the cli
- The registry token can live in .secrets/gitea_token (ignored)
- Path filters: .gitignore is read by lint; release skips changes only the checks read
- Core 0.9.0 (@theca/client and the API types); the dev server keeps its port
- Core 0.12.0
- The web image says which core it's for
