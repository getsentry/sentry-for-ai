# Browser Profiling — Sentry React SDK

> Minimum SDK: `@sentry/react` ≥10.27.0+ (Beta)

> ⚠️ **Beta status** — breaking changes may occur. Browser support is limited to Chromium-based browsers only.

---

## What Browser Profiling Captures

Sentry's browser profiler uses the [JS Self-Profiling API](https://wicg.github.io/js-self-profiling/) to capture:

- **JavaScript call stacks** — function names and source file locations (deobfuscated via source maps)
- **CPU time per function** — how much time is spent in each function
- **Flame graphs** — aggregated across real user sessions, not just local dev
- **Linked profiles** — every profile is attached to a trace, enabling navigation from span → flame graph in the Sentry UI

Sampling rate: **100Hz (10ms intervals)** — contrast with Chrome DevTools at 1000Hz (1ms). Less granular, but runs unobtrusively in production.

---

## Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome / Chromium | ✅ Yes | Primary support target |
| Edge (Chromium) | ✅ Yes | Same engine as Chrome |
| Firefox | ❌ No | Does not implement JS Self-Profiling API |
| Safari / iOS Safari | ❌ No | Does not implement JS Self-Profiling API |

> ⚠️ **Sampling bias:** Profile data is collected **only** from Chromium users. Firefox and Safari sessions are silently not profiled. Consider this when drawing performance conclusions.

In unsupported browsers, `browserProfilingIntegration()` **silently no-ops** — no errors thrown, no overhead.

---

## Required HTTP Header

Every document response serving your React app **must** include this header or profiling silently fails:

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

**Nginx (`nginx.conf`):**
```nginx
server {
  location / {
    add_header Document-Policy "js-profiling";
  }
}
```

**Apache (`.htaccess`):**
```apache
<IfModule mod_headers.c>
  Header set Document-Policy "js-profiling"
</IfModule>
```

**AWS CloudFront (Viewer Response function):**
```javascript
function handler(event) {
  var response = event.response;
  response.headers["document-policy"] = { value: "js-profiling" };
  return response;
}
```

**ASP.NET Core (`Program.cs`):**
```csharp
app.Use(async (context, next) => {
  context.Response.OnStarting(() => {
    context.Response.Headers.Append("Document-Policy", "js-profiling");
    return Task.CompletedTask;
  });
  await next();
});
```

> ⚠️ **Static hosting that disallows custom headers** (some CDNs, GitHub Pages) will prevent profiling entirely.

---

## Setup

### Install

```bash
npm install @sentry/react --save
```

### SDK Initialization — Trace Mode (recommended)

Trace mode automatically attaches profiles to all sampled spans. Use this for general production coverage:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(), // Must come BEFORE browserProfilingIntegration
    Sentry.browserProfilingIntegration(),
  ],

  // Tracing — profiles are only collected when a transaction is also sampled
  tracesSampleRate: 1.0,

  // Profiling — fraction of sessions to profile
  profileSessionSampleRate: 1.0,

  // "trace" = automatically attach profiles to all active spans
  profileLifecycle: "trace",
});
```

### SDK Initialization — Manual Mode

Manual mode lets you profile specific user flows or code paths explicitly:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],

  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  // Omit profileLifecycle for manual mode (default)
});

// Later, wrap specific operations:
Sentry.uiProfiler.startProfiler();
// ... user flow or expensive computation ...
Sentry.uiProfiler.stopProfiler();
```

---

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tracesSampleRate` | `number` | — | 0.0–1.0 — fraction of transactions traced; profiles only attach to traced transactions |
| `profileSessionSampleRate` | `number` | — | 0.0–1.0 — session-level sampling decision for profiling |
| `profileLifecycle` | `"trace"` | — | Set to `"trace"` for Trace mode; omit for Manual mode |
| `tracePropagationTargets` | `(string\|RegExp)[]` | — | URLs where distributed trace headers are injected |

---

## How Profiles Attach to Traces

Profiles are **not independent** from tracing — they attach to transactions:

1. `tracesSampleRate` determines whether a transaction is traced at all
2. `profileSessionSampleRate` determines whether the **session** opts into profiling
3. A profile is only collected when **both** sampling decisions are yes

**Compound sampling example:**
- `tracesSampleRate: 0.5` + `profileSessionSampleRate: 0.5` → ~25% of sessions produce profiles
- `tracesSampleRate: 1.0` + `profileSessionSampleRate: 1.0` → 100% (development/testing only)

In the Sentry UI, open a trace and click **"Profile"** to view the flame graph for that transaction.

---

## Profiling Modes Comparison

| Mode | How to trigger | Best for |
|------|---------------|----------|
| **Trace** (`profileLifecycle: "trace"`) | Auto-attached to every sampled span | Broad production coverage |
| **Manual** (default) | `uiProfiler.startProfiler()` / `stopProfiler()` | Specific high-value flows (checkout, render) |

---

## Sentry Profiling vs Chrome DevTools

| Aspect | Sentry Browser Profiling | Chrome DevTools |
|--------|--------------------------|-----------------|
| Environment | Production (real users) | Local development only |
| Sampling rate | 100Hz (10ms) | 1000Hz (1ms) |
| Stack traces | Deobfuscated via source maps | Minified names unless local |
| Data scope | Aggregated across all sessions | Single local session |
| Browser coverage | Chromium only | Any browser with DevTools |
| Overhead | Low (production-safe) | Higher — not production-safe |

> ⚠️ **Chrome DevTools conflict:** When `browserProfilingIntegration` is active, Chrome DevTools profiles incorrectly show profiling overhead mixed into rendering work. Disable the integration when doing local DevTools profiling sessions.

---

## Source Maps — Critical for Useful Profiles

Without source maps, flame graphs show **minified function names** like `e`, `t`, `r` — effectively unreadable.

With source maps uploaded to Sentry, flame graphs show **original function names** and file paths from your source code.

**Setup source maps with the Vite plugin** (handles both source map upload and component annotation):

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: "hidden", // Generate maps but don't serve them publicly
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ["./**/*.map"],
      },
    }),
  ],
});
```

See the main SKILL.md **Source Maps Setup** section for Webpack/CRA configuration.

---

## Limitations

| Limitation | Detail |
|-----------|--------|
| **Beta status** | API is experimental; breaking changes possible between releases |
| **Chromium only** | No Firefox, no Safari, no iOS — data is biased |
| **Requires header** | `Document-Policy: js-profiling` must be served; some hosts don't allow custom headers |
| **Compound sampling** | Profiles only captured when transaction is also sampled |
| **10ms granularity** | Very short functions (<10ms) may not appear in profiles |
| **Chrome DevTools conflict** | Must disable integration when doing local DevTools profiling |
| **Not on CDN** | `browserProfilingIntegration` is not available via the CDN loader bundle |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles appearing in Sentry | Verify `Document-Policy: js-profiling` header is present on document responses |
| Profiles exist but show minified names | Source maps not uploaded — configure `sentryVitePlugin` or `sentryWebpackPlugin` |
| Profiling data only from some users | Expected — only Chromium users are profiled; Firefox/Safari silently no-op |
| Chrome DevTools shows inflated rendering times | Disable `browserProfilingIntegration` during local DevTools sessions |
| `profileSessionSampleRate` has no effect | Ensure `browserProfilingIntegration()` is listed after `browserTracingIntegration()` in the integrations array |
| Profiling on static host not working | Verify your host supports custom response headers; GitHub Pages and some CDNs do not |
| Profiles not linked to spans in Trace mode | Confirm `profileLifecycle: "trace"` is set and `tracesSampleRate` > 0 |
