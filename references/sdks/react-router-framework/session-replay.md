# Session Replay — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` with Replay support

---

## Replay setup (client)

Configure replay in `entry.client.tsx`:

```tsx
import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## Sampling guidance

| Goal | Suggested setup |
|------|-----------------|
| Validate integration | `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0` |
| Control storage costs | Lower session sample rate; keep error replay rate high |
| Incident debugging | Temporarily increase session sample rate |

---

## Privacy controls

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

---

## Verification

1. Use the app in a browser and trigger an error.
2. Open **Replays** in Sentry.
3. Confirm replay exists and is linked to errors/traces.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Replay missing | Ensure `replayIntegration()` is configured in client init |
| Only error replays show | Increase `replaysSessionSampleRate` |
| Sensitive data visible | Enable masking/blocking and verify element privacy settings |
| Replay volume too high | Lower replay sampling rates |
