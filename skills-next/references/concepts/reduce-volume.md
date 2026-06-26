# Volume & Cost — Strategy

## What it is

Sentry bills by the volume of each signal (errors, spans, replays, logs, profiles, …).
Reducing volume is about **keeping the data that earns its place and dropping the rest** —
both to stay within quota and to keep the signal-to-noise ratio high.

## The core tradeoff: fidelity vs. cost

You're trading completeness against money and noise. The art is dropping volume where you
won't miss it and keeping it where you will:

- **Errors:** sample *lightly* or not at all. Errors are usually what you can't afford to
  miss; the cheapest win is **filtering known-noise** (browser-extension errors, bots, a
  specific bogus exception) rather than blanket down-sampling.
- **Spans / traces:** sample *aggressively*. This is the highest-volume signal and the
  biggest lever. A `tracesSampler` that keeps important paths and drops health-check noise
  beats a flat low rate.
- **Replays / profiles:** keep the asymmetric/sampled defaults (high on error, low on
  normal); these are heavy.
- **Logs:** prune at the source — fewer, higher-signal logs (see [`logging.md`](logging.md)).

## Where to sample — head vs. server-side

- **Client / head sampling (SDK-side)** — decide *before sending*. Cheapest (you never pay to
  ingest), and the sampling decision propagates across a trace so you keep whole traces, not
  fragments. The first lever to reach for.
- **Server-side (Sentry)** — applied on ingest, as a backstop and for things the SDK can't
  cleanly decide:
  - **Inbound data filters** — drop browser-extension errors, known crawlers, legacy
    browsers, specific error messages, by IP.
  - **Per-DSN rate limits** — cap a noisy key.
  - **Spike protection** — automatic guardrail against a sudden flood blowing your quota.
  - **Delete & Discard** — stop ingesting a specific high-volume issue entirely.

## A practical reduction workflow

1. **Find the top offenders first.** Use the MCP / `/seer` / Discover to identify the
   highest-volume issues and span sources — don't blanket-cut blind.
2. **Filter known noise** (specific issues, bots, extensions) — high-precision, no fidelity
   loss on real data.
3. **Tune span sampling** with a `tracesSampler` — the biggest lever.
4. **Set rate limits / spike protection** as a safety net.
5. **Re-measure** before/after to confirm you cut the noise, not the signal.

## Pitfalls

- Blanket-lowering error sampling and missing a rare critical crash.
- Treating `tracesSampleRate: 0` as "off" — it samples nothing but leaves tracing enabled
  (see [`tracing.md`](tracing.md)).
- Cutting without measuring, so you can't tell whether you fixed the cost or hid a real
  problem.
- Relying only on spike protection instead of fixing the noisy source.

## Related

- [`tracing.md`](tracing.md) — span sampling, the main lever.
- [`logging.md`](logging.md) · [`session-replay.md`](session-replay.md) · [`profiling.md`](profiling.md)
- [`search-query-language.md`](search-query-language.md) — find the noisy sources by query.
