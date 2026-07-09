# Profiling — Sentry Node.js SDK

> Node.js profiling: `@sentry/profiling-node` — must match your `@sentry/node` version exactly  
> **Bun and Deno are NOT supported.** The profiler is a native C++ addon (`node-gyp`) that only runs in Node.js.

---

## Overview

Profiling captures V8 CPU call stacks at ~100 samples/second alongside your traces. Profiles attach to spans, giving you flame graphs to identify hot paths directly from a slow trace.

Profiling is **Node.js only**:

| Runtime | Profiling | Notes |
|---------|-----------|-------|
| Node.js ≥18 | ✅ | Full support via `@sentry/profiling-node` |
| Bun | ❌ | Native addon not supported |
| Deno | ❌ | Native addon not supported |

---

## How Profiling Relates to Tracing

Profiles attach to **spans** — they require tracing to be enabled:

1. `tracesSampleRate` / `tracesSampler` decides whether a request is traced at all
2. `profileSessionSampleRate` decides whether the session opts into profiling
3. A profile is only collected when **both** sampling decisions are "yes"

```
tracesSampleRate: 0.1   +  profileSessionSampleRate: 0.5
→ ~5% of requests will have both a trace AND a profile attached
```

In `trace` lifecycle mode, you can drill from a slow span in the Performance UI directly into a flame graph:

```
Trace: "POST /api/checkout" (850ms)
  ├── "validateCart" (45ms)   → [Profile attached] → shows DB driver hot paths
  ├── "processPayment" (620ms)
  └── "updateInventory" (185ms) → [Profile attached] → shows ORM overhead
```

---

## Installation

```bash
npm install @sentry/profiling-node --save
```

> ⚠️ **Version pinning is required.** `@sentry/profiling-node` must exactly match your `@sentry/node` version. Mismatched versions cause silent failures or startup crashes.

```bash
# Both must be the same version
npm install @sentry/node@latest @sentry/profiling-node@latest
```

---

## SDK Configuration

### Trace Mode (Recommended)

Profiles auto-attach to all sampled spans with no additional code:

```typescript
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(),
  ],

  tracesSampleRate: 1.0,

  // Session-level sampling: decision made once at process startup
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // "trace" = profiles auto-attach to every sampled span
  profileLifecycle: "trace",
});
```

### Manual Mode

Start and stop profiling around specific code paths:

```typescript
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "manual",
});

// Explicit start/stop around critical code:
Sentry.profiler.startProfiler();
await heavyComputation();
Sentry.profiler.stopProfiler();
```

---

## Continuous Profiling

For long-running processes, batch jobs, or background workers that don't map cleanly to request spans, use the profiler API directly:

```typescript
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
});

// Start profiling at process startup
Sentry.profiler.startProfiler();

// Profile is chunked automatically into ~60-second intervals and uploaded
// All spans created during this window have profile data attached

// Stop when done (e.g. graceful shutdown)
process.on("SIGTERM", () => {
  Sentry.profiler.stopProfiler();
  process.exit(0);
});
```

### Profile Chunk Architecture

The V2 profiler divides data into 60-second chunks that upload automatically:

```
Process lifetime:
┌─── 60 seconds ───┬─── 60 seconds ───┬─── 60 seconds ───┐
│   Chunk 1        │   Chunk 2        │   Chunk 3        │
│   Spans: [...]   │   Spans: [...]   │   Spans: [...]   │
│   Sent at 60s    │   Sent at 120s   │   Sent at 180s   │
└──────────────────┴──────────────────┴──────────────────┘
```

This means there's no 30-second max like in the legacy V1 API — the profiler runs as long as your process does.

---

## Profiler API Reference

### `Sentry.profiler.startProfiler()`

Starts the V8 CpuProfiler. Call this once at process startup or before the code you want to profile.

```typescript
Sentry.profiler.startProfiler();
```

- No-ops gracefully if already running
- Takes effect immediately
- Overhead is low; safe to call at startup in production

### `Sentry.profiler.stopProfiler()`

Stops the profiler and flushes remaining profile data to Sentry.

```typescript
Sentry.profiler.stopProfiler();
```

- Flushes the current in-progress chunk
- Call on graceful shutdown to avoid losing the last partial chunk

### Manual Start/Stop Pattern

```typescript
// Profile a specific batch job, not the entire process
async function runNightlyBatch() {
  Sentry.profiler.startProfiler();
  try {
    await Sentry.startSpan({ op: "batch", name: "nightly-sync" }, async () => {
      await syncUsers();
      await syncOrders();
      await syncInventory();
    });
  } finally {
    Sentry.profiler.stopProfiler();
  }
}
```

---

## Configuration Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `profileSessionSampleRate` | `0.0–1.0` | Session-level sampling. Decision made once at process startup. |
| `profileLifecycle` | `"trace" \| "manual"` | `"trace"` = auto-attach to spans; `"manual"` = explicit `startProfiler()`/`stopProfiler()` |
| `nodeProfilingIntegration()` | integration | Enables V8 CpuProfiler. Must be in `integrations` array. |

