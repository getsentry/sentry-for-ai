# Session Replay — Sentry React SDK

> Minimum SDK: `@sentry/react` ≥7.27.0+  
> `replayCanvasIntegration()`: requires `@sentry/react` ≥7.98.0+

> ⚠️ **Browser-only feature.** Never add `replayIntegration()` to SSR entry points, Node.js server code, or web workers. Only add it where browser APIs are available.

---

## Setup

Session Replay is bundled in `@sentry/react` — no separate package needed.

```typescript
// src/instrument.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

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

### When NOT to Add Replay

| Context | Reason |
|---------|--------|
| Node.js / Express / Next.js server | No DOM — DOM recording APIs don't exist |
| Web Workers / Service Workers | No DOM access |
| Next.js `_document.tsx` or `instrumentation.ts` (server) | Server-side code — use client-only init |
| Electron main process | Only the renderer process is appropriate |
| Browser extensions | Not a supported use case |
| CI/build pipelines | No user sessions to record |

For **Next.js App Router**, add replay only in `instrumentation-client.ts` or `sentry.client.config.ts` — never in server instrumentation.

---

## Sample Rates

`replaysSessionSampleRate` and `replaysOnErrorSampleRate` are set on `Sentry.init()`, not on the integration itself.

| Option | Type | Default | Behavior |
|--------|------|---------|----------|
| `replaysSessionSampleRate` | `number` (0–1) | `0` | Fraction of all sessions recorded continuously from start |
| `replaysOnErrorSampleRate` | `number` (0–1) | `0` | Fraction of sessions captured when an error occurs — flushes ~60s of buffer, then continues recording |

### How Session and Error Sampling Interact

```
Session starts
      │
      ▼
replaysSessionSampleRate > 0?
      │
      ├─ YES → Roll dice against replaysSessionSampleRate
      │           ├─ WIN  → Record continuously (session mode) — streamed in real-time chunks
      │           └─ LOSE → Buffer last 60s in memory
      │
      └─ NO  → Always buffer last 60s in memory
                    │
                    ▼
             Error occurs?
                    │
                    ├─ YES → Roll dice against replaysOnErrorSampleRate
                    │           ├─ WIN  → Upload 60s buffer + continue recording
                    │           └─ LOSE → Discard buffer, nothing sent
                    │
                    └─ NO  → Buffer discarded at session end
```

### Recommended Strategies

| Strategy | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` | Use when |
|----------|--------------------------|--------------------------|----------|
| **Errors-only** | `0` | `1.0` | Privacy-first; capture only on problems |
| **Balanced** | `0.1` | `1.0` | Most production apps |
| **Full** | `1.0` | `1.0` | Development or low-traffic apps |
| **High-traffic** | `0.01` | `1.0` | 100k+ sessions/day |

