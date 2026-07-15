# Session Replay — Sentry Svelte/SvelteKit SDK

> Minimum SDK: `@sentry/sveltekit` ≥7.27.0+ / `@sentry/svelte` ≥7.27.0+  
> `replayCanvasIntegration()`: requires `@sentry/sveltekit` ≥7.48.0+

> ⚠️ **Client-only feature.** Never add `replayIntegration()` to `hooks.server.ts` or `instrumentation.server.ts`.

---

## Setup

Session Replay is bundled in `@sentry/sveltekit` and `@sentry/svelte` — no separate package needed.

### SvelteKit — hooks.client.ts

```typescript
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // Sample rates live on init, NOT on the integration
  replaysSessionSampleRate: 0.1,   // record 10% of all sessions
  replaysOnErrorSampleRate: 1.0,   // record 100% of sessions that encounter an error

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // default: true
      blockAllMedia: true,    // default: true
    }),
  ],
});

export const handleError = Sentry.handleErrorWithSentry();
```

### Standalone Svelte — main.ts

```typescript
import * as Sentry from "@sentry/svelte";
import App from "./App.svelte";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

const app = new App({ target: document.getElementById("app")! });
export default app;
```

---

## Sample Rates

| Option | Location | Behavior |
|--------|----------|----------|
| `replaysSessionSampleRate` | `Sentry.init({})` | Fraction of all sessions recorded from start |
| `replaysOnErrorSampleRate` | `Sentry.init({})` | Fraction of error sessions — includes ~60s of replay before the error |

Recommended values by traffic volume:

| Volume | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|--------|---------------------------|---------------------------|
| High (100k+ sessions/day) | `0.01` | `1.0` |
| Medium (10k–100k/day) | `0.1` | `1.0` |
| Low (<10k/day) | `0.25` | `1.0` |
| Errors-only strategy | `0` | `1.0` |