### `profileSessionSampleRate` Semantics

The profiling sampling decision is made **once per process startup** — not per request.

A "profiling session" either opts in or opts out for its entire lifetime. Within a profiling session, every traced span gets a profile attached (in `trace` mode).

```typescript
// 10% of Node.js processes will profile all their requests
profileSessionSampleRate: 0.1
```

### `profileLifecycle` Modes

| Mode | Trigger | Best for |
|------|---------|----------|
| `"trace"` | Auto-attached to every sampled span | Broad production coverage, web servers |
| `"manual"` | `startProfiler()` / `stopProfiler()` | Batch jobs, specific hot paths, CLI tools |

---

## Supported Platforms

Precompiled native binaries are available for:

| OS | Architecture | Node.js |
|----|--------------|---------|
| macOS | x64 (Intel) | 18–24 |
| macOS | ARM64 (Apple Silicon) | 18–24 |
| Linux (glibc) | x64 | 18–24 |
| Linux (glibc) | ARM64 | 18–24 |
| Linux (musl/Alpine) | x64 | 18–24 |
| Linux (musl/Alpine) | ARM64 | 18–24 |
| Windows | x64 | 18–24 |

> ❌ **FreeBSD, 32-bit systems, Bun, and Deno are not supported.**  
> The native addon requires Node.js — it cannot run in other runtimes.

### Alpine Linux / Docker

The musl libc variant is included automatically. If you see missing binary errors on Alpine:

```dockerfile
# Ensure you're installing native dependencies
RUN npm install --include=optional
```

Or rebuild from source:
```dockerfile
RUN apk add --no-cache python3 make g++ && npm rebuild @sentry/profiling-node
```

---

## Environment Variables

```bash
# Override profiler binary path (for custom builds or non-standard environments)
SENTRY_PROFILER_BINARY_PATH=/custom/path/sentry_cpu_profiler.node

# Override binary directory
SENTRY_PROFILER_BINARY_DIR=/path/to/dir

# Profiler logging mode:
# "eager" (default) — faster startProfiler calls, slightly more CPU overhead
# "lazy"            — lower CPU overhead, slightly slower startProfiler
SENTRY_PROFILER_LOGGING_MODE=lazy node server.js
```

---

## Production Recommendations

```typescript
Sentry.init({
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileLifecycle: "trace",
});
```

**Performance impact notes:**

- **Sampling rate (~100Hz):** The V8 CpuProfiler adds CPU overhead. Test with realistic load before deploying `profileSessionSampleRate: 1.0` to high-traffic production.
- **Memory:** Each 60-second chunk uses ~10–20 MB of buffer. Capped at 50 chunks (~100 MB max).
- **Network:** One profiling upload per 60-second window per process.

> "For high-throughput environments, we recommend testing prior to deployment to ensure that your service's performance characteristics maintain expectations." — Sentry docs

For high-traffic servers, start conservative:

```typescript
// Start at 1–5% and increase after measuring overhead
profileSessionSampleRate: 0.01
```

---

## Complete Setup Example

```typescript
// instrument.ts (loaded before app code)
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(),
  ],

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileSessionSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileLifecycle: "trace",
});
```

```typescript
// app.ts
import "./instrument"; // Must be first import
import express from "express";
import * as Sentry from "@sentry/node";

const app = express();

app.get("/api/users", async (req, res) => {
  // Automatically traced + profiled (in profiling sessions)
  const users = await db.query("SELECT * FROM users");
  res.json(users);
});

Sentry.setupExpressErrorHandler(app);
app.listen(3000);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles appearing in Sentry | Verify `@sentry/profiling-node` version exactly matches `@sentry/node` version (`npm ls @sentry/profiling-node`) |
| `Cannot find module '@sentry/profiling-node'` | Run `npm install @sentry/profiling-node` and confirm it's in `dependencies` (not `devDependencies`) |
| Native addon fails to load | Check you're on Node.js ≥18; check OS/arch is in the supported platforms table |
| Profiles not linked to spans | Confirm `profileLifecycle: "trace"` is set and `tracesSampleRate` > 0; both are required |
| High CPU usage | Lower `profileSessionSampleRate`; use `SENTRY_PROFILER_LOGGING_MODE=lazy` |
| Alpine/musl Linux binary error | Run `npm rebuild @sentry/profiling-node` after installing build tools (`apk add python3 make g++`) |
| Profiling works locally but not in Docker | Ensure `npm install --include=optional` runs in the Docker build; musl variant must be present |
| Flame graphs show minified names | Upload source maps via `authToken` in Sentry config; use `NODE_OPTIONS=--enable-source-maps` |
| Last ~60s of data lost on shutdown | Call `Sentry.profiler.stopProfiler()` in your SIGTERM/SIGINT handler before `process.exit()` |
| Bun or Deno profiling doesn't work | Native addon only supports Node.js — profiling is not available in Bun or Deno |