**Errors-only** (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`) is the most common production choice: near-zero overhead during normal operation, full context when something breaks.

```typescript
// Errors-only setup:
Sentry.init({
  dsn: "...",
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
```

---

## `replayIntegration()` — All Constructor Options

```typescript
Sentry.replayIntegration({
  // ── SESSION MANAGEMENT ─────────────────────────────────────────
  stickySession: true,              // persist session across page refreshes
  minReplayDuration: 5000,          // min ms before sending (max: 15000)
  maxReplayDuration: 3600000,       // max replay length (1 hour hard cap)

  // ── PRIVACY / MASKING ──────────────────────────────────────────
  maskAllText: true,                // replace all text with ***
  maskAllInputs: true,              // replace all input values with ***
  blockAllMedia: true,              // replace media elements with placeholder
  mask: ['.sentry-mask', '[data-sentry-mask]'],
  unmask: [],
  block: ['.sentry-block', '[data-sentry-block]'],
  unblock: [],
  ignore: ['.sentry-ignore', '[data-sentry-ignore]'],
  maskFn: (text) => '*'.repeat(text.length),

  // ── NETWORK CAPTURE ────────────────────────────────────────────
  networkDetailAllowUrls: [],       // (string|RegExp)[] — enable body/header capture
  networkDetailDenyUrls: [],        // (string|RegExp)[] — override allowlist
  networkCaptureBodies: true,       // capture req/res bodies for allowed URLs
  networkRequestHeaders: [],        // extra request headers to capture
  networkResponseHeaders: [],       // extra response headers to capture

  // ── PERFORMANCE / DOM PROTECTION ──────────────────────────────
  mutationLimit: 10000,             // stop recording after N mutations
  mutationBreadcrumbLimit: 750,     // emit warning breadcrumb after N mutations
  slowClickIgnoreSelectors: [],     // suppress dead/rage click detection here

  // ── ADVANCED ───────────────────────────────────────────────────
  beforeAddRecordingEvent: (event) => event,  // filter/modify events
  beforeErrorSampling: (event) => true,       // control which errors trigger replay
  useCompression: true,             // compress data in Web Worker
  workerUrl: undefined,             // self-host worker for strict CSP
})
```

### Session Management Options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `stickySession` | `boolean` | `true` | Uses `sessionStorage` to survive page refreshes within the same tab. Tab close ends the session. |
| `minReplayDuration` | `number` ms | `5000` | Discard replays shorter than this. Max allowed: 15000ms. Prevents "bounce" uploads. |
| `maxReplayDuration` | `number` ms | `3600000` | After this, session ends and a new one begins (re-sampled). Server enforces 1-hour ceiling. |

---

## Privacy & Masking

This is the most critical part of session replay. Misconfiguration can expose PII.

### Default Behavior (Out of the Box)

With zero configuration, Replay ships in **maximum privacy mode**:

| Data type | Default behavior |
|-----------|-----------------|
| All text content | ✅ Masked — replaced with `*` characters (length-preserving) |
| All `<input>` values | ✅ Masked |
| `<img>`, `<video>`, `<audio>`, `<svg>`, `<picture>`, `<embed>`, `<map>`, `<object>` | ✅ Blocked — replaced with same-size placeholder rectangle |
| Network request/response bodies | ❌ Not captured — opt-in required |
| Network headers beyond Content-Type/Length/Accept | ❌ Not captured — opt-in required |

### The Three Privacy Primitives

| Primitive | Effect | Visual result in replay |
|-----------|--------|------------------------|
| **Mask** | Replaces text content character-by-character with `*` | Element shape preserved; text unreadable |
| **Block** | Replaces entire element with opaque placeholder box | Solid grey/black rectangle same size as element |
| **Ignore** | Suppresses interaction events (clicks, keystrokes) on the element | Element visible; no input captured |

**Mask vs Block distinction:** Masked elements show their layout (you see the form structure, field labels, button positions) but no readable text. Blocked elements are completely opaque — you can't see anything inside. Use mask for forms where structure matters; use block for images, payment widgets, or entire sensitive sections.

### `maskAllText` and `maskAllInputs`

```typescript
// Defaults (most secure):
Sentry.replayIntegration({
  maskAllText: true,    // every text node → ***
  maskAllInputs: true,  // every <input> value → ***
});

// Unmask everything (e.g., non-sensitive marketing site):
Sentry.replayIntegration({
  maskAllText: false,
  maskAllInputs: false,
  blockAllMedia: false,
});
```

### `mask` and `unmask` — Selector-Based Text Masking

`mask`: Additional CSS selectors whose text is masked **in addition to** `maskAllText`.

`unmask`: CSS selectors **exempt** from masking, even when `maskAllText: true`.

```typescript
Sentry.replayIntegration({
  maskAllText: true,
  // Reveal specific safe elements:
  unmask: ['.app-title', 'nav a', '.breadcrumb', '[data-public]'],
  // Explicitly mask additional elements even with maskAllText: false:
  mask: ['.user-email', '#account-number', '.billing-address'],
});
```

> **v7 → v8 migration:** In v7, `unmask` defaulted to `['.sentry-unmask', '[data-sentry-unmask]']`. In v8, the default is `[]`. To restore v7 behavior:
> ```typescript
> Sentry.replayIntegration({
>   unmask: ['.sentry-unmask', '[data-sentry-unmask]'],
> });
> ```

### `block` and `unblock` — Selector-Based Element Blocking

`block`: Additional CSS selectors to replace with a placeholder, on top of `blockAllMedia`.

`unblock`: CSS selectors **exempt** from blocking, even when `blockAllMedia: true`.

```typescript
Sentry.replayIntegration({
  blockAllMedia: true,
  // Show specific images even though blockAllMedia is on:
  unblock: ['.product-thumbnail', 'img.company-logo', '.hero-banner'],
  // Block additional sensitive elements:
  block: ['#payment-iframe', '.ssn-display', '.confidential-report'],
});
```

> **v7 → v8 migration:** Same as unmask — in v8, `unblock` defaults to `[]`. To restore:
> ```typescript
> Sentry.replayIntegration({
>   unblock: ['.sentry-unblock', '[data-sentry-unblock]'],
> });
> ```

### `ignore` — Input Event Suppression

Suppresses keypress and input value events on specific fields. The element remains visible in the replay; the SDK just doesn't record what the user types.

```typescript
Sentry.replayIntegration({
  ignore: ['#otp-code', '.credit-card-number', '#ssn-input'],
});
```

### HTML Attribute API — Inline Privacy Control in JSX

Apply privacy controls directly in your React components without touching SDK config:

| Attribute | Class equivalent | Effect |
|-----------|-----------------|--------|
| `data-sentry-mask` | `sentry-mask` | Masks this element's text content |
| `data-sentry-unmask` | `sentry-unmask` | Unmasks this element (overrides `maskAllText`) |
| `data-sentry-block` | `sentry-block` | Replaces entire element with placeholder |
| `data-sentry-unblock` | `sentry-unblock` | Shows this element (overrides `blockAllMedia`) |
| `data-sentry-ignore` | `sentry-ignore` | Suppresses input events |

```tsx
// Mask a specific field even if maskAllText is false:
<p data-sentry-mask>{user.fullName}</p>

// Safe to display even with maskAllText: true:
<h1 data-sentry-unmask>Welcome to Our App</h1>

// Block entire subtree — shows as grey box in replay:
<div data-sentry-block>
  <CreditCardForm />
</div>

// Show this image even with blockAllMedia: true:
<img data-sentry-unblock src="/company-logo.png" alt="Logo" />

// Record the field but not what the user types:
<input data-sentry-ignore type="password" placeholder="Password" />
```

> **SDK v8 note:** For the `data-sentry-*` attributes to be recognized automatically, they are built into the SDK's default selector lists. The class-based equivalents (`.sentry-mask`, etc.) require explicit listing in `mask`/`unmask`/`block`/`unblock` options in v8.

### `maskFn` — Custom Text Replacement Function

Controls how masked text is transformed. Receives the original string, returns the replacement:

```typescript
Sentry.replayIntegration({
  maskFn: (text) => {
    // Default behavior — asterisks preserving length:
    return '*'.repeat(text.length);

    // Fixed placeholder:
    return '[REDACTED]';

    // Preserve structure, mask content:
    return text[0] + '*'.repeat(Math.max(0, text.length - 1));

    // Mask only digits (preserve non-sensitive structure):
    return text.replace(/\d/g, '*');
  },
});
```

### Three Privacy Configuration Modes

**Mode 1 — Maximum Privacy (default):** Mask everything, reveal nothing

```typescript
Sentry.replayIntegration({
  maskAllText: true,
  maskAllInputs: true,
  blockAllMedia: true,
});
```

**Mode 2 — Selective Masking (balanced):** Show most UI, hide sensitive fields

```typescript
Sentry.replayIntegration({
  maskAllText: false,
  blockAllMedia: false,
  maskAllInputs: true,              // still hide input values
  mask: ['#ssn', '#dob', '.pii'],   // mask these explicitly
  block: ['#payment-form', '.private-avatar'],
});
```

**Mode 3 — Whitelist (mask-all, unmask-approved):** Start fully masked, allow-list safe UI

```typescript
Sentry.replayIntegration({
  maskAllText: true,
  blockAllMedia: true,
  unmask: ['nav', 'header', '.app-chrome', '.breadcrumb', '[data-public]'],
  unblock: ['img.product-image', '.marketing-hero', '.public-icon'],
});
```

### How React Component Trees Interact with Masking

Masking operates on the **rendered DOM**, not React component hierarchy. Key behaviors:

- Masking **cascades** through the DOM tree — a `data-sentry-mask` on a parent masks all child text nodes
- Blocking a parent **hides everything inside** — the entire subtree is replaced with a placeholder box
- `unmask`/`unblock` on a child **overrides** the parent's mask/block for that specific subtree
- React's virtual DOM is invisible to Replay — it observes via `MutationObserver` on the real DOM
- Conditionally rendered elements (e.g., toggled modals) are captured when they appear in the DOM

```tsx
// Masking cascades to all children:
<div data-sentry-mask>
  <UserProfile />      {/* All text inside UserProfile is masked */}
  <ContactInfo />      {/* This too */}
</div>

// Child can opt out of parent masking:
<div data-sentry-mask>
  <AccountNumber />                           {/* masked */}
  <span data-sentry-unmask>Account Type</span> {/* visible */}
</div>

// Block a payment widget; unblock the logo inside:
<div data-sentry-block>
  <PaymentProcessor />
  <img data-sentry-unblock src="/payment-logo.svg" />  {/* shows in replay */}
</div>
```

### `beforeAddRecordingEvent` — Custom Event Scrubbing

Available since v7.53.0. Intercepts every recording event before it is buffered. Return `null` to drop, return the event (mutated or not) to keep:

```typescript
Sentry.replayIntegration({
  beforeAddRecordingEvent: (event) => {
    // Drop noisy console breadcrumbs
    if (event.data.tag === 'breadcrumb' && event.data.payload?.category === 'console') {
      return null;
    }

    // Only capture network events for 4xx/5xx responses
    if (
      event.data.tag === 'performanceSpan' &&
      (event.data.payload.op === 'resource.fetch' ||
        event.data.payload.op === 'resource.xhr')
    ) {
      const status = event.data.payload.data?.statusCode;
      if (status && status < 400) return null;
    }

    return event;
  },
});
```

### Scrubbing URLs via `addEventProcessor`

To redact sensitive data from URLs in the replay event metadata (not the recording stream):

```typescript
Sentry.addEventProcessor((event) => {
  if (event.type !== 'replay_event') return event;

  const scrub = (url: string) =>
    url.replace(/\/users\/[a-z0-9-]+\//gi, '/users/[id]/');

  event.urls = event.urls?.map(scrub);
  return event;
});
```

### `srcdoc` Iframe Warning

Elements using the `srcdoc` attribute bypass masking logic. Always block them explicitly:

```typescript
Sentry.replayIntegration({
  block: ['iframe[srcdoc]'],
});
```

---

## Network Request Recording

### What Is Captured by Default

For every `fetch` and `XHR` request, without any configuration:

| Field | Captured? |
|-------|-----------|
| URL | ✅ Yes |
| HTTP method | ✅ Yes |
| HTTP status code | ✅ Yes |
| Request body size (bytes) | ✅ Yes |
| Response body size (bytes) | ✅ Yes |
| Request/response body content | ❌ No |
| Custom headers | ❌ No |

### `networkDetailAllowUrls` — Enable Body and Header Capture

Body and header capture is **opt-in** and only activates for URLs that match this list:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: [
    window.location.origin,              // same-origin (recommended minimum)
    'https://api.myapp.com',             // specific domain
    /^https:\/\/api\.myapp\.com\//,      // regex pattern
    '/api/',                             // substring match
    'graphql',                           // matches any URL containing "graphql"
  ],
});
```

> **Security:** Only allowlist your own APIs. Never include third-party payment processors, auth providers, or analytics endpoints.

### `networkDetailDenyUrls` — Exclude Sensitive Endpoints

Takes precedence over `networkDetailAllowUrls`. Matching URLs never have bodies/headers captured:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: [window.location.origin],
  networkDetailDenyUrls: [
    '/api/auth',
    '/api/login',
    '/api/payment',
    '/api/users/me',
    /\/sensitive\//,
    /\/admin\//,
  ],
});
```

### `networkCaptureBodies` (boolean, default: `true`)

Controls whether request/response bodies are captured for allowlisted URLs. Set `false` to capture only headers and metadata without body content:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: ['https://api.myapp.com'],
  networkCaptureBodies: false,   // headers yes, bodies no
});
```

**Body format support:**

| Format | Captured |
|--------|----------|
| `application/json` | ✅ Yes |
| XML | ✅ Yes |
| `text/plain` | ✅ Yes |
| `multipart/form-data` (text fields) | ✅ Yes |
| Binary / byte arrays | ❌ No |
| File uploads | ❌ No |
| Blobs / media streams | ❌ No |

Bodies are truncated at **150,000 characters** (150 KB). This limit is not configurable.

### `networkRequestHeaders` and `networkResponseHeaders`

By default, only `Content-Type`, `Content-Length`, and `Accept` are captured. Add more:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: [window.location.origin],
  networkRequestHeaders: [
    'Cache-Control',
    'X-Request-ID',
    'X-Correlation-ID',
    // ⚠️ Avoid: 'Authorization', 'Cookie' — contain credentials
  ],
  networkResponseHeaders: [
    'Referrer-Policy',
    'X-Request-ID',
    'X-Response-Time',
    'CF-Ray',
    'X-Cache',
  ],
});
```

> ⚠️ Never capture `Authorization`, `Cookie`, or `Set-Cookie` headers in production. They contain bearer tokens and session credentials.

### Capturing GraphQL Operation Names

GraphQL requests all go to the same endpoint. To distinguish operations, capture the request body and filter by operation name in `beforeAddRecordingEvent`:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: ['https://api.myapp.com/graphql'],
  networkCaptureBodies: true,
  beforeAddRecordingEvent: (event) => {
    // Optionally: drop mutations from replay to reduce noise
    if (
      event.data.tag === 'performanceSpan' &&
      event.data.payload.op === 'resource.fetch'
    ) {
      const body = event.data.payload.data?.request?.body;
      if (body?.operationName === 'InternalAdminMutation') return null;
    }
    return event;
  },
});
```

