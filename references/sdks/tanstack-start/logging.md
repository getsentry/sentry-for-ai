# Logs — Sentry TanStack Start React SDK

> Minimum SDK: `@sentry/tanstackstart-react` with Logs support  
> Framework target: TanStack Start React `1.0 RC`

---

## Enable Logs

Enable log ingestion in both browser and server `Sentry.init` calls:

```tsx
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  enableLogs: true,
});
```

Configure this in:
- `src/router.tsx` (browser runtime)
- `instrument.server.mjs` (server runtime)

---

## Logging APIs

Use structured logging methods from the Sentry logger:

```javascript
Sentry.logger.info("User example action completed");

Sentry.logger.warn("Slow operation detected", {
  operation: "data_fetch",
  duration: 3500,
});

Sentry.logger.error("Validation failed", {
  field: "email",
  reason: "Invalid email",
});
```

---

## Correlating Logs with Traces and Errors

For best analysis value:

1. Enable tracing (`tracesSampleRate` + integrations).
2. Include useful structured context on logs (operation, tenant, request IDs).
3. Use consistent field names across browser and server logs.

This allows filtering by request context and linking logs to traces/issues.

---

## Verification

1. Trigger `Sentry.logger.info` and `Sentry.logger.error` in the app.
2. Open **Logs** in Sentry.
3. Filter by message or metadata fields to confirm ingestion.
4. Open a related issue or trace and verify shared context fields.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not visible | Confirm `enableLogs: true` in active runtime init |
| Missing metadata fields | Pass structured objects as second argument to logger methods |
| Too much log volume | Reduce noisy log calls or gate debug/info logs by environment |
| Logs disconnected from traces | Ensure tracing is enabled and context keys are consistent |
