# TanStack Start Features — Sentry TanStack Start React SDK

> Framework target: TanStack Start React `1.0 RC`

---

## `sentryTanstackStart` Vite Plugin

Add the plugin in `vite.config.ts` and keep it last:

```typescript
import { defineConfig } from "vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    sentryTanstackStart({
      org: "___ORG_SLUG___",
      project: "___PROJECT_SLUG___",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

This plugin manages source map upload and instruments middleware tracing when tracing is enabled.

---

## Environment Token Handling

Set auth token in CI or local environment:

```bash
SENTRY_AUTH_TOKEN=___ORG_AUTH_TOKEN___
```

If loading from `.env` in Vite config, use `loadEnv`:

```typescript
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      sentryTanstackStart({
        authToken: env.SENTRY_AUTH_TOKEN,
      }),
    ],
  };
});
```

---

## Runtime Startup Options

### Preferred: `--import` startup

Use this when you can control Node startup flags.

1. Keep root `instrument.server.mjs`.
2. Copy it to runtime output location during build.
3. Start node with `--import`.

Example scripts:

```json
{
  "scripts": {
    "build": "vite build && cp instrument.server.mjs .output/server",
    "dev": "NODE_OPTIONS='--import ./instrument.server.mjs' vite dev --port 3000",
    "start": "node --import ./.output/server/instrument.server.mjs .output/server/index.mjs"
  }
}
```

### Fallback: direct import in server entry

Use when host/runtime does not allow startup flags.

```typescript
import "../instrument.server.mjs";
```

Limitation: only native Node.js APIs are instrumented; third-party library instrumentation is limited.

---

## Server Entry and Middleware Checklist

For full server coverage, confirm all three are present:

1. `instrument.server.mjs` with server `Sentry.init`.
2. `src/server.ts` wraps handler with `wrapFetchWithSentry`.
3. `src/start.ts` includes both Sentry global middleware first in arrays.

---

## Optional Tunnel Configuration

To reduce ad-blocker drops, configure tunnel route:

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  tunnel: "/tunnel",
});
```

Then implement a server endpoint that forwards tunnel traffic to Sentry ingest.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build succeeds but no source maps in Sentry | Verify `sentryTanstackStart` is configured and token is available at build time |
| `process.env.SENTRY_AUTH_TOKEN` undefined | Use `loadEnv` in Vite config or `.env.sentry-build-plugin` |
| Works in dev but not production | Ensure `instrument.server.mjs` is copied into final server output and imported at runtime |
| Missing middleware spans | Ensure Sentry plugin is enabled and tracing is configured |
