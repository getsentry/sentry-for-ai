# Session Replay — Sentry Browser SDK

> Minimum SDK: `@sentry/browser` ≥7.27.0  
> `replayCanvasIntegration` available since SDK ≥7.50.0  
> `beforeAddRecordingEvent` available since SDK ≥7.53.0  
> `beforeErrorSampling` available since SDK ≥7.56.0  
> Node 12+ required; browsers newer than IE11

---

## Basic Setup

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0.1,   // 10% of all sessions recorded in full
  replaysOnErrorSampleRate: 1.0,   // 100% of sessions with errors buffered and sent
  integrations: [Sentry.replayIntegration()],
});
```

---

## Sampling Rates

### `replaysSessionSampleRate` vs. `replaysOnErrorSampleRate`

| Option | Default | Behavior |
|--------|---------|----------|
| `replaysSessionSampleRate` | `0` | Percentage of sessions to record **in full** from start to end. `1.0` = 100%, `0` = none. |
| `replaysOnErrorSampleRate` | `0` | Percentage of sessions to record **when an error occurs**. Buffers up to 60 seconds before the error, then continues until the session ends. |

### How Sampling Works

1. `replaysSessionSampleRate` is checked first at session start.
   - If sampled → full session recording starts immediately, sent to Sentry in real-time chunks (**Session mode**).
   - If not sampled → recording is buffered in memory (last 60 seconds only) (**Buffer mode**).
2. If an error occurs in a buffered session:
   - `replaysOnErrorSampleRate` is checked.
   - If sampled → 60-second buffer + rest of session is sent to Sentry.
   - If not sampled → buffer is discarded.

**When data leaves the browser:**

| Scenario | Data Sent |
|----------|-----------|
| Selected for session sampling | Immediately (real-time chunks) |
| Not selected, no error | Never (buffer discarded) |
| Not selected, error occurs and sampled | After error (60s buffer + everything after) |

**Recommended rates by traffic volume:**

| Traffic | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|---------|---------------------------|---------------------------|
| High (100k+/day) | `0.01` (1%) | `1.0` |
| Medium (10k–100k/day) | `0.1` (10%) | `1.0` |
| Low (<10k/day) | `0.25` (25%) | `1.0` |

> **Tip:** Keep `replaysOnErrorSampleRate` at `1.0` — error sessions provide the most debugging value.  
> **Dev tip:** Set `replaysSessionSampleRate: 1.0` during development to capture every session.

---

## `replayIntegration()` — Configuration Reference

### General Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stickySession` | `boolean` | `true` | Track the user across page refreshes. Closing a tab ends the session; multiple tabs = multiple sessions. |
| `mutationLimit` | `number` | `10000` | Upper bound of DOM mutations before replay stops recording (protects performance). |
| `mutationBreadcrumbLimit` | `number` | `750` | Threshold at which a breadcrumb warning is emitted for large mutations. |
| `minReplayDuration` | `number` | `5000` (ms) | Minimum replay length before sending. Max configurable: 15000ms. |
| `maxReplayDuration` | `number` | `3600000` (ms = 1 hr) | Maximum replay length. Max value: 3600000ms. |
| `workerUrl` | `string` | `undefined` | URL for a self-hosted compression worker (avoids CSP issues, reduces bundle size). |
| `beforeAddRecordingEvent` | `(event) => event \| null` | identity fn | Filter or modify console log and network recording events before they are sent. Return `null` to drop. |
| `beforeErrorSampling` | `(event) => boolean` | `() => true` | In buffer mode only — return `false` to skip error-based sampling for a specific error event. |
| `slowClickIgnoreSelectors` | `string[]` | `[]` | CSS selectors for elements where slow/rage click detection should be disabled. |

### Privacy Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maskAllText` | `boolean` | `true` | Mask all text content (replaced with `*` characters). |
| `maskAllInputs` | `boolean` | `true` | Mask all `<input>` element values. |
| `blockAllMedia` | `boolean` | `true` | Block all media: `img`, `svg`, `video`, `object`, `picture`, `embed`, `map`, `audio`. |
| `mask` | `string[]` | `[".sentry-mask", "[data-sentry-mask]"]` | Additional CSS selectors to mask. Appended to defaults. |
| `unmask` | `string[]` | `[]` | CSS selectors to unmask (overrides `maskAllText`). |
| `block` | `string[]` | `[".sentry-block", "[data-sentry-block]"]` | Additional CSS selectors to block (replaced with same-size empty placeholder). |
| `unblock` | `string[]` | `[]` | CSS selectors to unblock (overrides `blockAllMedia`). |
| `ignore` | `string[]` | `[".sentry-ignore", "[data-sentry-ignore]"]` | Input fields whose events are ignored (no keystroke recording). |
| `maskFn` | `(text: string) => string` | `(s) => "*".repeat(s.length)` | Custom text masking function. |

