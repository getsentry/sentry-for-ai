# Error Monitoring — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` (beta)

---

## Automatic and Manual Capture

| Area | Auto Captured? | Mechanism |
|------|----------------|-----------|
| Client-side framework errors | ✅ Yes | `HydratedRouter onError={Sentry.sentryOnError}` |
| Unhandled client exceptions | ✅ Yes | Browser global handlers from SDK init |
| Server request/render errors | ✅ Yes | `createSentryHandleRequest` + `createSentryHandleError` |
| Custom handled server errors | ❌ Not always | Call `Sentry.captureException` manually |
| Custom loader/action failures | ⚠️ Depends | Use `wrapServerLoader` / `wrapServerAction` or manual capture |

---

## Client setup requirement

`entry.client.tsx` must include:

```tsx
import * as Sentry from "@sentry/react-router";
import { HydratedRouter } from "react-router/dom";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
});

hydrateRoot(document, <HydratedRouter onError={Sentry.sentryOnError} />);
```

Without `sentryOnError`, framework-level client errors may be missed.

---

## Server setup requirement

`entry.server.tsx`:

```tsx
import * as Sentry from "@sentry/react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";

const handleRequest = Sentry.createSentryHandleRequest({
  ServerRouter,
  renderToPipeableStream,
  createReadableStreamFromReadable,
});

export default handleRequest;

export const handleError = Sentry.createSentryHandleError({
  logErrors: false,
});
```

---

## Manual capture in custom handlers

```tsx
import * as Sentry from "@sentry/react-router";

export function handleError(error: unknown, args: unknown) {
  Sentry.captureException(error);
  console.error(error);
}
```

For custom streaming request implementations, wrap your handler:

```tsx
import { wrapSentryHandleRequest } from "@sentry/react-router";

export default wrapSentryHandleRequest(customHandleRequest);
```

---

## Loader/action wrappers

```ts
import * as Sentry from "@sentry/react-router";

export const loader = Sentry.wrapServerLoader(
  { name: "Load Data", description: "Loads route data" },
  async () => {
    // loader logic
  },
);

export const action = Sentry.wrapServerAction(
  { name: "Submit Data", description: "Handles form submission" },
  async () => {
    // action logic
  },
);
```

---

## Verification

Use a route loader that throws:

```tsx
export async function loader() {
  throw new Error("My first Sentry error!");
}
```

Open the route and verify the event appears in **Issues**.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Client framework errors missing | Ensure `HydratedRouter` uses `onError={Sentry.sentryOnError}` |
| Server render/request errors missing | Verify both `createSentryHandleRequest` and `createSentryHandleError` are exported |
| Custom handlers not captured | Add explicit `captureException` calls |
| Error appears locally but not in Sentry | Check DSN, network restrictions, and `debug: true` output |
