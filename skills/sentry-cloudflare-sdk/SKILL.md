---
name: sentry-cloudflare-sdk
description: Full Sentry SDK setup for Cloudflare Workers and Pages. Use when asked to "add Sentry to Cloudflare Workers", "install @sentry/cloudflare", or configure error monitoring, tracing, logging, crons, or AI monitoring for Cloudflare Workers, Pages, Durable Objects, Queues, Workflows, or Hono on Cloudflare.
license: Apache-2.0
category: sdk-setup
parent: sentry-sdk-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [SDK Setup](../sentry-sdk-setup/SKILL.md) > Cloudflare SDK

# Sentry Cloudflare SDK

Opinionated wizard that scans your Cloudflare project and guides you through complete Sentry setup for Workers, Pages, Durable Objects, Queues, Workflows, and Hono.

## Invoke This Skill When

- User asks to "add Sentry to Cloudflare Workers" or "set up Sentry" in a Cloudflare project
- User wants to install or configure `@sentry/cloudflare`
- User wants error monitoring, tracing, logging, crons, or AI monitoring for Cloudflare Workers or Pages
- User asks about `withSentry`, `sentryPagesPlugin`, `instrumentDurableObjectWithSentry`, or `instrumentD1WithSentry`
- User wants to monitor Durable Objects, Queues, Workflows, Scheduled handlers, or Email handlers on Cloudflare