### Apollo Client Body Capture Issue

Apollo uses an `AbortController` to cancel in-flight queries on component unmount. This abort fires before Replay can read the response body, resulting in empty response bodies.

**Workaround:** Supply a custom signal that doesn't abort the Replay read:

```typescript
import { HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: '/graphql',
  // Don't pass an AbortController signal here, or use your own
  // that only cancels at route-change boundaries rather than component unmount
});
```

---

## Canvas Recording

### Setup — `replayCanvasIntegration()`

Canvas elements are **not** recorded by default. Add a second integration:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "...",
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration(),   // requires @sentry/react ≥7.98.0
  ],
});
```

> ⚠️ **No PII scrubbing in canvas recordings.** If your canvas renders sensitive data (user documents, medical images, profile photos), either avoid canvas recording or sanitize the canvas content before each snapshot.

### Standard 2D Canvas

For standard 2D canvas, the default configuration records automatically — no extra code needed. The integration periodically snapshots the canvas content.

### 3D / WebGL Canvas — Manual Snapshotting

WebGL requires `enableManualSnapshot: true` because:

1. The integration must enable `preserveDrawingBuffer` on the WebGL context to read pixel data
2. `preserveDrawingBuffer` prevents the GPU from discarding draw buffers after compositing — this can degrade performance on complex scenes
3. Manual mode lets you control exactly when snapshots are taken

```typescript
Sentry.init({
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration({ enableManualSnapshot: true }),
  ],
});

