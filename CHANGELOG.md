# Changelog

## [1.2.0] - 2026-10-27

### Features

- Library groups under Advanced in an organization's settings
- Core 1.1.0

### Documentation

- **claude**: The registry token for npm ci, and the Page type in Kit 3
- **claude**: Never time uploads through Playwright's Chromium

## [1.1.0] - 2026-10-17

### Features

- The Theca mark, the favicon and tab titles

### Documentation

- The README sends users to the CE and its demo

## [1.0.0] - 2026-10-16

### Features

- Core 1.0.0

### Build and CI

- The global workflow; no web image, tested against the core it pins (**breaking**)

## [0.4.0] - 2026-10-12

### Features

- The admin's settings as cards, each group edited in a dialog
- Connection tests for SMTP, storages and identity providers

### Fixes

- Whatever can be clicked shows the pointer cursor

### Documentation

- **claude**: Keep only what is specific to theca, the rest is global
## [0.3.1] - 2026-10-08

### Fixes

- A file's page shows its modification time, not its upload's
## [0.3.0] - 2026-10-08

### Features

- Core 0.18.0, uploads keep their files' modification times
## [0.2.1] - 2026-10-08

### Fixes

- Core 0.17.1
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
