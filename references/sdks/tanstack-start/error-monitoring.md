# Error Monitoring — Sentry TanStack Start React SDK

> Minimum SDK: `@sentry/tanstackstart-react` (alpha)  
> Framework target: TanStack Start React `1.0 RC`

---

## Automatic vs Manual Capture

| Area | Auto Captured? | Mechanism |
|------|----------------|-----------|
| Unhandled client exceptions | ✅ Yes | Browser global handlers after `Sentry.init` |
| Unhandled promise rejections (client) | ✅ Yes | Browser global handlers |
| Server request exceptions | ✅ Yes | `sentryGlobalRequestMiddleware` + `wrapFetchWithSentry` |
| Server function exceptions | ✅ Yes | `sentryGlobalFunctionMiddleware` |
| Errors swallowed by custom boundaries | ❌ No | Call `Sentry.captureException` manually |
| SSR render exceptions | ❌ No | Call `Sentry.captureException` manually |

Core rule:

> If an error is caught and not re-thrown, capture it manually.

---

## Required Server Error Hooks

### Global server middleware (`src/start.ts`)

```tsx
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [sentryGlobalRequestMiddleware],
    functionMiddleware: [sentryGlobalFunctionMiddleware],
  };
});
```

### Server entry wrapper (`src/server.ts`)

```typescript
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry(
  wrapFetchWithSentry({
    fetch(request: Request) {
      return handler.fetch(request);
    },
  }),
);
```

---

## Client-Side Manual Capture

### `captureException`

```tsx
import * as Sentry from "@sentry/tanstackstart-react";

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { area: "checkout" },
    extra: { retryCount: 1 },
  });
}
```

### `captureMessage`

```tsx
Sentry.captureMessage("Unexpected state encountered", "warning");
```

---

## Error Boundaries and TanStack Router `errorComponent`

Errors handled by custom boundaries are not automatically reported unless you send them.

```tsx
import { useEffect } from "react";
import * as Sentry from "@sentry/tanstackstart-react";
import { createRoute } from "@tanstack/react-router";

const route = createRoute({
  errorComponent: ({ error }) => {
    useEffect(() => {
      Sentry.captureException(error);
    }, [error]);

    return <div>Something went wrong.</div>;
  },
});
```

For class boundaries, wrap with `withErrorBoundary`:

```tsx
import React from "react";
import * as Sentry from "@sentry/tanstackstart-react";

class MyErrorBoundary extends React.Component {
  render() {
    return this.props.children;
  }
}

export const MySentryWrappedErrorBoundary = Sentry.withErrorBoundary(MyErrorBoundary, {
  fallback: <p>Something went wrong.</p>,
});
```

---

## Enrichment APIs

Use standard Sentry context enrichment calls:

```tsx
Sentry.setUser({ id: "user_123", email: "user@example.com" });
Sentry.setTag("tenant", "acme");
Sentry.setContext("checkout", { step: "payment" });
Sentry.addBreadcrumb({
  category: "ui.click",
  message: "Clicked complete purchase",
  level: "info",
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server errors missing | Verify both `wrapFetchWithSentry` and global middleware are in place |
| Error boundary issues not appearing | Add explicit `captureException` inside `errorComponent` or boundary hooks |
| Missing user context | Call `setUser` after auth state is known |
| Duplicate dev errors | Validate behavior in production build; development tooling may rethrow |
