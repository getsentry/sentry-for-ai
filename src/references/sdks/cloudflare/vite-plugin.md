# Sentry Cloudflare Vite Plugin

> `@sentry/cloudflare/vite` plugin: v10.68.0+
> Requires `nodejs_compat` compatibility flag
> Requires the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)

---

## Overview

The Sentry Cloudflare Vite plugin (`sentryCloudflareVitePlugin` from `@sentry/cloudflare/vite`) instruments your Worker at build time. It can:

1. **Instrument bundled dependencies** — injects `diagnostics_channel.tracingChannel` calls into supported packages (such as database clients like `mysql`) so the SDK can trace them without monkey-patching, which `workerd` doesn't support. This gives you more traces out of the box.
2. **Auto-instrument your Worker entry** — optionally wraps your default export with `Sentry.withSentry()` and Durable Objects with `instrumentDurableObjectWithSentry()` at build time, so you don't need to edit your application code.

**Recommend this approach for all new Cloudflare Workers projects.** It's the most complete way to get tracing for bundled dependencies in the Workers runtime. If the project already uses `wrangler` directly, suggest migrating (see [Migrating From Wrangler](#migrating-from-wrangler) below).

## When to Use

| Situation | Recommendation |
|-----------|---------------|
| New Cloudflare Worker project | **Use Vite + this plugin** — recommended |
| Existing project with `wrangler deploy` | **Migrate to Vite** — see [Migrating From Wrangler](#migrating-from-wrangler) |
| Existing project already on Vite | **Add this plugin** — add `sentryCloudflareVitePlugin` to `vite.config.ts` |
| Cloudflare Pages project | Plugin is for Workers. Pages uses `sentryPagesPlugin` (no build-time instrumentation needed) |

## Prerequisites

- The `nodejs_compat` compatibility flag must be enabled in `wrangler.(jsonc|toml)` — see `./nodejs-compat.md`
- Worker must be built with the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)

## Configuration

Enable `useDiagnosticsChannelInjection` to trace supported bundled dependencies, and wrap your handler with `withSentry` as usual:

```typescript
// vite.config.ts
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare(),
    sentryCloudflareVitePlugin({
      _experimental: {
        useDiagnosticsChannelInjection: true,
      },
    }),
  ],
});
```

```typescript
// index.ts
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env) => ({
    dsn: "___PUBLIC_DSN___",
    tracesSampleRate: 1.0,
  }),
  {
    async fetch(request, env) {
      return new Response("...");
    },
  }
);
```

### Auto-instrumentation (Experimental)

Alternatively, the plugin can wrap your Worker for you at build time, so you don't need `withSentry` in your code. Enable `autoInstrumentation` and the plugin reads your `wrangler.(jsonc|toml)` to find the entry point, Durable Objects, and workflows:

```typescript
// vite.config.ts
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare(),
    sentryCloudflareVitePlugin({
      _experimental: {
        autoInstrumentation: true,
        useDiagnosticsChannelInjection: true,
      },
    }),
  ],
});
```

With auto-instrumentation, you can optionally provide Sentry options via a co-located `instrument.server.*` file (`.ts`, `.mts`, `.js`, `.mjs`, or `.cjs`) next to your Worker entry. Use `defineCloudflareOptions` for full type-checking:

```typescript
// instrument.server.ts (next to your worker entry)
import { defineCloudflareOptions } from "@sentry/cloudflare";

export default defineCloudflareOptions((env) => ({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
}));
```

If no `instrument.server.*` file exists, the SDK reads all configuration (DSN, release, environment, sample rate, etc.) from the Worker's `env` bindings at runtime.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `_experimental.autoInstrumentation` | `boolean` | `false` | Auto-wraps the Worker entry with `withSentry()` and Durable Objects with `instrumentDurableObjectWithSentry()`. Sources options from `instrument.server.*` file, falling back to `env`. |
| `_experimental.useDiagnosticsChannelInjection` | `boolean` | `false` | Injects `diagnostics_channel` calls into bundled packages for build-time instrumentation of dependencies (e.g. `mysql`, `pg`). |

Both options are **experimental** and may change or be removed in any release.

## Migrating From Wrangler

If the project deploys with `wrangler` directly:

1. Set up the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/get-started/) and add a `vite.config.ts` with `cloudflare()` and `sentryCloudflareVitePlugin()`.
2. Run `vite build` before `wrangler deploy`, and use `vite dev` in place of `wrangler dev` for local development.
3. The existing `wrangler.jsonc` becomes the input config — the plugin generates the deployed output during the build.

For the full list of fields that change or become redundant, see Cloudflare's [Migrating from Wrangler](https://developers.cloudflare.com/workers/vite-plugin/reference/migrating-from-wrangler-dev/) guide.

## Combining with Source Maps

The Cloudflare Vite plugin can be combined with the `@sentry/vite-plugin` for source map uploads. Add both to `vite.config.ts`:

```typescript
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryCloudflareVitePlugin } from "@sentry/cloudflare/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    cloudflare(),
    sentryCloudflareVitePlugin({
      _experimental: {
        useDiagnosticsChannelInjection: true,
      },
    }),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```