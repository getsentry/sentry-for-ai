# Logs — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` with Logs support

---

## Enable logs

Set `enableLogs: true` in both client and server initialization where you want log ingestion.

```tsx
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  enableLogs: true,
});
```

---

## Logging APIs

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

## Correlation guidance

For better debugging:

1. Enable tracing with meaningful transaction names.
2. Add structured fields to logs (`operation`, `route`, `tenant`, `requestId`).
3. Keep consistent keys across client and server logs.

This improves issue/trace/log correlation in Sentry.

---

## Verification

1. Emit info/warn/error logs from app code.
2. Open **Logs** in Sentry.
3. Filter by message/metadata and confirm ingestion.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not visible | Verify `enableLogs: true` in active init path |
| Missing metadata | Pass structured objects as second logger argument |
| Noisy logs | Reduce volume or gate lower-severity logs by environment |
| Logs not linked to traces | Ensure tracing is active and shared context fields are present |
