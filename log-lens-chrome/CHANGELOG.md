# Changelog

All notable changes to **Log Lens for Chrome** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic
versioning.

## [1.1.0] — 2026-11-07

The first production release. This is a minor bump from the 1.0.0 scaffold and adds the full
capture, viewer, delivery, screenshot, export, and public-API feature set.

### Added

- **Automatic capture** of extension errors, unhandled rejections, page errors (opt-in),
  `console.error` (opt-in), and network failures (opt-in). Only `error` and `failure` are
  captured by default; the minimum level is configurable.
- **Persistent ring buffer** in `chrome.storage.local` with a configurable maximum
  (default 200), retention window (default 7 days), consecutive-entry deduplication, and
  quota fallback that halves the buffer instead of dropping capture.
- **Automatic opening** with `never`, `on-error`, and `always` modes. Prefers
  `chrome.sidePanel.open`, falls back to a `logs.html` tab when Chrome requires a gesture,
  reuses an existing logs tab, and applies a 5-second burst cooldown.
- **Opt-in automatic sending** to a user-configured HTTPS endpoint (HTTP localhost allowed
  for development), with a consent checkbox, immediate or scheduled delivery, per-request
  timeout, custom JSON headers, capped exponential retries, a persistent outbox, a dry-run
  preview of the exact JSON, and a manual test send.
- **Manual actions**: Email Logs, Export Logs, Capture Screenshot, Copy All, Clear Logs.
- **Popup summary** with capture status, entry/error counts, last error time, latest three
  entries, and every manual action.
- **Side-panel and full-tab log viewer** with live storage updates, free-text search,
  level/source/time filters, expandable details and stacks, per-entry copy, and responsive
  narrow layouts.
- **Options page** for capture, storage, auto-open, notifications, badge, reports,
  screenshots, auto-send consent/endpoint/headers/retries, public-API allow-lists, and
  permission status.
- **Toolbar badge** with the current error count, **desktop notifications** for new errors,
  **`Ctrl+Shift+L` / `Command+Shift+L` shortcut**, and **context menu** actions.
- **Public API** through `chrome.runtime.onMessageExternal` for other extensions and
  approved web origins, with an allow-list, schema validation, a 32 KB payload limit, and
  per-sender rate limiting. `LOG_LENS/PING` provides version discovery.
- **Screenshot support**:
  - log panel rendered with `dom-to-image-more` to PNG/JPEG
  - visible page captured with `chrome.tabs.captureVisibleTab` after confirmation
  - both download locally through `chrome.downloads`
- **Email support** through a pre-filled `mailto:` report with a preview dialog, copy-body
  action, and safe truncation. Log Lens never sends email directly.
- **Export support** as a timestamped `.log` report containing the environment header and
  all entries, with a save dialog and saved-path toast.
- **Privacy controls**: never captures cookies, form data, auth headers, request/response
  bodies, or page text; redacts bearer tokens, API keys, passwords, JWTs, session IDs,
  credential-like strings, and URL credentials; strips URL query strings by default;
  disables incognito.
- **Strict TypeScript architecture** with dependency-injected stores, senders, clocks,
  storage, and Chrome event adapters.
- **Quality gates**: Vitest unit tests, Playwright E2E with the unpacked extension loaded,
  ESLint, strict `tsc`, build verification, icon generation, documentation screenshots, and
  ZIP packaging.

### Changed

- Bumped `manifest.json` and `package.json` from **1.0.0** to **1.1.0**.
- Replaced the initial scaffold with a complete Manifest V3 service-worker architecture.
- README rewritten with installation, capture, auto-open, auto-send, email, export,
  screenshot, privacy, public-API, settings, troubleshooting, and development sections.
- Added generated documentation images under `docs/images/`.

### Security

- Auto-send is disabled by default and gated behind explicit consent plus endpoint host
  permission.
- External writes require an approved extension ID or exact web origin.
- Extension pages use a strict CSP with no `unsafe-eval` and no remote code.
- Page and network capture permissions are optional and requested only when the feature is
  enabled.
- Redaction is applied in the store before persistence and re-applied for reports.
- All log text is inserted with DOM text nodes, not untrusted HTML.

## [1.0.0] — 2026-11-07

### Added

- Initial Manifest V3 scaffold for a local-first Chrome error log companion.
- Base TypeScript, Vite, lint, test, build, and packaging setup.
- Initial log model and storage/redaction foundations.

[1.1.0]: https://github.com/malikrajat/log-lens/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/malikrajat/log-lens/releases/tag/v1.0.0