### Network Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `networkDetailAllowUrls` | `(string \| RegExp)[]` | `[]` | URLs/patterns for which request/response details are captured (opt-in, SDK ≥7.50.0). |
| `networkDetailDenyUrls` | `(string \| RegExp)[]` | `[]` | URLs/patterns to exclude from network capture. Takes precedence over `networkDetailAllowUrls`. |
| `networkCaptureBodies` | `boolean` | `true` | Whether to capture request/response bodies for allowed URLs. |
| `networkRequestHeaders` | `string[]` | `[]` | Additional request headers to capture. Default captured: `Content-Type`, `Content-Length`, `Accept`. |
| `networkResponseHeaders` | `string[]` | `[]` | Additional response headers to capture. |

---

## Privacy & Masking

### Three Privacy Methods

| Method | Effect | Default Trigger |
|--------|--------|-----------------|
| **Mask** | Replaces text with `*` characters (preserving length) | `.sentry-mask`, `[data-sentry-mask]` |
| **Block** | Replaces entire element with same-size empty placeholder | `.sentry-block`, `[data-sentry-block]` |
| **Ignore** | Stops recording input events on matched fields | `.sentry-ignore`, `[data-sentry-ignore]` |

### HTML Attribute Usage

```html
<!-- Mask text content -->
<p class="sentry-mask">Sensitive user data</p>
<p data-sentry-mask>Sensitive user data</p>

<!-- Block entire element (credit card form, PII section) -->
<div class="sentry-block">
  <input type="text" placeholder="Credit card number" />
</div>
<div data-sentry-block>Blocked content</div>

<!-- Ignore input events (no keystrokes recorded) -->
<input class="sentry-ignore" type="password" />
<input data-sentry-ignore type="text" placeholder="SSN" />

<!-- Unmask when maskAllText=true -->
<p class="sentry-unmask">Safe to show in replay</p>
<p data-sentry-unmask>Safe to show</p>

<!-- Unblock media when blockAllMedia=true -->
<img class="sentry-unblock" src="product-image.png" alt="Product" />
<img data-sentry-unblock src="logo.svg" alt="Logo" />
```

### Configuration Examples

**Disable all default masking (show everything):**

```javascript
Sentry.replayIntegration({
  maskAllText: false,
  blockAllMedia: false,
});
```

**Mask and block specific selectors:**

```javascript
Sentry.replayIntegration({
  mask: [".user-pii", "[data-sensitive]", "#account-details"],
  unmask: [".replay-safe"],
  block: ["#payment-form", ".credit-card-widget"],
  unblock: [".product-image"],
  ignore: [".password-field", "[type='password']"],
});
```

**Custom masking function:**

```javascript
Sentry.replayIntegration({
  maskFn: (text) => text.replace(/\S/g, "X"), // Replace non-whitespace with X
});
```

**Custom recording event filter:**

```javascript
Sentry.replayIntegration({
  beforeAddRecordingEvent: (event) => {
    // Drop any event tagged "foo"
    if (event.data.tag === "foo") return null;

    // Only capture network events for 500 errors
    if (
      event.data.tag === "performanceSpan" &&
      (event.data.payload.op === "resource.fetch" ||
        event.data.payload.op === "resource.xhr") &&
      event.data.payload.data.statusCode !== 500
    ) {
      return null;
    }

    return event;
  },
});
```

---

## Network Capture

By default, Session Replay captures basic information about all outgoing fetch and XHR requests (URL, size, method, status code).

Request/response **bodies and additional headers require explicit opt-in** (SDK ≥7.50.0):

```javascript
Sentry.replayIntegration({
  networkDetailAllowUrls: [window.location.origin],
});
```

**Advanced — multiple patterns with custom headers:**

```javascript
Sentry.replayIntegration({
  networkDetailAllowUrls: [
    window.location.origin,
    "api.example.com",
    /^https:\/\/api\.example\.com/,
  ],
  networkCaptureBodies: true,        // default: true — capture request/response bodies
  networkRequestHeaders: ["Cache-Control", "X-Request-ID"],
  networkResponseHeaders: ["Referrer-Policy", "X-Trace-ID"],
});
```

