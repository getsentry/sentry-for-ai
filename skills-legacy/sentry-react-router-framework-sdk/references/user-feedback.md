# User Feedback — Sentry React Router Framework SDK

> Minimum SDK: `@sentry/react-router` with Feedback support

---

## Feedback widget setup

Configure in `entry.client.tsx`:

```tsx
import * as Sentry from "@sentry/react-router";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],
});
```

---

## Common options

```tsx
Sentry.feedbackIntegration({
  autoInject: true,
  colorScheme: "system",
  showName: true,
  showEmail: true,
  triggerLabel: "Report a bug",
  formTitle: "Report a bug",
  submitButtonLabel: "Send report",
  successMessageText: "Thanks for the report.",
});
```

---

## Error-linked feedback dialog

```tsx
const eventId = Sentry.captureException(new Error("Checkout failed"));
Sentry.showReportDialog({
  eventId,
  title: "Something went wrong",
  subtitle: "Tell us what happened",
});
```

---

## Verification

1. Trigger feedback widget submission from the app.
2. Open **User Feedback** in Sentry.
3. Confirm submissions appear and error-linked reports attach to events.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Feedback widget not visible | Ensure `feedbackIntegration()` is in client integrations |
| Missing user context | Set Sentry user context before submitting feedback |
| Feedback not linked to errors | Use `showReportDialog` with a real `eventId` |
| UI overlap/z-index issues | Adjust app styles and trigger placement |