// React ref + render loop:
import { useRef, useEffect } from 'react';

function WebGLScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl');

    function render() {
      // ... your WebGL rendering ...

      // After rendering, snapshot for Replay:
      const canvasIntegration = Sentry.getClient()?.getIntegrationByName('ReplayCanvas');
      canvasIntegration?.snapshot(canvas);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }, []);

  return <canvas ref={canvasRef} id="scene" />;
}
```

### WebGPU Canvas

WebGPU requires an additional flag since it doesn't use `requestAnimationFrame` in the same way:

```typescript
Sentry.replayCanvasIntegration({ enableManualSnapshot: true });

// In your render loop:
const canvasIntegration = Sentry.getClient()?.getIntegrationByName('ReplayCanvas');
canvasIntegration?.snapshot(canvasRef, { skipRequestAnimationFrame: true });
```

### Cross-Origin Canvas Content

If your canvas draws images/videos from a different origin, the browser throws a `SecurityError` when Replay calls `canvas.toDataURL()` (tainted canvas).

**Fix:** Add `crossorigin="anonymous"` to media elements and configure CORS on your CDN:

```tsx
<img crossOrigin="anonymous" src="https://cdn.example.com/texture.png" />
<video crossOrigin="anonymous" src="https://cdn.example.com/clip.mp4" />
```

Your CDN must respond with `Access-Control-Allow-Origin: *` (or your specific origin).

---

## Lazy Loading Replay

Replay adds ~50 KB (gzipped) to your initial bundle. If initial page load performance is critical, defer loading until after the first render:

```typescript
// src/instrument.ts — initialize without replay
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [],   // no replay at startup
});

