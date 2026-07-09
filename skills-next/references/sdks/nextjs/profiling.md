# Profiling — Sentry Next.js SDK

> Browser profiling: `@sentry/nextjs` ≥10.27.0 (Beta)  
> Node.js profiling: `@sentry/profiling-node` — must match `@sentry/nextjs` version exactly

---

## Overview

The Sentry Next.js SDK supports profiling in **two independent runtimes**:

| Runtime | Integration | What it captures |
|---|---|---|
| **Browser** | `browserProfilingIntegration()` | JS call stacks in Chrome/Edge (Chromium only) at 100Hz |
| **Node.js server** | `nodeProfilingIntegration()` | V8 CPU call stacks for API routes, RSC, server actions |

Both are **opt-in** and **independent from each other**. Each attaches to spans and requires tracing to be enabled.

---

## How Profiling Relates to Tracing

Profiles attach to **spans** — they are not independent events:

1. `tracesSampleRate` / `tracesSampler` decides whether a request is traced at all
2. `profileSessionSampleRate` decides whether the **session** opts into profiling
3. A profile is only collected when **both** sampling decisions are "yes"

```
tracesSampleRate: 0.1   + profileSessionSampleRate: 0.5
→ ~5% of requests will have both a trace AND a profile attached
```

In `trace` lifecycle mode, you can drill from a slow span in the Performance UI directly into a flame graph:

```
Trace: "POST /api/checkout" (850ms)
  ├── "validateCart" (45ms) → [Profile attached] → shows db driver hot paths
  ├── "processPayment" (620ms)
  └── "updateInventory" (185ms) → [Profile attached] → shows ORM overhead
```

---

## Browser Profiling

### Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome / Chromium | ✅ | Primary support |
| Edge (Chromium) | ✅ | Same engine as Chrome |
| Firefox | ❌ | Does not implement JS Self-Profiling API |
| Safari / iOS Safari | ❌ | Does not implement JS Self-Profiling API |

> ⚠️ **Sampling bias:** Profile data comes **only** from Chromium users. In unsupported browsers, `browserProfilingIntegration()` silently no-ops with no errors and no overhead.

### Required: `Document-Policy` Header

The JS Self-Profiling API is gated behind a required response header. Without it, profiling silently fails even in Chromium:

```
Document-Policy: js-profiling
```

**Next.js (`next.config.ts`):**
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Document-Policy", value: "js-profiling" }],
      },
    ];
  },
};
```

**Vercel (`vercel.json`):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "Document-Policy", "value": "js-profiling" }]
    }
  ]
}
```

**Netlify (`netlify.toml`):**
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Document-Policy = "js-profiling"
```

**Nginx:**
```nginx
add_header Document-Policy "js-profiling";
```

> ⚠️ Static hosting that doesn't support custom headers (some CDNs, GitHub Pages) will prevent browser profiling entirely.

### SDK Configuration — Trace Mode (Recommended)

Profiles auto-attach to all sampled spans with no additional code:

```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(), // Must come BEFORE browserProfilingIntegration
    Sentry.browserProfilingIntegration(),
  ],

  tracesSampleRate: 1.0,

  // Session-level sampling: decision made once at page load
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // "trace" = profiles auto-attach to every sampled span
  profileLifecycle: "trace",
});
```

### SDK Configuration — Manual Mode

Profile specific flows or code paths explicitly:

```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  // No profileLifecycle → defaults to manual mode
});

// Explicit start/stop around critical code:
Sentry.uiProfiler.startProfiler();
await heavyComputation();
Sentry.uiProfiler.stopProfiler();
```

---

## Node.js Profiling

### Installation

```bash
npm install @sentry/profiling-node --save
```

> ⚠️ **Version pinning is required.** `@sentry/profiling-node` must exactly match your `@sentry/nextjs` version. Mismatched versions cause silent failures.

```bash
# Both should be the same version
npm install @sentry/nextjs@latest @sentry/profiling-node@latest
```

### SDK Configuration

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(), // V8 CpuProfiler native add-on
  ],

  tracesSampleRate: 1.0,

  // Session-level: decision made once at process startup
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  profileLifecycle: "trace", // auto-attach profiles to spans
});
```

> ⚠️ **Do NOT add `nodeProfilingIntegration` to `sentry.edge.config.ts`.** The Edge runtime does not support native add-ons.

### Manual Mode (Node.js)

```typescript
// sentry.server.config.ts
Sentry.init({
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: 1.0,
  profileLifecycle: "manual",
});

// Explicit start/stop:
Sentry.profiler.startProfiler();
await processHeavyJob();
Sentry.profiler.stopProfiler();
```

### Supported Platforms

Precompiled native binaries are available for:

| OS | Architecture | Node.js |
|---|---|---|
| macOS | x64 | 18–24 |
| Linux (glibc) | x64 | 18–24 |
| Linux (musl/Alpine) | x64, ARM64 | 18–24 |
| Linux | ARM64 | 18–24 |
| Windows | x64 | 18–24 |