> **Note:** SDK versions and APIs below reflect current Sentry docs at time of writing (`@sentry/cloudflare` v10.43.0).
> Always verify against [docs.sentry.io/platforms/javascript/guides/cloudflare/](https://docs.sentry.io/platforms/javascript/guides/cloudflare/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making any recommendations:

```bash
# Detect Cloudflare project
ls wrangler.toml wrangler.jsonc wrangler.json 2>/dev/null

# Detect existing Sentry
cat package.json 2>/dev/null | grep -E '"@sentry/'

# Detect project type (Workers vs Pages)
ls functions/ functions/_middleware.js functions/_middleware.ts 2>/dev/null && echo "Pages detected"
cat wrangler.toml 2>/dev/null | grep -E 'main|pages_build_output_dir'

# Detect framework
cat package.json 2>/dev/null | grep -E '"hono"|"remix"|"astro"|"svelte"'

# Detect Durable Objects
cat wrangler.toml 2>/dev/null | grep -i 'durable_objects'

# Detect D1 databases
cat wrangler.toml 2>/dev/null | grep -i 'd1_databases'

# Detect Queues
cat wrangler.toml 2>/dev/null | grep -i 'queues'

# Detect Workflows
cat wrangler.toml 2>/dev/null | grep -i 'workflows'

# Detect Scheduled handlers (cron triggers)
cat wrangler.toml 2>/dev/null | grep -i 'crons\|triggers'

# Detect compatibility flags
cat wrangler.toml 2>/dev/null | grep -i 'compatibility_flags'
cat wrangler.jsonc 2>/dev/null | grep -i 'compatibility_flags'

# Detect AI/LLM libraries
cat package.json 2>/dev/null | grep -E '"openai"|"@anthropic-ai"|"ai"|"@google/generative-ai"|"@langchain"'

# Detect logging libraries
cat package.json 2>/dev/null | grep -E '"pino"|"winston"'

# Check for companion frontend
ls frontend/ web/ client/ 2>/dev/null
cat package.json 2>/dev/null | grep -E '"react"|"vue"|"svelte"|"next"'
```

**What to determine:**

| Question | Impact |
|----------|--------|
| Workers or Pages? | Determines wrapper: `withSentry` vs `sentryPagesPlugin` |
| Hono framework? | Automatic Hono error handler integration via `honoIntegration` |
| `@sentry/cloudflare` already installed? | Skip install, go to feature config |
| Durable Objects configured? | Recommend `instrumentDurableObjectWithSentry` |
| D1 databases bound? | Recommend `instrumentD1WithSentry` |
| Queues configured? | `withSentry` auto-instruments queue handlers |
| Workflows configured? | Recommend `instrumentWorkflowWithSentry` |
| Cron triggers configured? | `withSentry` auto-instruments scheduled handlers; recommend Crons monitoring |
| `nodejs_als` or `nodejs_compat` flag set? | **Required** — SDK needs `AsyncLocalStorage` |
| AI/LLM libraries? | Recommend AI Monitoring integrations |
| Companion frontend? | Trigger Phase 4 cross-link |

---

## Phase 2: Recommend

Present a concrete recommendation based on what you found. Don't ask open-ended questions — lead with a proposal:

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; captures unhandled exceptions in fetch, scheduled, queue, email, and Durable Object handlers
- ✅ **Tracing** — automatic HTTP request spans, outbound fetch tracing, D1 query spans

**Optional (enhanced observability):**
- ⚡ **Logging** — structured logs via `Sentry.logger.*`; recommend when log search is needed
- ⚡ **Crons** — detect missed/failed scheduled jobs; recommend when cron triggers are configured
- ⚡ **D1 Instrumentation** — automatic query spans and breadcrumbs; recommend when D1 is bound
- ⚡ **Durable Objects** — automatic error capture and spans for DO methods; recommend when DOs are configured
- ⚡ **Workflows** — automatic span creation for workflow steps; recommend when Workflows are configured
- ⚡ **AI Monitoring** — Vercel AI SDK, OpenAI, Anthropic, LangChain; recommend when AI libraries detected

**Recommendation logic:**

| Feature | Recommend when... |
|---------|------------------|
| Error Monitoring | **Always** — non-negotiable baseline |
| Tracing | **Always** — HTTP request tracing and outbound fetch are high-value |
| Logging | App needs structured log search or log-to-trace correlation |
| Crons | Cron triggers configured in `wrangler.toml` |
| D1 Instrumentation | D1 database bindings present |
| Durable Objects | Durable Object bindings configured |
| Workflows | Workflow bindings configured |
| AI Monitoring | App uses Vercel AI SDK, OpenAI, Anthropic, or LangChain |
| Metrics | App needs custom counters, gauges, or distributions |

Propose: *"I recommend setting up Error Monitoring + Tracing. Want me to also add D1 instrumentation and Crons monitoring?"*

---

## Phase 3: Guide

### Option 1: Source Maps Wizard

> **You need to run this yourself** — the wizard opens a browser for login and requires interactive input that the agent can't handle. Copy-paste into your terminal:
>
> ```
> npx @sentry/wizard@latest -i sourcemaps
> ```
>
> This sets up source map uploading so your production stack traces show readable code. It does **not** set up the SDK initialization — you still need to follow Option 2 below for the actual SDK setup.
>
> **Once it finishes, continue with Option 2 for SDK setup.**

> **Note:** Unlike framework SDKs (Next.js, SvelteKit), there is no Cloudflare-specific wizard integration. The `sourcemaps` wizard only handles source map upload configuration.

---

### Option 2: Manual Setup

#### Prerequisites: Compatibility Flags

The SDK requires `AsyncLocalStorage`. Add **one** of these flags to your Wrangler config:

**wrangler.toml:**
```toml
compatibility_flags = ["nodejs_als"]
# or: compatibility_flags = ["nodejs_compat"]
```

**wrangler.jsonc:**
```jsonc
{
  "compatibility_flags": ["nodejs_als"]
}
```

> `nodejs_als` is lighter — it only enables `AsyncLocalStorage`. Use `nodejs_compat` if your code also needs other Node.js APIs.

#### Install

```bash
npm install @sentry/cloudflare
```

#### Workers Setup

Wrap your handler with `withSentry`. This automatically instruments `fetch`, `scheduled`, `queue`, `email`, and `tail` handlers:

```typescript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    enableLogs: true,
  }),
  {
    async fetch(request, env, ctx) {
      return new Response("Hello World!");
    },
  } satisfies ExportedHandler<Env>,
);
```

**Key points:**
- The first argument is a callback that receives `env` — use this to read secrets like `SENTRY_DSN`
- The SDK reads DSN, environment, release, debug, tunnel, and traces sample rate from `env` automatically (see [Environment Variables](#environment-variables))
- `withSentry` wraps all exported handlers — you do not need separate wrappers for `scheduled`, `queue`, etc.

#### Pages Setup

Use `sentryPagesPlugin` as middleware:

```typescript
// functions/_middleware.ts
import * as Sentry from "@sentry/cloudflare";

export const onRequest = Sentry.sentryPagesPlugin((context) => ({
  dsn: context.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  enableLogs: true,
}));
```

**Chaining multiple middlewares:**

```typescript
import * as Sentry from "@sentry/cloudflare";

export const onRequest = [
  // Sentry must be first
  Sentry.sentryPagesPlugin((context) => ({
    dsn: context.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  })),
  // Add more middlewares here
];
```

**Using `wrapRequestHandler` directly** (for frameworks like SvelteKit on Cloudflare Pages):

```typescript
import * as Sentry from "@sentry/cloudflare";

export const handle = ({ event, resolve }) => {
  return Sentry.wrapRequestHandler(
    {
      options: {
        dsn: event.platform.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
      },
      request: event.request,
      context: event.platform.ctx,
    },
    () => resolve(event),
  );
};
```

#### Hono on Cloudflare Workers

Hono apps are objects with a `fetch` method — wrap them with `withSentry` directly:

```typescript
import { Hono } from "hono";
import * as Sentry from "@sentry/cloudflare";

const app = new Hono();

app.get("/", (ctx) => ctx.json({ message: "Hello" }));

app.get("/error", () => {
  throw new Error("Test error");
});

app.onError((err, ctx) => {
  return ctx.json({ error: err.message }, 500);
});

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  app,
);
```

The `honoIntegration` (enabled by default) automatically captures errors from Hono's `onError` handler and sets the correct transaction name with the route path.

#### Set Up the SENTRY_DSN Secret

Store your DSN as a Cloudflare secret — do not hardcode it:

```bash
# Local development: add to .dev.vars
echo 'SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"' >> .dev.vars

# Production: set as a secret
npx wrangler secret put SENTRY_DSN
```

Add the binding to your `Env` type:

```typescript
interface Env {
  SENTRY_DSN: string;
  // ... other bindings
}
```

#### Source Maps Setup

Source maps make production stack traces readable. Without them, you see minified/bundled code.

**Step 1: Generate a Sentry auth token**

Go to [sentry.io/settings/auth-tokens/](https://sentry.io/settings/auth-tokens/) and create a token with `project:releases` and `org:read` scopes.

**Step 2: Install the Sentry Vite plugin** (most Cloudflare projects use Vite via Wrangler):

```bash
npm install @sentry/vite-plugin --save-dev
```

**Step 3: Configure `vite.config.ts`** (if your project has one):

```typescript
import { defineConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: "___ORG_SLUG___",
      project: "___PROJECT_SLUG___",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

**Step 4: Set environment variables in CI**

```bash
SENTRY_AUTH_TOKEN=sntrys_eyJ...
SENTRY_ORG=my-org
SENTRY_PROJECT=my-project
```

**Step 5: Add to `.gitignore`**

```
.dev.vars
.env.sentry-build-plugin
```

---

### Automatic Release Detection

The SDK can automatically detect the release version via Cloudflare's version metadata binding:

**wrangler.toml:**
```toml
[version_metadata]
binding = "CF_VERSION_METADATA"
```

Release priority (highest to lowest):
1. `release` option passed to `Sentry.init()`
2. `SENTRY_RELEASE` environment variable
3. `CF_VERSION_METADATA.id` binding

---

### For Each Agreed Feature

Load the corresponding reference file and follow its steps:

| Feature | Reference file | Load when... |
|---------|---------------|-------------|
| Error Monitoring | `references/error-monitoring.md` | Always (baseline) — unhandled exceptions, manual capture, scopes, enrichment |
| Tracing | `references/tracing.md` | HTTP request tracing, outbound fetch spans, D1 query spans, distributed tracing |
| Logging | `references/logging.md` | Structured logs via `Sentry.logger.*`, log-to-trace correlation |
| Crons | `references/crons.md` | Scheduled handler monitoring, `withMonitor`, check-in API |
| Durable Objects | `references/durable-objects.md` | Instrument Durable Object classes for error capture and spans |

For each feature: read the reference file, follow its steps exactly, and verify before moving on.

---

## Verification

After setup, verify Sentry is working:

```typescript
// Add temporarily to your fetch handler, then remove
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  {
    async fetch(request, env, ctx) {
      throw new Error("Sentry test error — delete me");
    },
  } satisfies ExportedHandler<Env>,
);
```

Deploy and trigger the route, then check your [Sentry Issues dashboard](https://sentry.io/issues/) — the error should appear within ~30 seconds.

**Verification checklist:**

| Check | How |
|-------|-----|
| Errors captured | Throw in a fetch handler, verify in Sentry |
| Tracing working | Check Performance tab for HTTP spans |
| Source maps working | Check stack trace shows readable file/line names |
| D1 spans (if configured) | Run a D1 query, check for `db.query` spans |
| Scheduled monitoring (if configured) | Trigger a cron, check Crons dashboard |

---

## Config Reference

### `Sentry.init()` Options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `dsn` | `string` | — | Required. Read from `env.SENTRY_DSN` automatically if not set |
| `tracesSampleRate` | `number` | — | 0–1; 1.0 in dev, lower in prod recommended |
| `tracesSampler` | `function` | — | Dynamic sampling function; mutually exclusive with `tracesSampleRate` |
| `sendDefaultPii` | `boolean` | `false` | Include request headers and cookies in events |
| `enableLogs` | `boolean` | `false` | Enable Sentry Logs product |
| `environment` | `string` | auto | Read from `env.SENTRY_ENVIRONMENT` if not set |
| `release` | `string` | auto | Detected from `CF_VERSION_METADATA.id` or `SENTRY_RELEASE` |
| `debug` | `boolean` | `false` | Read from `env.SENTRY_DEBUG` if not set. Log SDK activity to console |
| `tunnel` | `string` | — | Read from `env.SENTRY_TUNNEL` if not set |
| `beforeSend` | `function` | — | Filter/modify error events before sending |
| `beforeSendTransaction` | `function` | — | Filter/modify transaction events before sending |
| `beforeSendLog` | `function` | — | Filter/modify log entries before sending |
| `tracePropagationTargets` | `(string\|RegExp)[]` | all URLs | Control which outbound requests get trace headers |
| `skipOpenTelemetrySetup` | `boolean` | `false` | Opt-out of OpenTelemetry compatibility tracer |
| `instrumentPrototypeMethods` | `boolean \| string[]` | `false` | Durable Object: instrument prototype methods for RPC spans |

### Environment Variables (Read from `env`)

The SDK reads these from the Cloudflare `env` object automatically:

| Variable | Purpose |
|----------|---------|
| `SENTRY_DSN` | DSN for Sentry init |
| `SENTRY_RELEASE` | Release version string |
| `SENTRY_ENVIRONMENT` | Environment name (`production`, `staging`) |
| `SENTRY_TRACES_SAMPLE_RATE` | Traces sample rate (parsed as float) |
| `SENTRY_DEBUG` | Enable debug mode (`"true"` / `"1"`) |
| `SENTRY_TUNNEL` | Tunnel URL for event proxying |
| `CF_VERSION_METADATA` | Cloudflare version metadata binding (auto-detected release) |

### Default Integrations

These are registered automatically by `getDefaultIntegrations()`:

| Integration | Purpose |
|-------------|---------|
| `dedupeIntegration` | Prevent duplicate events (disabled for Workflows) |
| `inboundFiltersIntegration` | Filter events by type, message, URL |
| `functionToStringIntegration` | Preserve original function names |
| `linkedErrorsIntegration` | Follow `cause` chains in errors |
| `fetchIntegration` | Trace outbound `fetch()` calls, create breadcrumbs |
| `honoIntegration` | Auto-capture Hono `onError` exceptions |
| `requestDataIntegration` | Attach request data to events |
| `consoleIntegration` | Capture `console.*` calls as breadcrumbs |

---

## Phase 4: Cross-Link

After completing Cloudflare setup, check for companion services:

```bash
# Check for companion frontend
ls frontend/ web/ client/ ui/ 2>/dev/null
cat package.json 2>/dev/null | grep -E '"react"|"vue"|"svelte"|"next"|"astro"'

# Check for companion backend in adjacent directories
ls ../backend ../server ../api 2>/dev/null
cat ../go.mod ../requirements.txt ../Gemfile 2>/dev/null | head -3
```

If a frontend is found, suggest the matching SDK skill:

| Frontend detected | Suggest skill |
|------------------|--------------|
| React | `sentry-react-sdk` |
| Next.js | `sentry-nextjs-sdk` |
| Svelte/SvelteKit | `sentry-svelte-sdk` |
| Vue/Nuxt | See [docs.sentry.io/platforms/javascript/guides/vue/](https://docs.sentry.io/platforms/javascript/guides/vue/) |

If a backend is found in a different directory:

| Backend detected | Suggest skill |
|-----------------|--------------|
| Go (`go.mod`) | `sentry-go-sdk` |
| Python (`requirements.txt`, `pyproject.toml`) | `sentry-python-sdk` |
| Ruby (`Gemfile`) | `sentry-ruby-sdk` |
| Node.js (Express, Fastify) | `sentry-node-sdk` |

Connecting frontend and backend with linked Sentry projects enables **distributed tracing** — stack traces that span your browser, Cloudflare Worker, and backend API in a single trace view.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Events not appearing | DSN not set or `debug: false` hiding errors | Set `debug: true` temporarily in init options; verify `SENTRY_DSN` secret is set with `wrangler secret list` |
| `AsyncLocalStorage is not defined` | Missing compatibility flag | Add `nodejs_als` or `nodejs_compat` to `compatibility_flags` in `wrangler.toml` |
| Stack traces show minified code | Source maps not uploaded | Configure `@sentry/vite-plugin` or run `npx @sentry/wizard -i sourcemaps`; verify `SENTRY_AUTH_TOKEN` in CI |
| Events lost on short-lived requests | SDK not flushing before worker terminates | Ensure `withSentry` or `sentryPagesPlugin` wraps your handler — they use `ctx.waitUntil()` to flush |
| Hono errors not captured | Hono app not wrapped with `withSentry` | Pass the Hono app as the second argument to `Sentry.withSentry()` |
| Durable Object errors missing | DO class not instrumented | Wrap class with `Sentry.instrumentDurableObjectWithSentry()` — see `references/durable-objects.md` |
| D1 queries not creating spans | D1 binding not instrumented | Wrap binding with `Sentry.instrumentD1WithSentry(env.DB)` before use |
| Scheduled handler not monitored | `withSentry` not wrapping the handler | Ensure `export default Sentry.withSentry(...)` wraps your entire exported handler object |
| Release not auto-detected | `CF_VERSION_METADATA` binding not configured | Add `[version_metadata]` with `binding = "CF_VERSION_METADATA"` to `wrangler.toml` |
| Duplicate events in Workflows | Dedupe integration filtering step failures | SDK automatically disables dedupe for Workflows; verify you use `instrumentWorkflowWithSentry` |