// Load replay after initial render (e.g., in a useEffect or after login):
async function enableReplay() {
  const replayIntegration = await Sentry.lazyLoadIntegration('replayIntegration');
  Sentry.addIntegration(
    replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    })
  );
}
```

**Or with dynamic import:**

```typescript
async function enableReplay() {
  const { replayIntegration } = await import('@sentry/react');
  Sentry.addIntegration(replayIntegration({ maskAllText: true }));
}
```

**Trade-off:** Any errors or sessions that occur before the integration loads are not captured. Prefer lazy loading when:
- The app has a significant unauthenticated surface (home page, landing page)
- You only want replay for authenticated users (load after login)
- Initial page load performance is actively measured

---

## Advanced Configuration

### `beforeErrorSampling` — Control Which Errors Trigger Replay

Only relevant in buffer mode (`replaysOnErrorSampleRate > 0`). Called before the dice roll for error-based sampling. Return `false` to prevent the error from triggering a replay capture:

```typescript
Sentry.replayIntegration({
  beforeErrorSampling: (event) => {
    // Don't capture replay for known benign errors
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop')) {
      return false;
    }
    // Skip console-captured errors (from captureConsoleIntegration)
    if (event.logger === 'console') {
      return false;
    }
    // Skip test environments
    if (event.tags?.environment === 'test') {
      return false;
    }
    // Skip low-severity user-land errors
    if (event.level === 'warning') {
      return false;
    }
    return true;
  },
});
```

> **`captureConsoleIntegration` warning:** If you use this integration, every `console.error()` call captures a Sentry event, which can trigger replay sampling for every console error. Use `beforeErrorSampling` to filter these out.

### `mutationBreadcrumbLimit` and `mutationLimit`

Protect against pages that cause excessive DOM mutations (real-time dashboards, animated charts, chat feeds):

| Option | Default | Behavior |
|--------|---------|----------|
| `mutationBreadcrumbLimit` | `750` | Adds a warning breadcrumb to the replay timeline when exceeded |
| `mutationLimit` | `10000` | Stops recording entirely to protect page performance |

```typescript
Sentry.replayIntegration({
  mutationBreadcrumbLimit: 500,   // warn earlier for noisy pages
  mutationLimit: 5000,            // stop recording earlier
});
```

**When you hit `mutationLimit`, fix the root cause:**
- Virtualize long lists with `react-virtual`, `react-window`, or TanStack Virtual
- Paginate large data tables instead of rendering all rows
- Use CSS animations instead of JS-driven DOM mutations
- Batch React state updates (`unstable_batchedUpdates` or React 18 automatic batching)

### `slowClickIgnoreSelectors`

Sentry automatically detects **dead clicks** (click with no DOM response) and **rage clicks** (3+ clicks within 7 seconds). Suppress this detection for elements that intentionally don't mutate the DOM:

```typescript
Sentry.replayIntegration({
  slowClickIgnoreSelectors: [
    'a[download]',           // download links
    '.copy-to-clipboard',    // clipboard buttons
    '[aria-label*="print" i]',
    '.pdf-export-btn',
    '#video-player',         // video controls
    '.toast-close',          // dismissal buttons that animate out
  ],
});
```

### `workerUrl` — Self-Host the Compression Worker

By default, Sentry creates the compression worker via a `blob:` URL. If your CSP blocks `blob:`, self-host the worker:

1. Copy the worker file from `node_modules/@sentry/replay/build/npm/esm/worker/` after install
2. Serve it from your own origin (e.g., `/assets/sentry-replay-worker.min.js`)
3. Configure the path:

```typescript
Sentry.replayIntegration({
  workerUrl: '/assets/sentry-replay-worker.min.js',
});
```

**With Sentry Vite Plugin (v2.10.0+):**

```typescript
// vite.config.ts
sentryVitePlugin({
  bundleSizeOptimizations: {
    excludeReplayWorker: true,  // extract worker as separate asset
  },
})
```

> The worker is forward/backward compatible within the same major SDK version. Update it when upgrading major versions.

### Manual Session Control

When both sample rates are `0`, control recording programmatically:

```typescript
Sentry.init({
  dsn: "...",
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
});