> ⚠️ **Deno and Bun are not supported.** The native add-on only works in Node.js.

### Environment Variables

```bash
# Override binary path (for custom builds)
SENTRY_PROFILER_BINARY_PATH=/custom/path/profiler.node

# Override binary directory
SENTRY_PROFILER_BINARY_DIR=/path/to/dir

# Profiler logging mode:
# "eager" (default) — faster startProfiler calls, slightly more CPU overhead
# "lazy" — lower CPU overhead, slightly slower startProfiler
SENTRY_PROFILER_LOGGING_MODE=lazy node server.js
```

---

## Configuration Parameters Reference

| Parameter | Applies to | Description |
|-----------|-----------|-------------|
| `profileSessionSampleRate` | Browser + Node.js | 0.0–1.0; session-level sampling decision made once (at page load for browser, process start for server) |
| `profileLifecycle` | Browser + Node.js | `"trace"` = auto-attach to spans; omit for manual mode |
| `browserProfilingIntegration()` | Browser only | Enables JS Self-Profiling API (Chromium only); must come after `browserTracingIntegration()` |
| `nodeProfilingIntegration()` | Node.js only | Enables V8 CpuProfiler; must be in `integrations` array in `sentry.server.config.ts` |

### `profileSessionSampleRate` Semantics

The profiling sampling decision is made **once per session**:
- **Browser:** at page load (`instrumentation-client.ts` init)
- **Server:** at process startup (`sentry.server.config.ts` init)

A "profiling session" either opts in or opts out for its entire lifetime. Within a profiling session, every traced span gets a profile attached (in `trace` mode).

### `profileLifecycle` Modes Comparison

| Mode | Trigger | Best for |
|------|---------|----------|
| `"trace"` | Auto-attached to every sampled span | Broad production coverage; no code changes |
| `"manual"` (default) | `startProfiler()` / `stopProfiler()` | Specific high-value flows (checkout, heavy renders) |

---

## Production vs Development Recommendations

```typescript
// Browser (instrumentation-client.ts)
Sentry.init({
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileLifecycle: "trace",
});

// Server (sentry.server.config.ts)
Sentry.init({
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileLifecycle: "trace",
});
```

**Performance impact notes:**

- **Browser (100Hz sampling):** Low overhead; runs unobtrusively in production. Chrome DevTools profiles at 1000Hz — use Sentry profiling for production coverage, DevTools for local deep-dives.
- **Node.js (V8 CpuProfiler):** The native profiler adds CPU overhead. Test with realistic load before deploying `profileSessionSampleRate: 1.0` to high-traffic production.

> "For high-throughput environments, we recommend testing prior to deployment to ensure that your service's performance characteristics maintain expectations." — Sentry docs

### Chrome DevTools Conflict

When `browserProfilingIntegration` is active, Chrome DevTools profiler shows Sentry's overhead mixed into rendering work. Disable the integration when doing local DevTools profiling sessions.

---

## Complete Setup Example

```typescript
// instrumentation-client.ts (Browser)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileSessionSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileLifecycle: "trace",
});
```

```typescript
// sentry.server.config.ts (Node.js)
import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileSessionSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  profileLifecycle: "trace",
});
```

```typescript
// sentry.edge.config.ts (Edge — NO profiling)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // nodeProfilingIntegration NOT added — Edge runtime doesn't support native add-ons
});
```

```typescript
// next.config.ts — required Document-Policy header for browser profiling
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Document-Policy", value: "js-profiling" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No browser profiles appearing in Sentry | Verify `Document-Policy: js-profiling` is present on document responses (check Network tab in DevTools) |
| Browser profiles only from some users | Expected — only Chromium users are profiled; Firefox/Safari silently no-op |
| Chrome DevTools shows inflated rendering times | Disable `browserProfilingIntegration()` during local DevTools profiling sessions |
| `profileSessionSampleRate` has no effect (browser) | Ensure `browserProfilingIntegration()` is listed **after** `browserTracingIntegration()` in `integrations` |
| No server profiles appearing | Verify `@sentry/profiling-node` version exactly matches `@sentry/nextjs` version |
| `nodeProfilingIntegration` import error | Check `@sentry/profiling-node` is installed and versions match; don't import it in `sentry.edge.config.ts` |
| Profiles not linked to spans | Confirm `profileLifecycle: "trace"` is set and `tracesSampleRate` > 0; both must be set |
| High CPU usage on server | Lower `profileSessionSampleRate` to 0.1 or 0.05; use `SENTRY_PROFILER_LOGGING_MODE=lazy` |
| Native add-on fails to load (Alpine/musl Linux) | Ensure the `@sentry/profiling-node` version supports your OS/arch — check the supported platforms table |
| Flame graphs show minified names | Upload source maps via `withSentryConfig` in `next.config.ts` with `authToken` and project credentials |
| Profiles on static host not working | Browser profiling requires the `Document-Policy` header — verify your host supports custom response headers |
