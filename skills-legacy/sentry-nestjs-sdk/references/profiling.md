# Profiling — Sentry NestJS SDK

> Requires `@sentry/profiling-node` (version must **exactly match** `@sentry/nestjs`)

## Installation

```bash
npm install @sentry/profiling-node --save
```

## Configuration

| Option | Purpose |
|--------|---------|
| `integrations: [nodeProfilingIntegration()]` | Enable the V8 CPU profiler |
| `profileSessionSampleRate` | Fraction of processes/pods to profile (evaluated **once at init**) |
| `profileLifecycle` | `'trace'` = auto-managed; `'manual'` = explicit start/stop |
| `tracesSampleRate` | Must be `> 0` — profiling requires tracing to be active |

## Mode Comparison

| | Trace lifecycle (`'trace'`) | Manual (`'manual'`) |
|---|---|---|
| **Start trigger** | First active span | `Sentry.profiler.startProfiler()` |
| **Stop trigger** | Last span ends | `Sentry.profiler.stopProfiler()` |
| **Coverage** | All code during active spans | Only between explicit start/stop |
| **Use case** | General profiling (recommended) | Targeted hot paths |
| **Setup** | Zero — fully automatic | Manual call sites required |

## Code Examples

### Trace lifecycle — recommended

Add `nodeProfilingIntegration()` to the `integrations` array in `instrument.ts`:

```typescript
// instrument.ts  (must be the first file loaded — see main skill)
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,  // profile 100% of process sessions
  profileLifecycle: "trace",       // SDK auto-manages profiler lifetime
});
```

All HTTP requests, lifecycle spans, `@OnEvent` handlers, and custom spans are profiled automatically.

### Manual mode — targeted profiling

```typescript
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "manual",
});

// Somewhere in application code:
Sentry.profiler.startProfiler();
await expensiveOperation();
Sentry.profiler.stopProfiler();
```

### Production fleet sampling

`profileSessionSampleRate` is decided **once at process startup** — use it to sample a fraction of pods/containers rather than per-request:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1,           // sample 10% of requests for traces
  profileSessionSampleRate: 0.25,  // profile 25% of pods/instances
  profileLifecycle: "trace",
});
```

## Technical Details

- Uses **V8's `CpuProfiler`** native C++ add-on — ~100 Hz sampling (10 ms interval)
- Precompiled binaries available for:
  - macOS x64 / ARM64
  - Linux x64 glibc / ARM64 musl
  - Windows x64
  - Node.js 18, 20, 22, 24
- **Not supported** in Deno or Bun

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SENTRY_PROFILER_BINARY_PATH` | Override full path to `profiler.node` binary |
| `SENTRY_PROFILER_BINARY_DIR` | Override directory containing `profiler.node` |
| `SENTRY_PROFILER_LOGGING_MODE` | `eager` (default) or `lazy` (starts on first use) |

**Eager mode (default):** Profiler always running — lower latency to first profile, uses CPU between requests.  
**Lazy mode:** Starts on first use — lower baseline CPU overhead, small latency on first profile.

## Performance Overhead

- 100 Hz sampling has minimal per-sample cost
- Eager mode consumes some CPU even between requests
- Load test before enabling in high-throughput production services
- Start with a low `profileSessionSampleRate` (e.g., `0.1`) and increase based on observed overhead

## Troubleshooting

| Issue | Solution |
|-------|---------|
| No profiles appearing | Verify `tracesSampleRate > 0` and both `profileSessionSampleRate` + `profileLifecycle` are set |
| Native binary fails to load | Check Node.js version is 18–24 and platform is supported; set `SENTRY_PROFILER_BINARY_PATH` if needed |
| Version mismatch error | `@sentry/profiling-node` version must exactly match `@sentry/nestjs` |
| Profiler not stopping (manual mode) | Ensure `Sentry.profiler.stopProfiler()` is called on shutdown / after the target code |
| High CPU in idle | Switch to `SENTRY_PROFILER_LOGGING_MODE=lazy` or reduce `profileSessionSampleRate` |