const replay = Sentry.getReplay();

// Start continuous recording:
replay.start();

// Start in buffer mode (hold in memory, send on flush):
replay.startBuffering();

// Stop recording and flush all pending data:
await replay.stop();

// Upload buffered data without stopping:
await replay.flush();

// Get current replay ID (for linking to support tickets, etc.):
const replayId = replay.getReplayId();
const replayUrl = `https://YOUR-ORG.sentry.io/replays/${replayId}/`;
```

**React Hook pattern for support widget integration:**

```tsx
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';

function SupportButton() {
  const handleOpen = async () => {
    const replay = Sentry.getReplay();
    await replay.flush();
    const replayId = replay.getReplayId();

    openSupportWidget({
      metadata: {
        sentryReplayUrl: replayId
          ? `https://myorg.sentry.io/replays/${replayId}/`
          : undefined,
      },
    });
  };

  return <button onClick={handleOpen}>Contact Support</button>;
}
```

### Deferred Initialization (Feature Flags / A/B Testing)

If your sampling rates come from an external feature flag service:

```typescript
// Start Sentry without replay
Sentry.init({
  dsn: "...",
  integrations: [],
});

// After feature flags resolve:
async function initReplayFromFlags() {
  const flags = await featureFlagService.getFlags();

  const client = Sentry.getClient();
  if (!client) return;

  const options = client.getOptions();
  options.replaysSessionSampleRate = flags.replaySessionRate;
  options.replaysOnErrorSampleRate = flags.replayErrorRate;

  const replay = Sentry.replayIntegration({ maskAllText: true });
  client.addIntegration(replay);
}
```

### Route-Based Recording (Selective Pages)

```typescript
Sentry.init({
  dsn: "...",
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
});

