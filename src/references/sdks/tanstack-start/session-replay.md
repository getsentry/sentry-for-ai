# Session Replay — Sentry TanStack Start React SDK

> Minimum SDK: `@sentry/tanstackstart-react` with Replay support  
> Framework target: TanStack Start React `1.0 RC`

---

## Replay Setup (`src/router.tsx`)

Session Replay is configured on the browser side in `Sentry.init`.

```tsx
import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.replayIntegration()],

  // Record 10% of all sessions
  replaysSessionSampleRate: 0.1,
  // Record 100% of sessions where an error occurs
  replaysOnErrorSampleRate: 1.0,
});
```

---

## Sampling Strategy

| Goal | Suggested config |
|------|------------------|
| Fast rollout / validation | `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0` |
| Cost-sensitive production | Lower session sample rate (`0.02` to `0.05`), keep error sample high |
| Incident investigation mode | Temporarily increase session sample rate |

---

## Privacy and Data Controls

Adjust Replay privacy behavior based on product requirements:

```tsx
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

Use stricter masking for apps handling sensitive user or payment data.

---

## Verification

1. Load the app in a browser.
2. Trigger one error and complete a few UI interactions.
3. Open **Replays** in Sentry and confirm a replay appears.
4. Open the linked issue and verify replay context is attached.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Replay not appearing | Ensure `replayIntegration()` is included and sample rates are non-zero |
| Replays only on error | Increase `replaysSessionSampleRate` |
| Sensitive content visible | Enable masking/blocking options and audit replay config |
| Replay volume too high | Lower `replaysSessionSampleRate` and keep error replay rate high |
