---
name: sentry-span-streaming-js
description: Migrate JavaScript SDK to Sentry span streaming (span-first trace lifecycle). Use when asked to "enable span streaming", "migrate to span streaming", "use traceLifecycle stream", "add spanStreamingIntegration", or switch from transaction-based to streamed span delivery in a JavaScript project.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Span Streaming (JavaScript)

# Sentry Span Streaming Migration (JavaScript)

Migrate from the default transaction-based trace lifecycle (`static`) to span streaming (`stream`), where spans are sent individually as they complete instead of being batched into a transaction at the end.

This skill covers the JavaScript SDK (Browser, Node.js, Bun, Deno, Cloudflare). For Python, see [Span Streaming (Python)](../sentry-span-streaming-python/SKILL.md).

## Invoke This Skill When

- User asks to "enable span streaming" or "migrate to span streaming" in a JavaScript project
- User wants to switch from transaction-based to streamed span delivery
- User mentions `traceLifecycle`, `spanStreamingIntegration`, or `withStreamedSpan`
- User wants lower latency span delivery or per-span processing

---

## Phase 1: Detect

### 1.1 Detect Environment

```bash
# Detect if browser, server, or both
grep -rn "from '@sentry/browser'\|from '@sentry/react'\|from '@sentry/vue'\|from '@sentry/angular'\|from '@sentry/svelte'\|from '@sentry/nextjs'\|from '@sentry/nuxt'\|from '@sentry/sveltekit'\|from '@sentry/remix'\|from '@sentry/solidstart'\|from '@sentry/astro'\|from '@sentry/react-router'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null | head -20

grep -rn "from '@sentry/node'\|from '@sentry/bun'\|from '@sentry/deno'\|from '@sentry/cloudflare'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null | head -20
```

### 1.2. Find Existing Sentry Config

```bash
# Find Sentry.init calls
grep -rn "Sentry\.init\|init({" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null | head -20

# Find beforeSendSpan usage
grep -rn "beforeSendSpan" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null

# Find beforeSendTransaction usage
grep -rn "beforeSendTransaction" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null

# Find ignoreSpans usage
grep -rn "ignoreSpans" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null
```

### 1.3 Classify Environment

Based on detection results, classify each `Sentry.init` call as:

| Environment | Packages | Migration Path |
|---|---|---|
| **Browser** | `@sentry/browser`, `@sentry/react`, `@sentry/vue`, `@sentry/angular`, `@sentry/svelte` | Add `spanStreamingIntegration()` |
| **Server** | `@sentry/node`, `@sentry/bun`, `@sentry/deno`, `@sentry/cloudflare` | Add `traceLifecycle: 'stream'` |
| **Framework (both)** | `@sentry/nextjs`, `@sentry/nuxt`, `@sentry/sveltekit`, `@sentry/remix`, `@sentry/astro`, `@sentry/solidstart`, `@sentry/react-router` | Migrate both client and server configs separately |

---

## Phase 2: Migrate

**Prerequisites:** Sentry JavaScript SDK `>=10.53.1` with tracing enabled (`tracesSampleRate` or `tracesSampler` configured).

Apply changes to each `Sentry.init` call. Work through each file identified above.

### 2.1 Enable Span Streaming

#### Server-Side SDKs

Add `traceLifecycle: 'stream'` to `Sentry.init()`:

```js
// Before
Sentry.init({
  dsn: '...',
  tracesSampleRate: 1.0,
});

// After
Sentry.init({
  dsn: '...',
  tracesSampleRate: 1.0,
  traceLifecycle: 'stream',
});
```

#### Browser-Side SDKs

Add `Sentry.spanStreamingIntegration()` to the `integrations` array. The integration automatically enables `traceLifecycle: 'stream'` — you do not need to set it manually.

```js
// Before
Sentry.init({
  dsn: '...',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});

// After
Sentry.init({
  dsn: '...',
  integrations: [
    Sentry.spanStreamingIntegration(),
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});
```

The order of `spanStreamingIntegration()` relative to other integrations does not matter.

#### Framework SDKs (Client + Server)

Apply the browser migration to client config files and the server migration to server config files. Common patterns:

| Framework | Client Config | Server Config |
|---|---|---|
| Next.js | `sentry.client.config.ts` | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Nuxt | Client-side `Sentry.init` in module | Server-side `Sentry.init` in module |
| SvelteKit | `src/hooks.client.ts` | `src/hooks.server.ts` |
| Remix | `entry.client.tsx` | `entry.server.tsx` |
| Astro | Client-side init | Server-side init |

