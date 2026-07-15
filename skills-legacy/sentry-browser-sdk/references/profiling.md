# Browser Profiling — Sentry Browser SDK

> Minimum SDK: `@sentry/browser` ≥10.27.0 (Beta)

> ⚠️ **Beta status** — breaking changes may occur. Browser support is limited to **Chromium-based browsers only** (Chrome, Edge). Firefox and Safari are not supported.

---

## What Browser Profiling Captures

Sentry's browser profiler uses the [JS Self-Profiling API](https://wicg.github.io/js-self-profiling/) to capture:

- **JavaScript call stacks** — function names and source file locations (deobfuscated via source maps)
- **CPU time per function** — how much time is spent in each function
- **Flame graphs** — aggregated across real user sessions, not just local dev
- **Linked profiles** — every profile is attached to a trace, enabling navigation from span → flame graph in Sentry

Sampling rate: **100Hz (10ms intervals)** — runs unobtrusively in production.

---

## Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome / Chromium | ✅ Yes | Primary support target |
| Edge (Chromium) | ✅ Yes | Same engine as Chrome |
| Firefox | ❌ No | JS Self-Profiling API not implemented |
| Safari / iOS Safari | ❌ No | JS Self-Profiling API not implemented |

> ⚠️ **Sampling bias:** Profile data is collected **only** from Chromium users. Firefox and Safari sessions are silently excluded — no error is thrown, no overhead is added.

---

## Required HTTP Header

Every document response **must** include this header or profiling silently fails:

```
Document-Policy: js-profiling
```

Without this header, the JS Self-Profiling API is blocked by the browser and no profiles are collected.

### Platform-Specific Header Setup

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

**Netlify (`_headers` file):**
```
/*
  Document-Policy: js-profiling
```

**Express / Node.js:**
```javascript
app.use((req, res, next) => {
  res.set("Document-Policy", "js-profiling");
  next();
});
```

**Nginx:**
```nginx
add_header Document-Policy "js-profiling";
```

---

## Basic Setup

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0, // Profile 100% of sessions (lower in production)
});
```

> Profiling requires tracing to be active. `browserTracingIntegration()` and a `tracesSampleRate` > 0 are both required.

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profileSessionSampleRate` | `number` (0–1) | — | Fraction of sessions to profile. Evaluated **once** per page load. |
| `profileLifecycle` | `'manual'` \| `'trace'` | `'manual'` | Controls when profiling starts and stops (see [Profiling Modes](#profiling-modes)). |

### `profilesSampleRate` vs `profileSessionSampleRate`

| Option | SDK Version | Description |
|--------|-------------|-------------|
| `profilesSampleRate` | Legacy (< 10.27.0) | Transaction-based — tied to individual transaction sampling. **Deprecated.** |
| `profileSessionSampleRate` | Current (≥ 10.27.0) | Session-based — evaluated once per page load. **Use this for all new setups.** |

---

## Profiling Modes

### Trace Mode (Automatic)

Profiler starts and stops automatically in sync with every active root span (trace). Recommended for general-purpose production profiling.

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 0.1, // Profile 10% of sessions
  profileLifecycle: "trace",     // Profile automatically with each trace
});
```

### Manual Mode (Default)

Start and stop the profiler explicitly around specific code you want to measure.

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "manual", // default
});

// Somewhere in your application
Sentry.uiProfiler.startProfiler();

doExpensiveWork();
renderComplexChart();

Sentry.uiProfiler.stopProfiler();
```

Use manual mode when you know exactly which operations to measure and want to avoid profiling overhead during unrelated work.

---

## Production Sampling Strategy

Profiling adds CPU overhead. Use conservative rates in production:

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 0.2,           // Sample 20% of traces
  profileSessionSampleRate: 0.1,   // Profile 10% of sessions
  profileLifecycle: "trace",
});
```

`profileSessionSampleRate` is evaluated **once per session** (page load), not per trace. A session either profiles all its traces or none of them.

---

## Best Practices

- **Start with `profileLifecycle: "trace"`** — automatic profiling with traces requires no extra instrumentation
- **Set `profileSessionSampleRate` to 0.1–0.2** in production to limit overhead
- **Upload source maps** — profiling data shows minified names without source maps; the flame graph is much more useful with them
- **Use manual mode** when investigating a specific known bottleneck (e.g., a slow chart render or complex animation)
- **Combine with tracing** — profiles are always linked to a trace, so you can navigate from a slow span to its flame graph
- **Don't profile static hosts without header support** — GitHub Pages and some CDNs cannot serve custom HTTP response headers; profiling will silently not work

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| Chromium-only | Firefox and Safari do not implement the JS Self-Profiling API. Profile data represents only Chromium users. |
| `Document-Policy` header required | Every served document must include the header. Static hosts that can't set custom headers cannot enable profiling. |
| Chrome DevTools conflict | With `browserProfilingIntegration` active, Chrome DevTools may display SDK activity as "profiling overhead" in the Performance panel. This is cosmetic. |
| Beta status | The API may change between minor releases. |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No profiles in Sentry | Missing `Document-Policy: js-profiling` header | Add the header to all document responses |
| No profiles in Sentry | `browserTracingIntegration()` not added | Profiling requires tracing — add it and set `tracesSampleRate > 0` |
| No profiles in Sentry | `profileSessionSampleRate` not set | Set it (e.g., `1.0` for dev, `0.1` for production) |
| Profiles appear with minified names | Source maps not uploaded | Upload source maps to Sentry via the build plugin |
| No profiles for Firefox/Safari users | Expected — those browsers don't support the API | No fix needed; this is by design |
| Chrome DevTools shows extra overhead | False positive from profiling integration | Expected; ignore in DevTools, check Sentry instead |
| `uiProfiler.startProfiler` is undefined | SDK version < 10.27.0 or wrong `profileLifecycle` | Upgrade SDK; `uiProfiler` is only available in manual mode |