// React Router example: only record checkout flow
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ReplayController() {
  const location = useLocation();

  useEffect(() => {
    const replay = Sentry.getReplay();
    const isCheckout = location.pathname.startsWith('/checkout');

    if (isCheckout && !replay.getReplayId()) {
      replay.start();
    } else if (!isCheckout && replay.getReplayId()) {
      replay.stop();
    }
  }, [location.pathname]);

  return null;
}
```

---

## Understanding Sessions

### What Is a Session vs a Segment

- **Replay Session:** The full recording from start to end — one replay visible in the Sentry UI. Has a unique `replayId`.
- **Segment:** A chunk of recording data transmitted to the server. Large recordings are split into segments sent in sequence and reassembled server-side.

One session = multiple segments streamed over time.

### Session Lifecycle

| Event | Session behavior |
|-------|-----------------|
| SDK initializes | Sampling evaluated; session or buffer mode begins |
| User is inactive 15+ minutes | Session ends; new session starts on next interaction |
| Total duration exceeds `maxReplayDuration` | Session ends; new session starts (re-sampled) |
| User closes the tab | Session ends; `sessionStorage` is cleared |
| `replay.stop()` called | Session ends; pending data flushed |

An "interaction" that resets the idle timer = mouse click OR browser navigation event.

### Session Mode vs Buffer Mode

| Aspect | Session Mode | Buffer Mode |
|--------|-------------|-------------|
| Activated when | `replaysSessionSampleRate > 0` AND session is sampled | Only `replaysOnErrorSampleRate > 0` |
| Data transmission | Continuous real-time chunks to Sentry | Held in memory; sent only on error |
| Memory usage | Low (continuously streamed out) | ~2–5 MB in RAM (last ~60 seconds) |
| What appears in Sentry | Full session from start | 60s before error + rest of session |
| Idle timeout | 15 minutes | 15 minutes |
| Max duration | `maxReplayDuration` | `maxReplayDuration` |

### How Buffer Mode Flushes on Error

1. Error occurs in the browser
2. Sentry SDK captures the error event
3. `beforeErrorSampling(event)` is called — `return false` to abort
4. Dice roll against `replaysOnErrorSampleRate` — fail → buffer discarded
5. Pass → buffered ~60 seconds of DOM events sent to Sentry
6. Recording continues in session mode for the remainder of the session
7. Error event is linked to the replay via `replayId` tag

---

## Performance Considerations

### Bundle Size

| Component | Size (gzipped) |
|-----------|---------------|
| `replayIntegration()` | ~50 KB |
| `replayCanvasIntegration()` | Additional (small) |
| Compression Web Worker | Extracted as separate chunk |

**Reduction strategies:**
- Use `lazyLoadIntegration('replayIntegration')` to keep it out of the critical bundle
- Set `excludeReplayWorker: true` in the Sentry bundler plugin

### Runtime Overhead

| Operation | Performance impact |
|-----------|------------------|
| DOM observation (MutationObserver) | Low — reads, doesn't write |
| Compression | Off main thread via Web Worker |
| Network interception (fetch/XHR) | Low — thin wrappers |
| Canvas recording (2D) | Moderate — pixel buffer reads |
| Canvas recording (WebGL with `preserveDrawingBuffer`) | High — prevents GPU buffer discard |
| High DOM mutation rate | High — can trigger `mutationLimit` stop |

**Errors-only mode has near-zero overhead** when no error occurs — the in-memory buffer (~2–5 MB) is the only cost.

---

## CSP Requirements

Without correct CSP headers, Replay **fails silently** — no error in the console, no replay recorded.

### Required Directives

```
worker-src 'self' blob:;
child-src 'self' blob:;    ← required for Safari ≤15.4
```

**As an HTTP response header:**
```http
Content-Security-Policy: default-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;
```

**As a meta tag:**
```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;"
/>
```

**When using `workerUrl` (self-hosted worker):**
```
worker-src 'self';    ← blob: not required
child-src 'self';
```

**If using a `tunnel` to relay events through your own server:**
```
connect-src 'self' https://o<ORG_ID>.ingest.sentry.io;
```
Or with `tunnel: "/sentry-tunnel"`:
```
connect-src 'self';    ← all requests go to your own origin
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No replays appearing at all | CSP blocks Web Worker blob URL | Add `worker-src 'self' blob:` and `child-src 'self' blob:` to CSP |
| No replays appearing | `replayIntegration()` not in init | Confirm it's in the `integrations` array in `Sentry.init()` |
| No replays appearing | Both sample rates are `0` | Set `replaysSessionSampleRate: 0.1` or `replaysOnErrorSampleRate: 1.0` |
| No replays appearing | SDK version too old | Upgrade to `@sentry/react` ≥7.27.0 |
| No replays appearing | Running in SSR/Node context | Ensure `replayIntegration()` is only in browser-side init code |
| No replays appearing | `minReplayDuration` too high | Lower it or set to `0` for debugging |
| All text shows as `***` | `maskAllText: true` (default) | Expected. Use `unmask` or `data-sentry-unmask` to reveal safe content |
| Replay cuts off early | `mutationLimit` exceeded | Increase limit or virtualize your lists; check for DOM thrash |
| Replay shows broken layout | External CSS/fonts blocked by CORS | Add `sentry.io` to `Access-Control-Allow-Origin` on your CDN |
| Images missing in replay | External images blocked by CORS | Add `sentry.io` to CDN CORS policy for image assets |
| Network bodies always empty | URL not in `networkDetailAllowUrls` | Add your API domain to the allowlist |
| Network bodies empty (Apollo) | AbortController cancels before Replay reads | Don't abort on component unmount; use route-level cancellation |
| Network body truncated | > 150,000 characters | Expected behavior — limit is not configurable |
| Canvas not recording | Not added by default | Add `replayCanvasIntegration()` to `integrations` array |
| Canvas SecurityError | Cross-origin media taints canvas | Add `crossOrigin="anonymous"` to `<img>`/`<video>` and enable CORS on CDN |
| WebGL canvas blank in replay | `preserveDrawingBuffer` not enabled | Use `enableManualSnapshot: true` on `replayCanvasIntegration()` |
| Rage/dead clicks on download buttons | SDK detects non-DOM-mutating clicks | Add selector to `slowClickIgnoreSelectors` |
| Replays triggered by `console.error` | `captureConsoleIntegration` sends events | Use `beforeErrorSampling` to return `false` when `event.logger === 'console'` |
| Worker CSP error in console | CSP missing `blob:` in `worker-src` | Add `worker-src 'self' blob:` or use `workerUrl` with self-hosted worker |
| High replay volume / storage costs | `replaysSessionSampleRate` too high | Lower it; keep `replaysOnErrorSampleRate: 1.0` for error coverage |
| Replay blocked by ad-blockers | Direct requests to Sentry ingest | Set `tunnel: "/sentry-tunnel"` and implement a server-side relay |