**Constraints:**
- Bodies are truncated to **150,000 characters** maximum
- `networkDetailDenyUrls` takes precedence over `networkDetailAllowUrls`
- Set `networkCaptureBodies: false` to keep header capture while disabling body capture

---

## Canvas Recording

Canvas elements are not captured by default. Add `replayCanvasIntegration()` to enable:

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.replayCanvasIntegration(),
  ],
});
```

> ⚠️ **There is currently no PII scrubbing in canvas recordings.** Review canvas content carefully before enabling.

### 3D / WebGL Canvases — Manual Snapshot Mode

For WebGL or 3D canvases, use manual snapshotting to optimize performance:

```javascript
Sentry.replayCanvasIntegration({
  enableManualSnapshot: true,
});

// Call in your render loop to capture the canvas
function paint() {
  const canvasRef = document.querySelector("#my-canvas");
  Sentry.getClient()
    ?.getIntegrationByName("ReplayCanvas")
    ?.snapshot(canvasRef);
}
```

### WebGPU Canvases

```javascript
Sentry.replayCanvasIntegration({
  enableManualSnapshot: true,
});

function paint() {
  const canvasRef = document.querySelector("#my-canvas");
  const canvasIntegration =
    Sentry.getClient()?.getIntegrationByName("ReplayCanvas");

  canvasIntegration?.snapshot(canvasRef, {
    skipRequestAnimationFrame: true,
  });
}
```

---

## Lazy Loading

Defer loading the Replay bundle to avoid impacting initial page load:

```javascript
// Initialize Sentry without Replay
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [],
});

// Lazy-load Replay later (e.g., after user interaction or route change)
import("@sentry/browser").then((lazySentry) => {
  Sentry.addIntegration(lazySentry.replayIntegration({
    maskAllText: true,
    blockAllMedia: true,
  }));
});
```

**For Loader Script users** (CDN), use `lazyLoadIntegration`:

```javascript
window.sentryOnLoad = function () {
  Sentry.init({ dsn: "___PUBLIC_DSN___" });

  Sentry.lazyLoadIntegration("replayIntegration")
    .then((replayIntegration) => {
      Sentry.addIntegration(replayIntegration());
    })
    .catch(() => {
      // Network error — Replay not enabled
    });
};
```

---

## Session Modes & Manual Control

### Session Initialization Modes

| Configuration | Mode | Behavior |
|---------------|------|----------|
| `replaysSessionSampleRate > 0` and sampled | **Session mode** | Records continuously; uploads data in real time |
| Not sampled, `replaysOnErrorSampleRate > 0` | **Buffer mode** | Records but keeps only last 60 seconds in memory (~2–5 MB) |
| Both rates = `0`, or integration added without rates | **Inactive** | Nothing recorded until manually started |

**Session mode:** sessions end after **15 minutes of inactivity** or **60 minutes maximum duration**, then reinitialize.

**Buffer mode:** stores ~2–5 MB in memory (lightweight DOM event logs: clicks, scrolls, mutations — not video files). On sampled error, the 60-second buffer + subsequent recording are uploaded.

---

### Manual Session Control API

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
});

const replay = Sentry.getReplay();

replay.start();           // Start recording in session mode
replay.startBuffering();  // Start recording in buffer mode

await replay.flush();     // Upload pending data (keeps recording active)
await replay.stop();      // Flush data and end session permanently

const replayId = replay.getReplayId(); // Get current replay ID for external linking
```

---

### Deferred Initialization (External Sampling Service)

Use when you want to determine sampling rates via an external feature flag service before starting the SDK:

```javascript
async function initReplay(sessionSampleRate, errorSampleRate) {
  const client = Sentry.getClient();
  const options = client.getOptions();
  options.replaysSessionSampleRate = sessionSampleRate;
  options.replaysOnErrorSampleRate = errorSampleRate;

  const replay = Sentry.replayIntegration({
    maskAllText: true,
    blockAllMedia: true,
  });

  client.addIntegration(replay);
}

// Call after fetching remote config
fetchFeatureFlags().then((flags) => {
  initReplay(flags.replaySessionRate, flags.replayErrorRate);
});
```

---

### Custom Sampling Patterns

**Employee-only recordings:**

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// Force-flush replay for internal employees
if (loggedInUser.isEmployee) {
  const replay = Sentry.getReplay();
  replay.flush();
}
```

**URL-specific recording:**

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
});

navigation.addEventListener("navigate", (event) => {
  const url = new URL(event.destination.url);
  const replay = Sentry.getReplay();
  if (url.pathname.startsWith("/checkout/")) {
    replay.start();
  } else {
    replay.stop();
  }
});
```

