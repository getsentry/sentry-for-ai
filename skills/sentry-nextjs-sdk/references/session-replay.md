# Session Replay — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥7.27.0+  
> `replayCanvasIntegration()`: requires ≥7.98.0+

> ⚠️ **Browser-only feature.** Add `replayIntegration()` **only** in `instrumentation-client.ts`. Never in `sentry.server.config.ts` or `sentry.edge.config.ts`.

---

## Setup

Session Replay is bundled in `@sentry/nextjs` — no separate package needed.

```typescript
// instrumentation-client.ts  ← client-side only
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample rates live at init level, NOT inside replayIntegration()
  replaysSessionSampleRate: 0.1,   // record 10% of all sessions from start
  replaysOnErrorSampleRate: 1.0,   // record 100% of sessions that hit an error

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,     // default: true
      blockAllMedia: true,   // default: true
    }),
  ],
});
```

> **Dev tip:** Set `replaysSessionSampleRate: 1.0` during development to capture every session.

### Where NOT to Add Replay

| Config file | Why |
|-------------|-----|
| `sentry.server.config.ts` | Server runtime — no DOM |
| `sentry.edge.config.ts` | Edge runtime — no DOM |
| `instrumentation.ts` (server section) | Server-side code |
| Any Route Handler or Server Action | Server-side code |

---

## Sample Rates

| Option | Type | Default | Behavior |
|--------|------|---------|----------|
| `replaysSessionSampleRate` | `number` (0–1) | `0` | Fraction of all sessions recorded continuously from start |
| `replaysOnErrorSampleRate` | `number` (0–1) | `0` | Fraction of sessions captured when an error occurs — flushes ~60s of buffer, then continues recording |

**Recommended production sample rates by traffic:**

| Daily Sessions | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|----------------|---------------------------|---------------------------|
| 100,000+ | `0.01` (1%) | `1.0` |
| 10,000–100,000 | `0.10` (10%) | `1.0` |
| Under 10,000 | `0.25` (25%) | `1.0` |

Always keep `replaysOnErrorSampleRate: 1.0` — error replays provide the most debugging value.

### How Sampling Works

1. When a session starts, `replaysSessionSampleRate` is checked.
   - **Sampled → Session Mode:** Recording is sent to Sentry in real-time chunks.
   - **Not sampled → Buffer Mode:** Last ~60 seconds are kept in memory only. Nothing is sent unless an error occurs.
2. If an error occurs in a buffered session, `replaysOnErrorSampleRate` is checked.
   - **Sampled:** The 60-second buffer plus all subsequent data is sent to Sentry.
   - **Not sampled:** Buffer is discarded; nothing is sent.

---

## Session Lifecycle

- **Starts:** When the SDK first loads/initializes.
- **Ends:** After **5 minutes of inactivity** OR after a **maximum of 60 minutes** total.
- **Tab close:** Ends the session immediately.
- **Page refreshes/navigations** within the same domain and tab are captured within the same session.

---

## `replayIntegration()` Options Reference

All options go inside `Sentry.replayIntegration({})`:

### General Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `stickySession` | `boolean` | `true` | Tracks a user across page refreshes. One tab = one session. |
| `mutationLimit` | `number` | `10000` | Max DOM mutations before recording stops (performance protection). |
| `mutationBreadcrumbLimit` | `number` | `750` | Threshold for sending a warning breadcrumb about large mutations. |
| `minReplayDuration` | `number` | `5000` ms | Min replay length before sending. Max: 15000. Only applies to session sampling. |
| `maxReplayDuration` | `number` | `3600000` ms | Maximum replay length. Capped at 1 hour. |
| `workerUrl` | `string` | `undefined` | URL to a self-hosted compression worker (avoids inline worker in bundle). |
| `beforeAddRecordingEvent` | `(event) => event \| null` | identity fn | Hook to filter/modify recording events before they leave the browser. |
| `beforeErrorSampling` | `(event) => boolean` | `() => true` | Called in buffer mode only. Return `false` to prevent this error from triggering upload. |
| `slowClickIgnoreSelectors` | `string[]` | `[]` | CSS selectors exempt from slow/rage click detection. |

### Network Capture Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `networkDetailAllowUrls` | `(string \| RegExp)[]` | `[]` | URLs for which to capture request/response headers and bodies. |
| `networkDetailDenyUrls` | `(string \| RegExp)[]` | `[]` | URLs to never capture details for. Takes precedence over allow list. |
| `networkCaptureBodies` | `boolean` | `true` | Whether to capture request/response bodies for allowed URLs. |
| `networkRequestHeaders` | `string[]` | `[]` | Additional request headers to capture (beyond Content-Type, Content-Length, Accept). |
| `networkResponseHeaders` | `string[]` | `[]` | Additional response headers to capture. |

---

## Privacy Masking

**All masking/blocking happens on the client before any data is sent to Sentry's servers.**

### Default Privacy Behavior

