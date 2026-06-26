# Session Replay — What & Why

## What it is

A video-like reproduction of a user session around an error or UX problem. On the **web**,
it's a reconstruction from DOM snapshots and events (not an actual video — no screen
recording), so it's lightweight. On **mobile**, it's a view-hierarchy reconstruction plus
periodic screenshots, with more aggressive default redaction.

Replays link to the errors, traces, and rage/dead clicks in the same session, so you can
*watch* what the user did before something broke.

## When to reach for it

- You want to *see* what the user did leading up to an error — not just the stack trace.
- You're investigating UX problems: **rage clicks**, **dead clicks**, hydration errors,
  confusing flows.
- A bug is "can't reproduce" and you need the real user's path.

Replay is a **frontend/mobile** signal — there's nothing to replay on a backend service.

## Sampling strategy

Two independent rates, and the recommended shape is asymmetric:

- **`replaysOnErrorSampleRate`** — keep **high** (often `1.0`). You almost always want the
  replay for a session that errored.
- **`replaysSessionSampleRate`** — keep **low** (a few percent). Capturing every normal
  session is expensive and rarely worth it; a small sample is enough to study healthy flows.

## Privacy — review before relaxing

Replay is the signal most likely to leak PII because it captures the actual UI.

- **Defaults mask all text and block media.** That's deliberate — start there.
- Use **mask / block selectors** to redact anything sensitive (payment fields, tokens, PII)
  *before* you unmask anything globally.
- **Network request/response bodies are opt-in.** Keep them off unless you've explicitly
  scrubbed them — bodies are a classic place to spill secrets and personal data.
- Mobile replay redacts more aggressively by default; still review screens with sensitive
  content.

## Best practices

- Start with defaults (high error rate, low session rate, full masking) and relax only with a
  reason.
- Treat unmasking as a deliberate, reviewed decision — not a convenience toggle.
- Pair with [`data-scrubbing.md`](data-scrubbing.md) for the broader PII model.

## Pitfalls

- Cranking `replaysSessionSampleRate` to `1.0` and burning quota on healthy sessions.
- Enabling network body capture without scrubbing — direct PII leak.
- Globally unmasking text to "make replays readable" and exposing user data.

## Related

- [`data-scrubbing.md`](data-scrubbing.md) · [`reduce-volume.md`](reduce-volume.md)
- [`search-query-language.md`](search-query-language.md) — replay properties
  (`count_rage_clicks`, `click.*`, `count_errors`, …).
