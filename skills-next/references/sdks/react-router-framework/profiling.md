# Profiling — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` with `@sentry/profiling-node` for server profiling

---

## Profiling setup (server)

Install profiling package:

```bash
npm install @sentry/profiling-node --save
```

Configure in `instrument.server.mjs`:

```js
import * as Sentry from "@sentry/react-router";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
});
```

---

## Sampling strategy

| Setting | Purpose |
|---------|---------|
| `tracesSampleRate` | How many transactions are captured |
| `profileSessionSampleRate` | What fraction of traced transactions get profiles |

Start high in development, then lower for production cost control.

---

## Verification

1. Trigger a server transaction with profiling enabled.
2. Open **Profiles** in Sentry.
3. Confirm profile entries appear and are linked to transactions.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles visible | Ensure `@sentry/profiling-node` is installed and integration is active |
| Traces visible but no profiles | Increase `profileSessionSampleRate` |
| Profile volume too high | Lower `profileSessionSampleRate` and/or `tracesSampleRate` |
| Runtime incompatibility symptoms | Verify Node runtime support and fallback to tracing-only where needed |
