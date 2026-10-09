# Volume & Cost — Strategy

Sentry bills by the volume of each signal (errors, spans, replays, profiles), and logs
and metrics are billed by *size* — so attribute count and message length matter, not
just event count. Reducing volume is keeping the data that earns its place and dropping
the rest — for quota *and* for signal-to-noise.

## The core tradeoff, per signal

- **Errors:** sample *lightly* or not at all — usually what you can’t afford to miss.
  The cheapest win is **filtering known noise** (browser-extension errors, bots, a
  specific bogus exception), not blanket down-sampling.
- **Spans / traces:** sample *aggressively* — the highest-volume signal and biggest
  lever. A `tracesSampler` that keeps important paths and drops health-check noise beats
  a flat low rate. (Note `tracesSampleRate: 0` doesn’t disable tracing — see
  [`tracing.md`](tracing.md).)
- **Replays / profiles:** keep the asymmetric/sampled defaults (high on error, low on
  normal).
- **Logs / metrics:** billed by size — trim attribute count and message length, not just
  event count, on top of emitting fewer, higher-signal events.

## Where to sample

Sample in the SDK first (head sampling keeps whole traces).
Use server-side filters, rate limits, and spike protection as a backstop.
See
[Manage Your Error Quota](https://docs.sentry.io/pricing/quotas/manage-event-stream-guide/).

## A practical workflow

1. **Find the top offenders first** (MCP / Explore across errors, spans, and logs) —
   don’t cut blind.
2. **Filter known noise** — high precision, no fidelity loss on real data.
3. **Tune span sampling** with a `tracesSampler` — the biggest lever.
4. **Set rate limits / spike protection** as a safety net.
5. **Re-measure** to confirm you cut noise, not signal.

## Related

- [`tracing.md`](tracing.md) — span sampling, the main lever.
- [`logging.md`](logging.md)
- [`session-replay.md`](session-replay.md)
- [`profiling.md`](profiling.md)