| Setting | Default | Effect |
|---------|---------|--------|
| `maskAllText` | `true` | Every text character replaced with `*` |
| `maskAllInputs` | `true` | All `<input>` values masked |
| `blockAllMedia` | `true` | `img`, `svg`, `video`, `object`, `picture`, `embed`, `map`, `audio` replaced with same-size placeholder |

### Privacy Options in `replayIntegration({})`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mask` | `string[]` | `['.sentry-mask', '[data-sentry-mask]']` | Additional selectors to mask. |
| `maskAllText` | `boolean` | `true` | Mask all text via `maskFn`. |
| `maskAllInputs` | `boolean` | `true` | Mask all input values. |
| `maskFn` | `(text: string) => string` | `(s) => '*'.repeat(s.length)` | Custom masking function. |
| `block` | `string[]` | `['.sentry-block', '[data-sentry-block]']` | Additional selectors to block (replaced with a blank same-size box). |
| `blockAllMedia` | `boolean` | `true` | Block all media elements. |
| `ignore` | `string[]` | `['.sentry-ignore', '[data-sentry-ignore]']` | Input events on matching elements are ignored entirely. |
| `unblock` | `string[]` | `[]` | Selectors to un-block from `blockAllMedia`. |
| `unmask` | `string[]` | `[]` | Selectors to un-mask from `maskAllText`. |

### Three Privacy Mechanisms Compared

| Mechanism | What It Does | HTML Attribute | CSS Class |
|-----------|--------------|----------------|-----------|
| **Mask** | Replaces text chars with `*` | `data-sentry-mask` | `sentry-mask` |
| **Block** | Replaces entire element with blank box | `data-sentry-block` | `sentry-block` |
| **Ignore** | Suppresses input events on the element | `data-sentry-ignore` | `sentry-ignore` |

### Code Examples

**Opt-out of all masking (for non-PII sites):**
```typescript
Sentry.replayIntegration({
  // Only use if your site has NO sensitive data
  maskAllText: false,
  blockAllMedia: false,
});
```

**Custom masking selectors:**
```typescript
Sentry.replayIntegration({
  mask: [".sensitive-field", "[data-pii]"],
  unmask: [".safe-to-show"],
  block: [".user-avatar", "#credit-card-form"],
  unblock: [".public-image"],
  ignore: ["#search-input"],
});
```

**HTML-level masking (no JS config needed):**
```html
<!-- Block this form entirely -->
<form data-sentry-block>...</form>

<!-- Mask text in this element -->
<div class="sentry-mask">Sensitive content</div>

<!-- Ignore events on this input -->
<input class="sentry-ignore" type="text" />
```

> ⚠️ **v8 Breaking Change:** In SDK v8+, `unblock` and `unmask` no longer automatically add `sentry-unblock`/`sentry-unmask` class selectors. To restore v7 behavior:
> ```typescript
> Sentry.replayIntegration({
>   unblock: [".sentry-unblock, [data-sentry-unblock]"],
>   unmask: [".sentry-unmask, [data-sentry-unmask]"],
> });
> ```

---

## Network Request/Response Capture

By default, Replay captures only: URL, body size, method, status code. SDK ≥7.50.0 required for headers/bodies.

```typescript
Sentry.replayIntegration({
  // Capture details for all same-origin requests
  networkDetailAllowUrls: [
    window.location.origin,
    "api.example.com",
    /^https:\/\/api\.example\.com/,
  ],

  // Exclude PII-heavy endpoints
  networkDetailDenyUrls: ["/api/auth", /\/users\/\d+\/private/],

  networkCaptureBodies: true,
  networkRequestHeaders: ["Cache-Control", "X-Request-ID"],
  networkResponseHeaders: ["X-RateLimit-Remaining"],
});
```

**Limits:**
- Bodies truncated to **150k characters** max.
- Only text-based bodies captured: JSON, XML, FormData. Binary/media excluded.
- Sentry applies server-side PII scrubbing (credit cards, SSNs, private keys) on ingested data.

---

## Tree-Shaking Replay out of Server Bundles

**Critical for Next.js:** Session Replay is browser-only. Prevent it from being bundled into server-side or edge bundles:

```javascript
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  webpack: {
    treeshake: {
      removeDebugLogging: true,        // Strip SDK internal debug logs
      excludeReplayIframe: false,      // Remove iframe content capture if unused
      excludeReplayShadowDOM: false,   // Remove shadow DOM capture if unused
      excludeReplayCompressionWorker: false, // Remove if using custom workerUrl
    },
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `removeDebugLogging` | `boolean` | `false` | Strips SDK internal `console.log` calls. Safe to enable in production. |
| `removeTracing` | `boolean` | `false` | Removes ALL tracing code. Never call `Sentry.startSpan()` etc. if enabled. |
| `excludeReplayIframe` | `boolean` | `false` | Removes iframe content capture from Replay bundle. |
| `excludeReplayShadowDOM` | `boolean` | `false` | Removes shadow DOM capture from Replay bundle. |
| `excludeReplayCompressionWorker` | `boolean` | `false` | Removes built-in compression worker. Requires providing `workerUrl`. |

> ⚠️ Tree-shaking only works with **webpack** builds. **Turbopack is not supported.**

---

## Canvas Recording

> ⚠️ **There is currently NO PII scrubbing in canvas recordings.** Use with caution.

Canvas recording is opt-in and requires SDK ≥7.98.0:

```typescript
// instrumentation-client.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration(), // adds canvas support
  ],
});
```

**For WebGL/3D canvases** (manual snapshot mode):
```typescript
Sentry.replayCanvasIntegration({
  enableManualSnapshot: true,
});

