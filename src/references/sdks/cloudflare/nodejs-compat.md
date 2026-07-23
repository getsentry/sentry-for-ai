# Node.js Compatibility Entrypoint — Sentry Cloudflare SDK

> `@sentry/cloudflare/nodejs_compat` entrypoint: v10.64.0+
> Prisma integration (Cloudflare): via `/nodejs_compat` entrypoint only
> Requires the `nodejs_compat` compatibility flag in Wrangler config

---

## Overview

Cloudflare Workers can run with Node.js APIs enabled through the [`nodejs_compat` compatibility flag](https://developers.cloudflare.com/workers/runtime-apis/nodejs/). To take advantage of this, the Cloudflare SDK ships a dedicated `@sentry/cloudflare/nodejs_compat` entrypoint that unlocks Node.js SDK features which aren't available in the default Workers runtime.

**Using this entrypoint is generally recommended, and it's the default choice for new projects.** It's a drop-in replacement for the default `@sentry/cloudflare` import that adds functionality (see [What It Unlocks](#what-it-unlocks)) without removing anything — and it becomes the default entrypoint in v11, so adopting it now keeps you ahead of that change. The only prerequisite is the `nodejs_compat` flag, which is itself a superset of the `nodejs_als` flag the SDK already needs. For a new Worker, enable `nodejs_compat` and import from `@sentry/cloudflare/nodejs_compat` from the start.

> The `/nodejs_compat` entrypoint requires SDK version `10.64.0` or higher. It will become the **default entrypoint in the next major version (v11)**.

### What It Unlocks

The `/nodejs_compat` entrypoint enables Node.js-only integrations and features on Cloudflare, including:

- **`prismaIntegration`** — tracing Prisma ORM queries (see [Prisma Integration](#prisma-integration) below)
- **Vercel AI SDK v7 support** for the `vercelAIIntegration`

---

## Usage

The entrypoint is a drop-in replacement for `@sentry/cloudflare` — switching over only requires changing your imports:

```typescript
// Before
import * as Sentry from "@sentry/cloudflare";

// After
import * as Sentry from "@sentry/cloudflare/nodejs_compat";
```

Everything else (`withSentry`, `sentryPagesPlugin`, `instrumentDurableObjectWithSentry`, etc.) works exactly the same.

### Prerequisite: `nodejs_compat` Flag

To use the entrypoint, your Worker must set the `nodejs_compat` compatibility flag in your Wrangler configuration:

**wrangler.jsonc:**
```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
}
```

**wrangler.toml:**
```toml
compatibility_flags = ["nodejs_compat"]
```

> `nodejs_compat` is a superset of `nodejs_als` — it enables `AsyncLocalStorage` (which the SDK requires) plus the rest of the Node.js compatibility surface. If you're already on `nodejs_compat`, using the `/nodejs_compat` entrypoint is recommended.

---

## Prisma Integration

On Cloudflare, the `prismaIntegration` is **only** available through the `/nodejs_compat` entrypoint.

Import Sentry from the `@sentry/cloudflare/nodejs_compat` entrypoint and add `prismaIntegration` to your init options:

```typescript
import * as Sentry from "@sentry/cloudflare/nodejs_compat";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    integrations: [Sentry.prismaIntegration()],
  }),
  {
    async fetch(request, env, ctx) {
      return new Response("OK");
    },
  } satisfies ExportedHandler<Env>,
);
```

The integration creates a span for each query and reports relevant details to Sentry.

**Supported Prisma versions:** `5.x`, `6.x`, `7.x`.

In Prisma **v5**, you also need to add the `tracing` preview feature to the `generator` block of your Prisma schema:

```txt
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["tracing"]
}
```

For details on the span structure Prisma's OpenTelemetry tracing produces (e.g., `prisma:client:operation`, `prisma:engine:db_query`), see the [Prisma trace output docs](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing#trace-output).

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `prismaIntegration` not found / no Prisma spans | Importing from the default entrypoint | Import from `@sentry/cloudflare/nodejs_compat` and ensure SDK ≥ v10.64.0 |
| Prisma v5 produces no spans | Missing `tracing` preview feature | Add `previewFeatures = ["tracing"]` to the `generator` block in `schema.prisma` |
| Node.js APIs undefined at runtime | Using `/nodejs_compat` entrypoint without the flag | Add `nodejs_compat` to `compatibility_flags` in Wrangler config |
