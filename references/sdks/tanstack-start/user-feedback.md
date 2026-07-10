# User Feedback — Sentry TanStack Start React SDK

> Minimum SDK: `@sentry/tanstackstart-react` with Feedback integration  
> Framework target: TanStack Start React `1.0 RC`

---

## Feedback Widget Setup

Enable feedback in the browser-side init (`src/router.tsx`):

```tsx
import * as Sentry from "@sentry/tanstackstart-react";

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

## Common Configuration Options

```tsx
Sentry.feedbackIntegration({
  autoInject: true,
  colorScheme: "system",
  showName: true,
  showEmail: true,
  isNameRequired: false,
  isEmailRequired: false,
  triggerLabel: "Report a bug",
  formTitle: "Report a bug",
  submitButtonLabel: "Send report",
  successMessageText: "Thanks for the report.",
  tags: {
    area: "tanstack-start-web",
    env: import.meta.env.MODE,
  },
});
```

---

## Feedback From Error Flows

If you want post-error feedback dialogs, capture an error and open the report dialog:

```tsx
const eventId = Sentry.captureException(new Error("Checkout flow failed"));
Sentry.showReportDialog({
  eventId,
  title: "Something went wrong",
  subtitle: "Want to help us fix this?",
});
```

---

## Verification

1. Open the app and locate the feedback trigger.
2. Submit a sample report.
3. Open **User Feedback** in Sentry and confirm receipt.
4. If using report dialogs, verify feedback is linked to the issue event.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Feedback button not shown | Ensure `feedbackIntegration()` is in browser `integrations` |
| Styling/position conflicts | Customize trigger placement and check app z-index layers |
| Missing user details | Set Sentry user context before feedback submission |
| Feedback not linked to errors | Use `showReportDialog` with the returned `eventId` |