---

## Complete Configuration Reference

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // ── SAMPLING (init-level, not in replayIntegration) ────────────
  replaysSessionSampleRate: 0.1,      // 10% full session recording
  replaysOnErrorSampleRate: 1.0,      // 100% error-triggered recording

  integrations: [
    Sentry.replayIntegration({

      // ── SESSION ──────────────────────────────────────────────
      stickySession: true,             // survive page refreshes
      minReplayDuration: 5000,         // discard replays < 5s (max: 15000)
      maxReplayDuration: 3600000,      // cap at 1 hour (server limit)

      // ── PRIVACY ──────────────────────────────────────────────
      maskAllText: true,               // mask all text (default: true)
      maskAllInputs: true,             // mask all inputs (default: true)
      blockAllMedia: true,             // block all media (default: true)
      mask: ['.pii', '[data-sensitive]'],
      unmask: ['.app-chrome', 'nav', '.public-label'],
      block: ['#payment-form', '.ssn-widget'],
      unblock: ['.company-logo', '.product-thumbnail'],
      ignore: ['#otp-field'],
      maskFn: (text) => '*'.repeat(text.length),

      // ── NETWORK ──────────────────────────────────────────────
      networkDetailAllowUrls: [window.location.origin, 'https://api.myapp.com'],
      networkDetailDenyUrls: ['/api/auth', '/api/payment', /\/admin\//],
      networkCaptureBodies: true,
      networkRequestHeaders: ['X-Request-ID', 'Cache-Control'],
      networkResponseHeaders: ['X-Request-ID', 'X-Response-Time'],

      // ── DOM PROTECTION ────────────────────────────────────────
      mutationLimit: 10000,
      mutationBreadcrumbLimit: 750,
      slowClickIgnoreSelectors: ['a[download]', '.copy-btn', '.print-btn'],

      // ── ADVANCED ─────────────────────────────────────────────
      workerUrl: '/assets/sentry-replay-worker.min.js',  // if strict CSP
      beforeAddRecordingEvent: (event) => {
        if (event.data.tag === 'breadcrumb' &&
            event.data.payload?.category === 'console') return null;
        return event;
      },
      beforeErrorSampling: (event) => {
        if (event.logger === 'console') return false;
        return true;
      },
    }),

    // Canvas recording (optional):
    Sentry.replayCanvasIntegration({
      enableManualSnapshot: false,   // set true for WebGL/WebGPU
    }),
  ],
});
```