### 2.2 Migrate `beforeSendSpan`

If the user has a `beforeSendSpan` callback, it **must** be wrapped with `Sentry.withStreamedSpan()` to work in streaming mode. Without this wrapper, the SDK falls back to static mode.

The callback shape also changes:
- `description` is now `name`
- `data` is now `attributes`
- The span object is `StreamedSpanJSON` instead of `SpanJSON`

```js
// Before (static mode)
Sentry.init({
  beforeSendSpan: (span) => {
    if (span.description?.includes('/health')) {
      span.description = '[filtered]';
    }
    // 'data' contains span attributes
    delete span.data?.['http.request.body'];
    return span;
  },
});

// After (streaming mode)
Sentry.init({
  beforeSendSpan: Sentry.withStreamedSpan((span) => {
    if (span.name?.includes('/health')) {
      span.name = '[filtered]';
    }
    // 'attributes' replaces 'data'
    if (span.attributes) {
      delete span.attributes['http.request.body'];
    }
    return span;
  }),
});
```

**Key differences in the callback:**

| Static (`SpanJSON`) | Streaming (`StreamedSpanJSON`) |
|---|---|
| `span.description` | `span.name` |
| `span.data` (processed attributes) | `span.attributes` (raw attributes) |
| `span.timestamp` (end time) | `span.end_timestamp` |
| `span.status` (optional string) | `span.status` (`'ok'` or `'error'`) |
| `span.op` | `span.attributes['sentry.op']` |

Returning `null` from `beforeSendSpan` does **not** drop the span — it is ignored and a warning is logged.

### 2.3 Remove or Replace `beforeSendTransaction`

`beforeSendTransaction` has **no effect** in streaming mode. Spans are sent individually, not batched into transactions.

```js
// Before
Sentry.init({
  beforeSendTransaction: (event) => {
    // This entire callback is ignored in streaming mode
    if (event.transaction === '/health') {
      return null;
    }
    return event;
  },
});
```

**Migration paths depending on what `beforeSendTransaction` was used for:**

| Use Case | Streaming Replacement |
|---|---|
| Drop spans by name/route | Use `ignoreSpans` option |
| Modify span data before send | Use `beforeSendSpan` with `withStreamedSpan` |
| Filter by transaction name | Use `ignoreSpans` with string/RegExp pattern |
| Add tags/context to transaction | Use `beforeSendSpan` with `withStreamedSpan` |

Remove the `beforeSendTransaction` option from `Sentry.init()` after migrating its logic.

### 2.4 Configure `ignoreSpans` (Optional)

`ignoreSpans` works in both static and streaming modes, but the filter is evaluated at different points in the span lifecycle:

- **Streaming mode:** evaluated when the span **starts**. Only data available at span start — the span name and the attributes set at creation — is taken into account.
- **Static mode:** evaluated when the root span **ends**. Only data available at that point — the span name and attributes — is taken into account.

In both modes, a match prevents the span from being recorded or sent. Because matching can run as early as span start (streaming), only the span name and attributes set when the span begins are guaranteed to be available — do not rely on attributes added later in the span's lifetime.

```js
Sentry.init({
  traceLifecycle: 'stream',
  ignoreSpans: [
    // String match against span name
    '/health',
    '/ready',

    // RegExp match against span name
    /^OPTIONS /,

    // Object filter — all conditions must match
    {
      op: 'middleware.handle',
      name: /^corsMiddleware/,
    },

    // Filter by attributes (string = substring match, RegExp for patterns)
    {
      op: 'http.server',
      attributes: {
        'http.route': /^\/internal\//,
      },
    },
  ],
});
```

**Filter object properties:**

| Property | Type | Matches Against |
|---|---|---|
| `name` | `string \| RegExp` | Span name (description) |
| `op` | `string \| RegExp` | Span operation |
| `attributes` | `Record<string, string \| RegExp \| number \| boolean \| Array>` | Span attributes |

When multiple properties are specified in a filter object, **all** must match for the span to be ignored.

### 2.5 Set Up Browser Profiling (Optional)

When using span streaming in the browser, use the **v2 profiling options** — not the legacy `profilesSampleRate`. The legacy option is deprecated and does not integrate with the span streaming lifecycle.

