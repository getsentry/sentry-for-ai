# Profiling — What & Why

## What it is

Code-level sampling of production execution. While tracing tells you *which operation* is
slow, profiling tells you *which function and line* inside it is burning the time. The result
is a **flame graph** — aggregated across many samples, and available as differential
("what got slower between releases") views.

## When to reach for it

- Tracing showed you a slow span and you need to know *which code* is responsible.
- You're chasing CPU-bound work, main-thread blocking, or frame drops / jank.
- You want regression detection at the function level across releases.

## The dependency that trips people up

**Profiling requires tracing to be on.** Profiles are collected *inside* traced transactions,
and the profile sample rate is evaluated relative to sampled transactions. No tracing → no
profiles. Enable and verify tracing first.

## Modes

- **Continuous profiling** — backend services; profiles run for the life of the process, no
  per-transaction time cap. The current default for server workloads.
- **UI profiling** — frontend / mobile; profiles user-facing interactions.
- **Legacy transaction-based profiling** — older mode tied 1:1 to transactions; prefer
  continuous/UI on modern SDKs.

The right mode depends on platform and SDK version.

## Best practices

- **Sample, don't profile everything.** Profiling adds a small but real overhead (~1–5%);
  capture a representative slice, not 100% of traffic.
- **Mind minimum SDK versions** — profiling support and modes vary by platform and version.
- Use profiling to *confirm and localize* a bottleneck tracing already pointed at — not as a
  first-line, always-on signal.

## Pitfalls

- Enabling profiling without tracing and getting nothing.
- Profiling at full rate on a hot service and paying overhead for redundant data.
- Expecting profiles for code paths your tracing never sampled.

## Related

- [`tracing.md`](tracing.md) — the prerequisite.
- [`reduce-volume.md`](reduce-volume.md) — sampling/overhead tradeoffs.
