# Data Scrubbing / PII — Strategy

Controlling what personal or sensitive data reaches (and is stored by) Sentry — a common GDPR / PCI /
SOC2 requirement, or just not wanting tokens in your error tracker. Treat as sensitive: emails, names,
IPs, user IDs that map to people, full request/response **bodies**, **headers** (auth tokens, cookies,
session IDs), query strings with tokens, passwords, and anything regulated. When in doubt, assume a field
is sensitive.

## Defense in depth — two layers, both

1. **SDK-side (before data leaves the app)** — the strongest guarantee; data you never send can't leak.
   - `sendDefaultPii` controls whether the SDK attaches request/user PII automatically (default off).
   - `beforeSend` / `beforeSendTransaction` hooks strip, redact, or drop fields on every event.
2. **Server-side (Sentry, the backstop)** — data-scrubbing rules scrub on ingest (Safe/Sensitive field
   lists + an advanced selector rules engine). On by default.

Scrub at the earliest layer you can; keep the server-side rules as a backstop, because you'll eventually
capture something you didn't anticipate.

## AI/LLM attributes (`gen_ai.*`)

**Prompt and completion attributes (`gen_ai.input.messages`, `gen_ai.output.messages`,
`gen_ai.tool.call.*`, …) are not scrubbed by the default server-side rules.** Their capture is itself
opt-in (only when PII capture is enabled), but *once captured they aren't redacted* — so if you
instrument an LLM app, explicitly scrub them with an advanced rule (`$span.data.'<attribute>'`) or
disable their capture.

## Verify, don't assume

Trigger an event and confirm the sensitive fields are absent/redacted in the event detail. Logs and
replay/screenshots are the easiest leaks — pair with [`logging.md`](logging.md) and
[`session-replay.md`](session-replay.md).

## Related

- [`logging.md`](logging.md)
- [`session-replay.md`](session-replay.md)
- [`reduce-volume.md`](reduce-volume.md)