Add `browserProfilingIntegration()` and configure the two v2 options:

```js
// Before (legacy profiling — do NOT use with span streaming)
Sentry.init({
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 0.5, // deprecated
});

// After (v2 profiling with span streaming)
Sentry.init({
  integrations: [
    Sentry.spanStreamingIntegration(),
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',
});
```

**v2 profiling options:**

| Option | Type | Description |
|---|---|---|
| `profileSessionSampleRate` | `number` (0–1) | Percentage of user sessions that have profiling enabled. Default: `0` (disabled). |
| `profileLifecycle` | `'trace' \| 'manual'` | `'trace'`: profiler runs automatically while sampled root spans exist. `'manual'`: start/stop profiler explicitly via `Sentry.uiProfiler.startProfiler()` / `stopProfiler()`. Default: `'manual'`. |

**`profileLifecycle: 'trace'`** requires tracing to be enabled (`tracesSampleRate` or `tracesSampler`). The profiler starts when a root span begins and stops when no sampled root spans remain. Profile chunks are sent independently every 60 seconds or when the last root span ends.

Do **not** mix legacy and v2 options. If `profilesSampleRate` is set, `profileSessionSampleRate` has no effect and the SDK logs a warning.

---

## Phase 3: Verify

After applying changes, verify the migration works correctly.

### 3.1 Build Check

```bash
# TypeScript check
npx tsc --noEmit 2>&1 | head -30

# Build
npm run build 2>&1 | tail -20
```

### 3.2 Runtime Verification

Instruct the user to verify in their browser devtools or server logs:

1. **Check network tab**: Span envelopes should appear as individual requests with content type `application/vnd.sentry.items.span.v2+json` rather than transaction envelopes
2. **Check Sentry dashboard**: Spans should appear in the Traces view shortly after they complete, without waiting for the full transaction to finish
3. **Check for fallback warnings**: If the SDK logs warnings about falling back to static mode, the `beforeSendSpan` callback is likely missing the `withStreamedSpan` wrapper

### 3.3 Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| SDK falls back to static mode | `beforeSendSpan` not wrapped with `withStreamedSpan` | Wrap callback: `Sentry.withStreamedSpan(callback)` |
| `beforeSendTransaction` not called | Expected in streaming mode | Migrate logic to `beforeSendSpan` or `ignoreSpans` |
| Spans still arrive as transactions | `traceLifecycle` not set or integration missing | Server: add `traceLifecycle: 'stream'`; Browser: add `spanStreamingIntegration()` |
| Type errors on `span.description` | `StreamedSpanJSON` uses `name` not `description` | Change `span.description` to `span.name` in callback |
| Type errors on `span.data` | `StreamedSpanJSON` uses `attributes` not `data` | Change `span.data` to `span.attributes` in callback |
| `profileSessionSampleRate` has no effect | Legacy `profilesSampleRate` is also set | Remove `profilesSampleRate` and use only `profileSessionSampleRate` + `profileLifecycle` |

---

## Quick Reference

### Minimal Server Setup

```js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: '__DSN__',
  tracesSampleRate: 1.0,
  traceLifecycle: 'stream',
});
```

### Minimal Browser Setup

```js
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: '__DSN__',
  integrations: [
    Sentry.spanStreamingIntegration(),
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});
```

### Browser Setup with Profiling

```js
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: '__DSN__',
  integrations: [
    Sentry.spanStreamingIntegration(),
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',
});
```

### Full Migration Checklist

- [ ] SDK version is `>=10.53.1`
- [ ] Server configs: added `traceLifecycle: 'stream'`
- [ ] Browser configs: added `spanStreamingIntegration()`
- [ ] `beforeSendSpan` callbacks wrapped with `Sentry.withStreamedSpan()`
- [ ] `beforeSendSpan` callbacks updated: `description` -> `name`, `data` -> `attributes`
- [ ] `beforeSendTransaction` logic migrated to `beforeSendSpan` or `ignoreSpans`
- [ ] `beforeSendTransaction` removed from config
- [ ] (If profiling) Replaced `profilesSampleRate` with `profileSessionSampleRate` + `profileLifecycle`
- [ ] (If profiling) Added `browserProfilingIntegration()` to integrations
- [ ] Build passes with no type errors
- [ ] Spans visible in Sentry dashboard
