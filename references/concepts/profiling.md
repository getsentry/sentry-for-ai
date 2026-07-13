# Profiling — What & Why

Code-level sampling of production execution. Tracing tells you *which operation* is slow; profiling
tells you *which function and line* inside it is burning the time. The output is a **flame graph**,
also available as **differential** ("what got slower between releases") views.

## What a flame graph represents

A flame graph aggregates many stack samples, and its two shapes have **different x-axes**. In a
single-profile graph X is time and **width = time spent**, so the bottleneck is the deepest wide frame
with high **self-time** (time in the function itself, excluding children) — a wide frame with little
self-time just means the cost is in a child. In an **aggregated** graph X is not time; **width = how
often a frame appears** across samples. Frames are colored **application vs. system**: you can only act
on your own code, so a wide *application* frame is the target, not a wide system frame. A profile
covers one thread at a time.

## Setup essentials

- **Modes:** **Continuous profiling** (backend; Python/Node today) and **UI profiling**
  (frontend/mobile) are the current products; legacy transaction-based profiling is being replaced.
- **The dependency to get right:** in the default **`manual` lifecycle** mode, profiling runs
  *independently* of tracing — you start/stop it explicitly (`start_profiler`/`stop_profiler`), and
  nothing is collected until you do. Only the optional **`trace` lifecycle** mode (and legacy
  transaction-based profiling) require tracing on and sample relative to sampled transactions.
- **Sample, don't profile everything** — ~1–5% CPU overhead; sampling is session-scoped. Mind minimum
  SDK versions (support varies by platform).

## Related

- [`tracing.md`](tracing.md) — profiling localizes a bottleneck tracing pointed at.
- [`reduce-volume.md`](reduce-volume.md) — sampling/overhead tradeoffs.
