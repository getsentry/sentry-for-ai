# Session Replay — What & Why

A reconstruction of a user session around an error or UX problem. On **web** it's rebuilt from DOM
snapshots and events (rrweb — *not* a screen recording), so it's lightweight; on **mobile** it's a
view-hierarchy reconstruction plus periodic screenshots, with more aggressive default redaction.
Replays link to the errors, traces, and rage/dead clicks in the same session. It's a **frontend/mobile**
signal — there's nothing to replay on a backend.

## What a replay adds over a stack trace

A replay is the *user's path*, timestamp-synced to everything else in the session — the clicks,
navigations, network calls, and console output that led to the error, not just the frame where it threw.
Two UX signals live here that never surface as exceptions: a **dead click** (a click that produces no
response within ~7s) and a **rage click** (the repeated-click subset) — and these are promoted to their
own **issues**, so a real UX problem can exist with no exception behind it.

## Setup essentials

- **Two sample rates, asymmetric:** keep `replaysOnErrorSampleRate` **high** (often `1.0` — you want a
  replay for any session that errored) and `replaysSessionSampleRate` **low** (a few percent — capturing
  every healthy session is expensive).
- **Privacy.** Defaults **mask all text and block media** — start there; use mask/block selectors to
  redact sensitive fields before unmasking anything globally, and treat network request/response **body
  capture as opt-in**. Mobile redacts more aggressively by default; still review sensitive screens.

## Related

- [`data-scrubbing.md`](data-scrubbing.md)
- [`reduce-volume.md`](reduce-volume.md)
- [`search-query-language.md`](search-query-language.md) — replay properties (`count_rage_clicks`,
  `click.*`, `count_errors`, …).
