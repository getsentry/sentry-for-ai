# Data Scrubbing / PII — Strategy

## What it is

Controlling what personal or sensitive data reaches (and is stored by) Sentry. This is a
common compliance and security requirement — GDPR, PCI, SOC2, or just not wanting tokens in
your error tracker.

## What counts as sensitive

Treat as PII / secrets: emails, names, phone numbers, IP addresses, user IDs that map to
people, full request/response **bodies**, request **headers** (auth tokens, cookies, session
IDs), query strings with tokens, passwords, and anything regulated (payment, health). When in
doubt, assume a field is sensitive.

## Defense in depth — scrub in two layers

The right model is **both** layers, not one or the other:

1. **SDK-side (client / "in code")** — scrub *before the data leaves the app*. This is the
   strongest guarantee: data you never send can't leak.
   - `sendDefaultPii` controls whether the SDK attaches request/user PII automatically. Off
     means the SDK won't volunteer it.
   - `beforeSend` / `beforeSendTransaction` hooks let you strip, redact, or drop fields on
     every event.
2. **Server-side (Sentry, the backstop)** — Sentry's data-scrubbing rules scrub on ingest as
   a safety net for anything the SDK missed. Safe/Sensitive field lists and an advanced rules
   engine (selectors) match and redact server-side.

Scrub at the **earliest layer you can**, and keep the server-side rules as a backstop —
because you will eventually log or capture something you didn't anticipate.

## The `gen_ai.*` gotcha

**AI/LLM attributes (`gen_ai.*`) are *not* scrubbed by default.** Prompts and completions
captured by AI monitoring routinely contain user input and PII, but the default scrubbers
don't touch them. If you instrument an LLM app, you must explicitly scrub or disable capture
of prompt/response content — don't assume the defaults cover it.

## Best practices

- **Decide what's sensitive up front**, then scrub it at the SDK layer and confirm the
  server-side rules catch it too.
- **Logs are the easiest leak** — pair this with [`logging.md`](logging.md); never log
  bodies/headers/secrets.
- **Replay and screenshots** capture the UI — keep masking on (see
  [`session-replay.md`](session-replay.md)).
- **Verify by triggering an event** and confirming the sensitive fields are absent/redacted in
  the event detail — don't assume.

## Pitfalls

- Relying on server-side scrubbing alone — data still transited the network and could be in
  transit logs.
- Turning on `sendDefaultPii` for convenience and shipping user data.
- Forgetting `gen_ai.*` is unscrubbed.
- Capturing replay network bodies without scrubbing them.

## Related

- [`logging.md`](logging.md) · [`session-replay.md`](session-replay.md) · [`reduce-volume.md`](reduce-volume.md)