**Error filtering in buffer mode:**

```javascript
Sentry.replayIntegration({
  beforeErrorSampling: (event) => {
    // Skip replay capture for this specific error type
    return !event.exception?.values?.[0]?.value?.includes("drop me");
  },
});
```

---

### Support Widget Integration

Link replay sessions to support tickets:

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.5,
  integrations: [Sentry.replayIntegration()],
});

MySupportWidget.on("open", async () => {
  const replay = Sentry.getReplay();
  await replay.flush();
  const replayId = replay.getReplayId();

  MySupportWidget.setTag("replayId", replayId);
  // Replay URL format:
  // https://<org-slug>.sentry.io/replays/<replay-id>/
});
```

---

## Performance Impact

### Buffer Mode is Lightweight

Buffer mode stores ~2–5 MB in memory — these are DOM event logs (clicks, scrolls, mutations), not video files. The real-time encoding is handled by a WebWorker.

### Mutation Limits

Protect against performance degradation from excessive DOM mutations:

```javascript
Sentry.replayIntegration({
  mutationBreadcrumbLimit: 1000, // Emit breadcrumb warning at this threshold
  mutationLimit: 1500,           // Stop recording at this threshold
});
```

### Custom Compression Worker

Reduces bundle size and avoids CSP violations by self-hosting the compression worker:

```javascript
Sentry.replayIntegration({
  workerUrl: "/assets/sentry-replay-worker.min.js",
});
```

**Bundler plugin optimization** (excludes worker from main bundle):

```javascript
sentryVitePlugin({
  bundleSizeOptimizations: {
    excludeReplayWorker: true,
  },
});
```

### Content Security Policy

Session Replay uses a WebWorker for compression. Add to your CSP:

```
worker-src 'self' blob:;
child-src 'self' blob:;
```

> Safari ≤15.4 requires `child-src`. Use a self-hosted `workerUrl` as an alternative.

---

## Best Practices

- **Keep `replaysOnErrorSampleRate` at `1.0`** — error sessions are the highest value for debugging.
- **Use `maskAllText: true` in production** — default behavior, protects PII. Only disable for internal tools.
- **Opt-in to network details explicitly** — set `networkDetailAllowUrls` only for your own API origins, not third-party services.
- **Never enable `replayCanvasIntegration` without reviewing canvas content** — there is no automatic PII scrubbing for canvas.
- **Test masking before deploying** — use `replaysSessionSampleRate: 1.0` in staging and review replays to verify PII is hidden.
- **Use `workerUrl` to self-host the compression worker** if you have strict CSP or want to reduce bundle size.
- **Use `beforeAddRecordingEvent`** to filter out high-frequency recording events that don't add debugging value.
- **Set `minReplayDuration`** to avoid sending trivially short sessions (default: 5s is usually fine).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Replay not recording | Check that `replaysSessionSampleRate` or `replaysOnErrorSampleRate` is > 0. Confirm `replayIntegration()` is in the `integrations` array. |
| CSP errors blocking worker | Add `worker-src 'self' blob:; child-src 'self' blob:;` to your CSP, or use `workerUrl` to self-host the worker. |
| Replay stops after mutation spike | The `mutationLimit` (default: 10000) was hit. Increase it or reduce DOM mutation frequency in your app. |
| Sensitive data visible in replays | Add `.sentry-mask` / `.sentry-block` to elements, or use `mask`/`block` selector options. Verify with `replaysSessionSampleRate: 1.0` in staging. |
| Canvas not recorded | Add `replayCanvasIntegration()` alongside `replayIntegration()`. Requires SDK ≥7.50.0. |
| Network request bodies not captured | Set `networkDetailAllowUrls` to include your API origin. Bodies are opt-in by default. |
| Replay ID unavailable | Call `replay.getReplayId()` only after `replay.start()` or `replay.startBuffering()` has been called. |
| Error replays missing the 60-second buffer | Ensure `replaysOnErrorSampleRate > 0` and the replay integration is initialized before the error occurs. |
| Large bundle size from replay | Use the bundler plugin option `excludeReplayWorker: true` and self-host the worker via `workerUrl`. |
| `beforeErrorSampling` not firing | Only runs in **buffer mode** (when the session was not selected for full session recording). |
| Safari CSP issues | Safari ≤15.4 requires `child-src` in addition to `worker-src`. Use `workerUrl` as an alternative. |
