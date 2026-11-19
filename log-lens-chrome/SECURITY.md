# Security policy

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting** for this repository. If that is not
available, contact the maintainer through the repository profile. Include:

- the affected version (`1.1.0` or the commit SHA)
- browser and operating system
- a minimal reproduction, if possible
- the impact you believe the issue has

Please do not open a public issue for a vulnerability that could expose logs or secrets.
You will get an acknowledgement within a few business days.

## Security model

Log Lens is designed to be safe by default:

- **Local-first.** The extension has no backend, account system, or default endpoint.
- **No analytics or remote code.** All executable code ships in the extension package.
- **Opt-in network access.** Auto-send requires a consent checkbox, an endpoint, and host
  permission. Page, console, and network capture require their own optional permissions.
- **Allow-listed public API.** External messages are rejected unless the sender extension
  ID or exact web origin is approved in Settings.
- **No sensitive request data.** Cookies, authorization headers, form values, request
  bodies, response bodies, and page text are never captured.
- **Redaction before persistence.** The store redacts bearer tokens, API keys, passwords,
  JWTs, session IDs, credential-like strings, and URL credentials. Reports re-apply
  redaction.
- **Output safety.** Log text is inserted with DOM text nodes; extension pages use a strict
  CSP without `unsafe-eval`.
- **Incognito disabled.** `incognito: "not_allowed"` prevents logs from private sessions
  being mixed into the normal store.

## Known limitations

- Error messages and stack traces can contain fragments of application data. Redaction is
  pattern-based and cannot guarantee that every possible secret shape is removed.
- If the user disables **Redact secrets**, text fields are stored as supplied (URL query
  strings are still stripped by default). This is an explicit user choice.
- A page screenshot can contain anything visible on the page. Log Lens requires
  confirmation and never uploads the image.
- Anyone with local access to the Chrome profile can read `chrome.storage.local`.
- External allow-listed senders are trusted to send whatever entry content they choose;
  Log Lens validates shape and size, then applies redaction.

## Recommended practices

- Use HTTPS endpoints.
- Keep the approved-extension and approved-origin lists empty unless you need them.
- Export or email a report before clearing logs.
- Review reports before sharing them in a public issue.
- Keep Chrome and the extension updated.
