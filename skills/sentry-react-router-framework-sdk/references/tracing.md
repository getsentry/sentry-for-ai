# Tracing — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` (beta)

---

## Enable tracing

Configure tracing in `entry.client.tsx`:

```tsx
import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.reactRouterTracingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
});
```

---

## Sampling guidance

| Environment | Suggested value |
|-------------|-----------------|
| Development/testing | `tracesSampleRate: 1.0` |
| Initial production rollout | `0.1` to `0.3` |
| High throughput | Use lower fixed rate or `tracesSampler` |

If both `tracesSampleRate` and `tracesSampler` are provided, `tracesSampler` takes precedence.

---

## Distributed tracing

Use `tracePropagationTargets` so Sentry sends trace headers to your backend routes:

```tsx
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.reactRouterTracingIntegration()],
  tracesSampleRate: 0.2,
  tracePropagationTargets: [/^\//, /^https:\/\/api\.example\.com/],
});
```

---

## Custom spans

```tsx
import * as Sentry from "@sentry/react-router";

export async function loader() {
  return Sentry.startSpan(
    {
      op: "test",
      name: "My First Test Transaction",
    },
    () => {
      throw new Error("My first Sentry error!");
    },
  );
}
```

---

## Node runtime note

Automatic server-side instrumentation compatibility has version limits for some Node versions in current docs. If your runtime is outside supported auto-instrumentation ranges, use framework instrumentation APIs or manual wrappers to keep tracing coverage.

---

## Verification

1. Trigger one loader/action request from the app.
2. Open **Traces** in Sentry.
3. Confirm transaction names, spans, and linked errors appear.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No trace data | Confirm `reactRouterTracingIntegration()` and `tracesSampleRate` are configured |
| Client and server traces not connected | Adjust `tracePropagationTargets` to include backend URLs |
| Too many traces | Lower sample rate or use `tracesSampler` |
| Tracing disappears in certain environments | Check runtime version constraints and fallback instrumentation path |