function paint() {
  // ... your rendering commands ...

  const canvasEl = document.querySelector<HTMLCanvasElement>("#my-canvas");
  Sentry.getClient()
    ?.getIntegrationByName("ReplayCanvas")
    // @ts-ignore
    ?.snapshot(canvasEl);
}
```

---

## Lazy Loading Replay

To reduce initial bundle size, add `replayIntegration()` dynamically after the page loads:

```typescript
// instrumentation-client.ts

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [], // Replay NOT included here
});

// Later — after route change, user interaction, or feature flag check
import("@sentry/nextjs").then((lazySentry) => {
  Sentry.addIntegration(lazySentry.replayIntegration());
});
```

---

## Programmatic Replay Control

```typescript
const replay = Sentry.getReplay();

replay.start();           // Start in session mode (sends continuously)
replay.startBuffering();  // Start in buffer mode (only sends on error)
await replay.stop();      // End the current session
await replay.flush();     // Force upload any pending buffered data
```

Use cases:
- **User-based sampling:** Check authentication, then call `flush()` for premium users.
- **Route-based sampling:** Call `start()` only on high-value pages.
- **Error filtering:** Use `beforeErrorSampling` to prevent certain error types from triggering upload:

```typescript
Sentry.replayIntegration({
  beforeErrorSampling: (event) => {
    // Prevent console.error from triggering replay upload
    if (event.logger === "console") return false;
    return true;
  },
});
```

---

## Custom Compression Worker

Host the compression worker yourself to reduce bundle size and comply with strict CSP policies:

```typescript
// Step 1: Download worker.min.js from:
// https://github.com/getsentry/sentry-javascript/blob/develop/packages/replay-worker/examples/worker.min.js
// Host at /public/worker.min.js → served at /worker.min.js

// Step 2: Configure
Sentry.replayIntegration({
  workerUrl: "/assets/worker.min.js",
});
```

```javascript
// next.config.js — remove built-in worker from bundle
module.exports = withSentryConfig(nextConfig, {
  webpack: {
    treeshake: {
      excludeReplayCompressionWorker: true, // since you're hosting your own
    },
  },
});
```

---

## Content Security Policy (CSP)

Session Replay uses a Web Worker for off-thread compression. Required CSP directives:

```
worker-src 'self' blob:
child-src 'self' blob:   ← Required for Safari ≤ 15.4
```

Also add `sentry.io` to your CORS policy so the Sentry replay iframe can fetch CSS, fonts, and images.

**For Next.js, set headers in `next.config.js`:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};
```

---

## Performance Impact

- **Bundle size:** ~**50KB gzipped** added to browser bundle.
- **Compression:** Off-thread in a Web Worker — does not block the main thread.
- **Mutation protection:** Recording auto-stops if DOM mutations exceed `mutationLimit` (default 10,000).
- **Large lists:** Virtualize or paginate long lists to avoid mutation limit triggers.

**Rage/slow click false positives** (Download/Print buttons that don't mutate DOM):
```typescript
Sentry.replayIntegration({
  slowClickIgnoreSelectors: [
    ".download-btn",
    'a[label*="download" i]',
    "#print-button",
  ],
});
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Replay data missing | CSP blocking blob: workers | Add `worker-src 'self' blob:` |
| CSS/fonts missing in replay | CORS blocking Sentry iframe | Add `sentry.io` to CORS policy |
| Replay not recording | Added to wrong config file | Move to `instrumentation-client.ts` only |
| Click positions misaligned | Custom variable-width fonts | Add `Access-Control-Allow-Origin` headers for fonts |
| Too many rage clicks | Non-mutating buttons (Download, Print) | Use `slowClickIgnoreSelectors` |
| Replay stops early | Too many DOM mutations | Virtualize lists; adjust `mutationLimit` |
| `captureConsoleIntegration` triggers replays | `console.error` counted as error | Use `beforeErrorSampling` to return `false` for console events |
| iframe content not masked | `srcdoc` attribute bypasses masking | Add `block: ["iframe"]` to block iframes entirely |
| Canvas not recording | Not using `replayCanvasIntegration()` | Add `Sentry.replayCanvasIntegration()` alongside `replayIntegration()` |
| Build error about browser globals in server | Replay leaking into server bundle | Use tree-shaking options in `withSentryConfig` |
| `replayCanvasIntegration` not available | SDK version too old | Upgrade to ≥7.98.0 |
