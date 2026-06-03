---
name: sentry-span-streaming
description: Migrate to Sentry span streaming (span-first trace lifecycle). Use when asked to "enable span streaming", "migrate to span streaming", "use traceLifecycle stream", "add spanStreamingIntegration", or switch from transaction-based to streamed span delivery.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Span Streaming

# Sentry Span Streaming Migration

Migrate from the default transaction-based trace lifecycle (`static`) to span streaming (`stream`), where spans are sent individually as they complete instead of being batched into a transaction at the end.

## Invoke This Skill When

- User asks to "enable span streaming" or "migrate to span streaming"
- User wants to switch from transaction-based to streamed span delivery
- User mentions `traceLifecycle`, `spanStreamingIntegration`, or `withStreamedSpan`
- User wants lower latency span delivery or per-span processing

## Supported Platforms

| Platform | Status |
|---|---|
| JavaScript (Browser, Node.js, Bun, Deno, Cloudflare) | Supported |
| Python | Supported |
| Ruby | Not yet available |
| Go | Not yet available |
| Other SDKs | Not yet available |

If the user's project does not use a supported SDK, inform them that span streaming is currently only available for supported SDKs and stop here.

---

## Detect Platform

Identify the user's platform and SDK, then follow the corresponding migration section below.

```bash
# Check for JavaScript Sentry packages
cat package.json 2>/dev/null | grep -E '"@sentry/'

# Check for Python Sentry
cat requirements.txt setup.py pyproject.toml 2>/dev/null | grep -i sentry

# Check for Ruby Sentry
cat Gemfile 2>/dev/null | grep sentry

# Check for Go Sentry
cat go.mod 2>/dev/null | grep sentry
```

If an unsupported Sentry SDK is detected, inform the user that span streaming is not yet available for their platform.