"Errors-only" (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`) minimizes overhead by not recording sessions unless an error occurs.

---

## Core `replayIntegration()` Options

### Recording Control

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stickySession` | `boolean` | `true` | Persist session across page refreshes |
| `minReplayDuration` | `number` | `5000` | Min ms before a session-based replay is sent |
| `maxReplayDuration` | `number` | `3600000` | Max replay length (1 hour hard cap) |
| `workerUrl` | `string` | — | Self-host the compression Web Worker |

### Mutation Limits (DOM thrash protection)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mutationLimit` | `number` | `10000` | Stop recording after N DOM mutations |
| `mutationBreadcrumbLimit` | `number` | `750` | Emit a warning breadcrumb after N mutations |

```typescript
Sentry.replayIntegration({
  mutationBreadcrumbLimit: 1000,
  mutationLimit: 1500,
});
```

---

## Privacy and Masking

Replay defaults to **privacy-first**: all text is masked and all media is blocked before a single line of config is written.

### Default behavior

| Element type | Default action |
|-------------|----------------|
| All text content | Replaced with `*` (length-preserving) |
| All inputs | Values replaced with `*` |
| `img`, `svg`, `video`, `audio`, `picture`, `embed`, `map`, `object` | Replaced with same-size placeholder box |

### Global masking overrides

```typescript
Sentry.replayIntegration({
  maskAllText: true,     // default: true — set false to unmask everything
  maskAllInputs: true,   // default: true
  blockAllMedia: true,   // default: true

  // Custom masking function (override default * replacement)
  maskFn: (text) => "█".repeat(text.length),
});
```

### Selector-based fine-grained control

```typescript
Sentry.replayIntegration({
  // Additional selectors to mask/block (additive to defaults)
  mask: [".sensitive-field", "[data-pii]"],
  block: [".payment-widget", "#credit-card-iframe"],
  ignore: ["#search-input"],         // ignore input value changes for this field

  // UNBLOCK specific elements from maskAllText=true
  unmask: [".username-display", ".public-label"],

  // UNBLOCK specific elements from blockAllMedia=true
  unblock: [".product-thumbnail", ".avatar-image"],
});
```

### HTML attribute approach (zero-config)

Apply directly in Svelte markup — no JS config change needed:

```svelte
<!-- Mask text content -->
<p data-sentry-mask>Sensitive content</p>
<p class="sentry-mask">Also masked</p>

<!-- Block entire element (replaced with placeholder) -->
<div data-sentry-block>Payment widget</div>
<div class="sentry-block">Also blocked</div>

<!-- Ignore input value changes -->
<input data-sentry-ignore type="text" />
<input class="sentry-ignore" />
```

Attribute selectors (`data-sentry-*`) are automatically recognized by the SDK. CSS classes require these to be listed in the integration options for SDK v8+:

```typescript
Sentry.replayIntegration({
  unmask: [".sentry-unmask, [data-sentry-unmask]"],
  unblock: [".sentry-unblock, [data-sentry-unblock]"],
});
```

---

## Network Capture

By default, only URL, method, status code, and response size are recorded for network requests. To capture headers and bodies, opt in per URL:

```typescript
Sentry.replayIntegration({
  networkDetailAllowUrls: [
    window.location.origin,          // same-origin requests
    "api.example.com",               // substring match
    /^https:\/\/api\.example\.com/,  // regex match
  ],
  networkDetailDenyUrls: [
    "https://analytics.third-party.com",  // takes precedence over allow
  ],

  networkCaptureBodies: true,                    // capture req/res bodies (default: true when URLs allowed)
  networkRequestHeaders: ["Cache-Control", "X-Request-ID"],
  networkResponseHeaders: ["Referrer-Policy", "X-Response-Time"],
});
```

Constraints:
- Body truncation limit: **150,000 characters** max
- Default captured headers: `Content-Type`, `Content-Length`, `Accept`
- No bodies/extra headers captured unless URLs are in `networkDetailAllowUrls`

---

## Canvas Recording

Requires a second integration:

```typescript
Sentry.init({
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration(),
  ],
});
```

### Manual snapshot mode

Use when canvas content changes outside normal render cycles:

```typescript
Sentry.init({
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration({ enableManualSnapshot: true }),
  ],
});

// Trigger snapshot manually when needed
const canvasIntegration = Sentry.getClient()?.getIntegrationByName("ReplayCanvas");
canvasIntegration?.snapshot(canvasElement);
```

---

## Lazy Loading Replay

Defer loading the replay bundle to improve initial page load performance:

```typescript
// Initialize without replay
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [],
});

// Load on demand (e.g., after login, or on idle)
async function enableReplay() {
  const { replayIntegration } = await import("@sentry/sveltekit");
  Sentry.addIntegration(
    replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    })
  );
}
```

---

## Event Filtering

```typescript
Sentry.replayIntegration({
  // Filter/drop individual recording events before they are buffered
  beforeAddRecordingEvent: (event) => {
    // Drop debug console entries from replay
    if (event.data?.payload?.level === "debug") return null;
    return event;
  },

  // Control which errors trigger error-rate sampling
  beforeErrorSampling: (event) => {
    // Don't start replay for NetworkErrors
    return event.exception?.values?.[0]?.type !== "NetworkError";
  },

  // Disable slow/rage-click detection on noisy elements
  slowClickIgnoreSelectors: [".loading-spinner", "#carousel"],
});
```

---

## SvelteKit-Specific Considerations

| Topic | Note |
|-------|-------|
| Server-side rendering | Replay records the **browser DOM** after hydration, not the raw SSR HTML |
| Navigation tracking | SvelteKit client-side navigations are recorded as replay navigation breadcrumbs |
| `+error.svelte` pages | Errors triggering error pages are captured; replay buffers the preceding session |
| Ad-blocker bypass | Set `tunnel: "/sentry-tunnel"` to prevent replay data from being blocked |
| Cloudflare adapter | Replay is client-only; no adapter-specific concerns |

---

## CSP Requirements

If using a strict Content Security Policy, add:

```
worker-src 'self' blob:;
child-src 'self' blob:;
```

The SDK uses a Web Worker (`blob:` URL) for compression.

### Self-hosting the worker

```typescript
Sentry.replayIntegration({
  workerUrl: "/assets/sentry-replay-worker.min.js",
});
```

Download the worker from the `@sentry/replay` package `worker/` directory and serve it from your own origin.

---

## Performance Considerations

- Compression runs in a **Web Worker** — minimal main-thread impact
- `mutationLimit` protects against DOM-heavy frameworks that trigger thousands of mutations
- Network body capture is opt-in per URL — no performance cost without `networkDetailAllowUrls`
- Lazy loading (`Sentry.addIntegration()`) reduces initial bundle size by ~50KB gzipped
- "Errors-only" strategy (`replaysSessionSampleRate: 0`) has near-zero overhead when no error occurs

---

## Best Practices

- Keep `maskAllText: true` and `blockAllMedia: true` as defaults — opt individual elements out via `unmask`/`unblock` or `data-sentry-unmask`/`data-sentry-unblock`
- Use `networkDetailAllowUrls` with your own API domains only — never include third-party analytics or payment processors
- Set `replaysOnErrorSampleRate: 1.0` so you never miss replay for an error session
- Lazy-load replay for unauthenticated pages where user consent or performance is critical
- Add `slowClickIgnoreSelectors` for loading states to avoid false rage-click detection

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Replay not recording | Confirm `replayIntegration()` is in `hooks.client.ts` — never in `hooks.server.ts` |
| All text shown as `*` | Expected with `maskAllText: true`; add `data-sentry-unmask` to elements that are safe to show |
| Replay missing after error | Check `replaysOnErrorSampleRate` is > 0; verify `replaysSessionSampleRate` is not overriding |
| Network requests missing in replay | Add your API domains to `networkDetailAllowUrls` |
| Worker CSP errors in browser console | Add `worker-src 'self' blob:;` to your CSP headers |
| Canvas not recording | Add `replayCanvasIntegration()` alongside `replayIntegration()` |
| High bandwidth usage | Lower `replaysSessionSampleRate`; enable `mutationLimit`; disable network body capture |
| Replay blocked by ad-blocker | Set `tunnel: "/sentry-tunnel"` in `Sentry.init()` and implement server relay |
| `beforeAddRecordingEvent` not filtering | Ensure the function returns `null` (not `undefined`) to drop events |
