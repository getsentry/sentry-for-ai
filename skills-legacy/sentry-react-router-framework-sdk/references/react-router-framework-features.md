# React Router Framework Features — Sentry React Router Framework SDK

> Framework mode package: `@sentry/react-router`

---

## Wizard path

Use the installer for fastest setup:

```bash
npx @sentry/wizard@latest -i reactRouter
```

The wizard can:
- install SDK packages
- expose `entry.client.tsx` and `entry.server.tsx`
- create `instrument.server.mjs`
- configure source maps in Vite/React Router config
- add example verification files/routes

---

## Manual framework file checklist

1. `entry.client.tsx` with:
   - `Sentry.init(...)`
   - `HydratedRouter onError={Sentry.sentryOnError}`
2. `instrument.server.mjs` with server `Sentry.init(...)`
3. `entry.server.tsx` with:
   - `createSentryHandleRequest`
   - `createSentryHandleError`
4. Runtime startup with `NODE_OPTIONS='--import ./instrument.server.mjs'`

---

## Source maps for framework builds

### Vite plugin

```ts
import { reactRouter } from "@react-router/dev/vite";
import { sentryReactRouter } from "@sentry/react-router";

export default defineConfig((config) => ({
  plugins: [reactRouter(), sentryReactRouter(sentryConfig, config)],
}));
```

### React Router build end hook

```ts
import { sentryOnBuildEnd } from "@sentry/react-router";

export default {
  ssr: true,
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
  },
};
```

### Auth token

Use `SENTRY_AUTH_TOKEN` via environment variables (or `.env.sentry-build-plugin`).

---

## Runtime startup strategies

### Preferred (`NODE_OPTIONS --import`)

```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--import ./instrument.server.mjs' react-router dev",
    "start": "NODE_OPTIONS='--import ./instrument.server.mjs' react-router-serve ./build/server/index.js"
  }
}
```

### Fallback (direct import)

If runtime flags are unavailable, import server instrumentation at the top of `entry.server.tsx`:

```tsx
import "./instrument.server.mjs";
```

This fallback may have incomplete automatic instrumentation compared to `--import`.

---

## Non-framework handoff

If project uses React Router in data/declarative mode without framework entry wrappers, route setup to `sentry-react-sdk` (`@sentry/react`) for v5/v6/v7 integrations.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Entry files not present | Run `npx react-router reveal` |
| Source maps still minified | Confirm both `sentryReactRouter` plugin and `sentryOnBuildEnd` hook are configured |
| Server startup misses instrumentation | Ensure `NODE_OPTIONS --import` is actually applied in deployed runtime |
| Framework setup used in non-framework app | Switch to `sentry-react-sdk` guidance |