- **JavaScript SDK detected** — follow [JavaScript Migration](#javascript-migration)
- **Python SDK detected** — follow [Python Migration](#python-migration)

---

## JavaScript Migration

> Only follow this section if the detected SDK is JavaScript.

### Phase 1: Detect

#### 1.1 Detect Environment

```bash
# Detect if browser, server, or both
grep -rn "from '@sentry/browser'\|from '@sentry/react'\|from '@sentry/vue'\|from '@sentry/angular'\|from '@sentry/svelte'\|from '@sentry/nextjs'\|from '@sentry/nuxt'\|from '@sentry/sveltekit'\|from '@sentry/remix'\|from '@sentry/solidstart'\|from '@sentry/astro'\|from '@sentry/react-router'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null | head -20

grep -rn "from '@sentry/node'\|from '@sentry/bun'\|from '@sentry/deno'\|from '@sentry/cloudflare'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" -l 2>/dev/null | head -20
```

#### 1.2. Find Existing Sentry Config

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

#### 1.3 Classify Environment

Based on detection results, classify each `Sentry.init` call as:

| Environment | Packages | Migration Path |
|---|---|---|
| **Browser** | `@sentry/browser`, `@sentry/react`, `@sentry/vue`, `@sentry/angular`, `@sentry/svelte` | Add `spanStreamingIntegration()` |
| **Server** | `@sentry/node`, `@sentry/bun`, `@sentry/deno`, `@sentry/cloudflare` | Add `traceLifecycle: 'stream'` |
| **Framework (both)** | `@sentry/nextjs`, `@sentry/nuxt`, `@sentry/sveltekit`, `@sentry/remix`, `@sentry/astro`, `@sentry/solidstart`, `@sentry/react-router` | Migrate both client and server configs separately |

### Phase 2: Migrate

**Prerequisites:** Sentry JavaScript SDK `>=10.53.1` with tracing enabled (`tracesSampleRate` or `tracesSampler` configured).

Apply changes to each `Sentry.init` call. Work through each file identified above.

#### 2.1 Enable Span Streaming

##### Server-Side SDKs

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

##### Browser-Side SDKs

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

##### Framework SDKs (Client + Server)

Apply the browser migration to client config files and the server migration to server config files. Common patterns:

| Framework | Client Config | Server Config |
|---|---|---|
| Next.js | `sentry.client.config.ts` | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Nuxt | Client-side `Sentry.init` in module | Server-side `Sentry.init` in module |
| SvelteKit | `src/hooks.client.ts` | `src/hooks.server.ts` |
| Remix | `entry.client.tsx` | `entry.server.tsx` |
| Astro | Client-side init | Server-side init |

#### 2.2 Migrate `beforeSendSpan`

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

#### 2.3 Remove or Replace `beforeSendTransaction`

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

#### 2.4 Configure `ignoreSpans` (Optional)

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

#### 2.5 Set Up Browser Profiling (Optional)

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

### Phase 3: Verify

After applying changes, verify the migration works correctly.

#### 3.1 Build Check

```bash
# TypeScript check
npx tsc --noEmit 2>&1 | head -30

# Build
npm run build 2>&1 | tail -20
```

#### 3.2 Runtime Verification

Instruct the user to verify in their browser devtools or server logs:

1. **Check network tab**: Span envelopes should appear as individual requests with content type `application/vnd.sentry.items.span.v2+json` rather than transaction envelopes
2. **Check Sentry dashboard**: Spans should appear in the Traces view shortly after they complete, without waiting for the full transaction to finish
3. **Check for fallback warnings**: If the SDK logs warnings about falling back to static mode, the `beforeSendSpan` callback is likely missing the `withStreamedSpan` wrapper

#### 3.3 Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| SDK falls back to static mode | `beforeSendSpan` not wrapped with `withStreamedSpan` | Wrap callback: `Sentry.withStreamedSpan(callback)` |
| `beforeSendTransaction` not called | Expected in streaming mode | Migrate logic to `beforeSendSpan` or `ignoreSpans` |
| Spans still arrive as transactions | `traceLifecycle` not set or integration missing | Server: add `traceLifecycle: 'stream'`; Browser: add `spanStreamingIntegration()` |
| Type errors on `span.description` | `StreamedSpanJSON` uses `name` not `description` | Change `span.description` to `span.name` in callback |
| Type errors on `span.data` | `StreamedSpanJSON` uses `attributes` not `data` | Change `span.data` to `span.attributes` in callback |
| `profileSessionSampleRate` has no effect | Legacy `profilesSampleRate` is also set | Remove `profilesSampleRate` and use only `profileSessionSampleRate` + `profileLifecycle` |

### Quick Reference

#### Minimal Server Setup

```js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: '__DSN__',
  tracesSampleRate: 1.0,
  traceLifecycle: 'stream',
});
```

#### Minimal Browser Setup

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

#### Browser Setup with Profiling

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

#### Migration Checklist

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

---

## Python Migration

> Only follow this section if the detected SDK is Python.

### Detect Python Environment

```bash
# Find sentry_sdk.init calls
grep -rn "sentry_sdk\.init\|sentry_sdk\.init(" --include="*.py" -l 2>/dev/null | head -20

# Find existing start_span / start_transaction / start_child usage
grep -rn "start_span\|start_transaction\|start_child" --include="*.py" -l 2>/dev/null | head -20

# Find trace decorator usage
grep -rn "@trace\|from sentry_sdk import trace\|from sentry_sdk.tracing import trace" --include="*.py" -l 2>/dev/null | head -20

# Find continue_trace usage
grep -rn "continue_trace" --include="*.py" -l 2>/dev/null | head -20

# Find set_data / set_tag / set_context on spans
grep -rn "set_data\|set_tag\|set_context" --include="*.py" -l 2>/dev/null | head -20
```

### Enable Span Streaming

**Prerequisites:** `sentry-sdk` `>=TODO` with tracing enabled (`traces_sample_rate` or `traces_sampler` configured).

Add `trace_lifecycle` to `_experiments` in `sentry_sdk.init()`:

```python
import sentry_sdk

# Before
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
)

# After
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    _experiments={
        "trace_lifecycle": "stream",
    },
)
```

Span streaming requires using the new `sentry_sdk.traces.start_span` API. The legacy `sentry_sdk.start_span` and `sentry_sdk.start_transaction` APIs will not stream spans.

### Migrate Span Creation

#### `start_span`

Replace `sentry_sdk.start_span()` with `sentry_sdk.traces.start_span()`:

```python
import sentry_sdk

# Before
with sentry_sdk.start_span(name="flow.checkout") as span:
    ...

# After
with sentry_sdk.traces.start_span(name="flow.checkout") as span:
    ...
```

Or change the import:

```python
# Before
from sentry_sdk import start_span

# After
from sentry_sdk.traces import start_span
```

The new API accepts:
- `name` (required)
- `attributes` — key-value pairs (see Migrate Span Data below)
- `parent_span` — explicit parent span; defaults to the currently active span
- `active` — defaults to `True`; if `False`, the span won't become other spans' parent automatically

The `description` argument no longer exists — use `name` instead. The `op` argument is no longer supported — use the `sentry.op` attribute instead:

```python
# Before
with sentry_sdk.start_span(op="http.client", description="GET /api/users") as span:
    ...

# After
with sentry_sdk.traces.start_span(
    name="GET /api/users",
    attributes={"sentry.op": "http.client"},
) as span:
    ...
```

#### `start_transaction`

Replace `sentry_sdk.start_transaction()` with `sentry_sdk.traces.start_span()`:

```python
import sentry_sdk

# Before
with sentry_sdk.start_transaction(name="flow.checkout") as transaction:
    ...

# After
with sentry_sdk.traces.start_span(name="flow.checkout", parent_span=None) as span:
    ...
```

Setting `parent_span=None` forces the span to become a root span, which is the equivalent of starting a transaction in the legacy API.

#### `start_child`

`span.start_child()` no longer exists. Start a new span while the parent is active — it becomes a child automatically:

```python
import sentry_sdk

# Before
with sentry_sdk.start_span(name="outer") as parent:
    with parent.start_child(op="db", description="SELECT") as child:
        ...

# After
with sentry_sdk.traces.start_span(name="outer") as parent:
    with sentry_sdk.traces.start_span(
        name="SELECT",
        attributes={"sentry.op": "db"},
    ):
        ...
```

To control parentage explicitly (e.g. make a span a sibling rather than a child), use `parent_span`:

```python
with sentry_sdk.traces.start_span(name="outer") as span:
    with sentry_sdk.traces.start_span(name="child 1"):
        with sentry_sdk.traces.start_span(name="child 2", parent_span=span):
            # "child 2" is a sibling of "child 1", not its child
            ...
```

#### `@trace` Decorator

Replace `sentry_sdk.trace` with `sentry_sdk.traces.trace`:

```python
# Before
from sentry_sdk import trace

@trace
def checkout():
    ...

# After — just change the import
from sentry_sdk.traces import trace

@trace
def checkout():
    ...
```

The new decorator also accepts optional `name` (defaults to the function name), `attributes`, and `active` arguments:

```python
from sentry_sdk.traces import trace

@trace(name="checkout", attributes={"flow.pipeline": "legacy"})
def checkout():
    ...
```

#### `get_current_span`

Replace `sentry_sdk.get_current_span()` with `sentry_sdk.traces.get_current_span()`:

```python
# Before
from sentry_sdk import get_current_span

span = get_current_span()

# After
from sentry_sdk.traces import get_current_span

span = get_current_span()
```

### Migrate Span Data

In span streaming mode, spans have no contexts, data, or tags. Everything is a span attribute. Attribute keys are strings; values must be `int`, `bool`, `str`, `float`, or an array of these types. `None` is not supported. Unsupported types (e.g. objects) are cast to string.

#### Replace `set_data`

```python
# Before
span.set_data("flow.step", "submit_payment")

# After
span.set_attribute("flow.step", "submit_payment")
```

#### Replace `set_tag`

```python
# Before
span.set_tag("http.status_code", 201)

# After
span.set_attribute("http.response.status_code", 201)
```

#### Replace `set_context`

Dictionaries are not supported as attribute values. Flatten them into separate attributes:

```python
# Before
span.set_context("flow", {"id": "123456789", "pipeline": "legacy"})

# After
span.set_attributes({"flow.id": "123456789", "flow.pipeline": "legacy"})
```

#### Scope-Level Tags

Tags set on the scope with `sentry_sdk.set_tag()` are not applied to streaming spans. Use `sentry_sdk.set_attribute()` to apply data to spans:

```python
import sentry_sdk

sentry_sdk.set_tag("region", "Europe")       # applied to errors and other tag-supporting telemetry
sentry_sdk.set_attribute("region", "Europe")  # applied to spans, logs, metrics
```

#### Bulk Operations

```python
with sentry_sdk.traces.start_span(name="flow.checkout") as span:
    span.set_attribute("flow.version", "0.35")
    span.set_attributes({"flow.conversion": 1.0, "flow.use_new_pipeline": True})
    span.remove_attribute("flow.conversion")
```

#### Span Status

Status can only be `ok` (default) or `error`:

```python
from sentry_sdk.traces import start_span

with start_span(name="process") as span:
    try:
        ...
    except Exception:
        span.status = "error"
```

### Migrate Trace Propagation

`sentry_sdk.traces.continue_trace()` replaces the legacy `sentry_sdk.continue_trace()`. It is no longer a context manager — it sets the propagation context, and the next span picks it up automatically:

```python
import sentry_sdk

headers = {
    "sentry-trace": "4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1",
    "baggage": "sentry-trace_id=...",
}

# Before
with sentry_sdk.continue_trace(headers) as transaction:
    ...

# After
sentry_sdk.traces.continue_trace(headers)
with sentry_sdk.traces.start_span(name="handle request"):
    ...
```

To start a completely new trace, use `sentry_sdk.traces.new_trace()`:

```python
import sentry_sdk

with sentry_sdk.traces.start_span(name="span in trace 1"):
    ...

sentry_sdk.traces.new_trace()

with sentry_sdk.traces.start_span(name="span in trace 2"):
    # This span is the root of a new, separate trace
    ...
```

### Migrate Sampling

If you use `traces_sample_rate`, no changes are needed — it works the same way.

If you use a custom `traces_sampler`, the sampling context has a different structure in streaming mode:

```python
def traces_sampler(sampling_context):
    # sampling_context["span_context"] contains:
    #   name, trace_id, parent_span_id, parent_sampled, attributes
    if sampling_context["span_context"]["name"] in IGNORED_SPAN_NAMES:
        return 0.0
    return 1.0

sentry_sdk.init(
    traces_sampler=traces_sampler,
    _experiments={"trace_lifecycle": "stream"},
)
```

The sampling decision is made when `start_span()` is called. Child spans inherit the parent's sampling decision unless filtered by `ignore_spans`.

#### Custom Sampling Context

Custom sampling context is no longer an argument to `start_span`. Set it on the scope before starting the span:

```python
import sentry_sdk

def traces_sampler(sampling_context):
    if sampling_context["asgi_scope"].method not in ("GET", "POST"):
        return 0.0
    return 1.0

# Before
with sentry_sdk.start_span(
    name="handle request",
    custom_sampling_context={"asgi_scope": asgi_scope},
):
    ...

# After
sentry_sdk.get_current_scope().set_custom_sampling_context({"asgi_scope": asgi_scope})
with sentry_sdk.traces.start_span(name="handle request"):
    ...
```

Custom sampling context must be set **after** `continue_trace` (which resets propagation context) and **before** `start_span` (which is when sampling happens).

### Configure `ignore_spans` (Optional)

`ignore_spans` filters spans at creation time. Rules can be strings, compiled regexes, or dictionaries with `name` and/or `attributes` conditions:

```python
import re
import sentry_sdk

sentry_sdk.init(
    _experiments={
        "trace_lifecycle": "stream",
        "ignore_spans": [
            # String match against span name
            "/health",

            # Regex match against span name
            re.compile(r"/flow/.*"),

            # Match by attributes (all must match)
            {
                "attributes": {
                    "service.id": "15def9a",
                    "flow.pipeline": "legacy",
                }
            },

            # Match by name and attributes
            {
                "name": re.compile(r"/flow/.*"),
                "attributes": {
                    "service.id": re.compile(r".*\.facade"),
                },
            },
        ],
    },
)
```

Only the span name and attributes set at creation time are available for matching — attributes added later in the span's lifetime are not considered.

If an ignored span is a top-level span, its entire subtree is also ignored. If a non-top-level span is ignored, its children are not automatically ignored unless they match a rule themselves.

### Configure `before_send_span` (Optional)

`before_send_span` lets you modify spans before they leave the SDK, for example to sanitize sensitive values. It receives `span` and `hint` arguments and must return a span:

```python
import sentry_sdk

def postprocess_span(span, hint):
    attributes_to_sanitize = [
        "http.request.header.custom-auth",
        "http.request.header.custom-user-id",
    ]
    for attribute in attributes_to_sanitize:
        if span["attributes"].get(attribute):
            span["attributes"][attribute] = "[Sanitized]"
    return span

sentry_sdk.init(
    _experiments={
        "trace_lifecycle": "stream",
        "before_send_span": postprocess_span,
    },
)
```

`before_send_span` cannot be used to drop spans — use `ignore_spans` for that. If the callback returns anything other than a span dictionary, the return value is ignored.

### Python Verification

Instruct the user to verify:

1. **Check Sentry dashboard**: Spans should appear in the Traces view shortly after they complete, without waiting for the full transaction to finish
2. **Check logs**: Ensure no SDK warnings about unsupported span operations

#### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Spans not streaming | Using legacy `sentry_sdk.start_span` | Switch to `sentry_sdk.traces.start_span` |
| `AttributeError` on `start_child` | `start_child` removed in streaming mode | Use `sentry_sdk.traces.start_span` while parent is active |
| `None` attribute value rejected | `None` not supported as attribute value | Remove the attribute or use a sentinel string |
| `set_data`/`set_tag` has no effect on span | These methods don't apply to streaming spans | Use `span.set_attribute()` |
| Scope tags missing from spans | `set_tag` not applied to streaming spans | Use `sentry_sdk.set_attribute()` |
| Custom sampling context not available in `traces_sampler` | Set after `start_span` or before `continue_trace` | Set on scope after `continue_trace` but before `start_span` |

### Python Quick Reference

#### Minimal Setup

```python
import sentry_sdk

sentry_sdk.init(
    dsn="__DSN__",
    traces_sample_rate=1.0,
    _experiments={
        "trace_lifecycle": "stream",
    },
)
```

#### Creating Spans

```python
from sentry_sdk.traces import start_span

with start_span(name="my operation", attributes={"sentry.op": "task"}) as span:
    span.set_attribute("result.count", 42)
```

#### Python Migration Checklist

- [ ] SDK version is `>=TODO`
- [ ] Added `_experiments={"trace_lifecycle": "stream"}` to `sentry_sdk.init()`
- [ ] `sentry_sdk.start_span()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `sentry_sdk.start_transaction()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `span.start_child()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `sentry_sdk.get_current_span()` migrated to `sentry_sdk.traces.get_current_span()`
- [ ] `@sentry_sdk.trace` migrated to `@sentry_sdk.traces.trace`
- [ ] `description` replaced with `name`
- [ ] `op` replaced with `sentry.op` attribute
- [ ] `set_data()` / `set_tag()` / `set_context()` replaced with `set_attribute()`
- [ ] Scope-level `set_tag()` supplemented with `set_attribute()` where needed
- [ ] `continue_trace` migrated to non-context-manager `sentry_sdk.traces.continue_trace()`
- [ ] `custom_sampling_context` migrated to `scope.set_custom_sampling_context()`
- [ ] (If using `traces_sampler`) Updated to handle new `sampling_context` shape
- [ ] Spans visible in Sentry dashboard
