# User Feedback — Sentry Browser SDK

> Minimum SDK: `@sentry/browser` ≥7.85.0 for `feedbackIntegration()`  
> Screenshot capture: requires ≥8.0.0  
> Self-hosted Sentry: requires version ≥24.4.2

---

## Two Approaches

| Approach | When to Use |
|----------|-------------|
| **`feedbackIntegration()` widget** | Collect feedback anywhere — no error required; embeds a button in the UI |
| **`showReportDialog()` crash modal** | Triggered after an error is captured; prompts the user to describe what happened |

Both approaches can be used together. The widget is general-purpose; the crash modal is specifically for error-linked feedback.

---

## Approach 1: Feedback Widget (`feedbackIntegration`)

### Basic Setup

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.feedbackIntegration({
      colorScheme: "system", // "light" | "dark" | "system"
    }),
  ],
});
```

A "Report a Bug" button appears in the bottom-right corner by default. Clicking it opens a modal form.

### Lazy Loading via Loader Script

```javascript
window.sentryOnLoad = function () {
  Sentry.init({ dsn: "___PUBLIC_DSN___" });

  Sentry.lazyLoadIntegration("feedbackIntegration")
    .then((feedbackIntegration) => {
      Sentry.addIntegration(
        feedbackIntegration({
          colorScheme: "system",
        }),
      );
    })
    .catch(() => {
      // Network error — User Feedback widget not loaded
    });
};
```

### CDN Bundle Options

```html
<!-- Feedback only (lightest bundle) -->
<script
  src="https://browser.sentry-cdn.com/10.42.0/bundle.feedback.min.js"
  crossorigin="anonymous"
></script>

<!-- With tracing and replay -->
<script
  src="https://browser.sentry-cdn.com/10.42.0/bundle.tracing.replay.feedback.min.js"
  crossorigin="anonymous"
></script>
```

### Configuration Options

#### Appearance

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorScheme` | `'light'` \| `'dark'` \| `'system'` | `'system'` | Widget color theme. |
| `buttonLabel` | `string` | `"Report a Bug"` | Text on the trigger button. |
| `submitButtonLabel` | `string` | `"Send Bug Report"` | Text on the form's submit button. |
| `cancelButtonLabel` | `string` | `"Cancel"` | Text on the cancel button. |
| `formTitle` | `string` | `"Report a Bug"` | Title displayed in the feedback form. |
| `showBranding` | `boolean` | `true` | Show "Powered by Sentry" branding in the widget. |

#### Form Fields

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showName` | `boolean` | `true` | Show the name input field. |
| `showEmail` | `boolean` | `true` | Show the email input field. |
| `isNameRequired` | `boolean` | `false` | Make name field required. |
| `isEmailRequired` | `boolean` | `false` | Make email field required. |
| `namePlaceholder` | `string` | `"Your Name"` | Placeholder for name field. |
| `emailPlaceholder` | `string` | `"your.email@example.org"` | Placeholder for email field. |
| `messagePlaceholder` | `string` | `"What's the bug? ..."` | Placeholder for message field. |

#### Positioning

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `'bottom-right'` \| `'bottom-left'` \| `'top-right'` \| `'top-left'` | `'bottom-right'` | Where to position the trigger button. |

#### Behaviour

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoInject` | `boolean` | `true` | Automatically inject the trigger button into the DOM. Set `false` to control placement manually. |
| `enableScreenshot` | `boolean` | `true` | Allow users to attach a screenshot. Requires SDK ≥8.0.0. |
| `tags` | `Record<string, string>` | `{}` | Additional tags to attach to every submitted feedback event. |

### Pre-fill User Information

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.feedbackIntegration({
      // Pre-fill form with logged-in user's details
    }),
  ],
});

// After authentication
Sentry.setUser({
  email: "user@example.com",
  name: "Jane Smith",
});
```

When `Sentry.setUser()` is called, the feedback form auto-populates name and email fields.

### Manual Widget Control (Custom Button)

Disable auto-inject and open the widget programmatically from your own button:

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.feedbackIntegration({
      autoInject: false, // Don't render Sentry's trigger button
    }),
  ],
});

// Open the widget from your own UI element
document.getElementById("my-feedback-btn").addEventListener("click", () => {
  const feedback = Sentry.getFeedback();
  if (feedback) {
    feedback.openDialog();
  }
});
```

---

## Approach 2: Programmatic Feedback (`captureFeedback`)

Use a completely custom form UI and submit feedback via the API:

```javascript
// Minimal — only message is required
Sentry.captureFeedback({
  name: "Jane Smith",
  email: "jane@example.com",
  message: "The checkout button doesn't work on mobile.",
});
```

### With Tags and Attachments

```javascript
// Attach a screenshot as a file
const screenshotDataUrl = "data:image/jpeg;base64,...";
const res = await fetch(screenshotDataUrl);
const buffer = await res.arrayBuffer();

Sentry.captureFeedback(
  {
    name: "Jane Smith",
    email: "jane@example.com",
    message: "The checkout button doesn't work on mobile.",
  },
  {
    captureContext: {
      tags: { page: "checkout", device: "mobile" },
    },
    attachments: [
      {
        filename: "screenshot.png",
        data: new Uint8Array(buffer),
      },
    ],
  },
);
```

### Linking Feedback to a Specific Error

```javascript
try {
  await submitOrder();
} catch (err) {
  const eventId = Sentry.captureException(err);

  Sentry.captureFeedback({
    message: "Something went wrong during checkout.",
    associatedEventId: eventId, // Links this feedback to the captured error
  });
}
```

### `captureFeedback` Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `message` | ✅ | The feedback text from the user |
| `name` | ❌ | User's name |
| `email` | ❌ | User's email |
| `associatedEventId` | ❌ | Links feedback to a specific Sentry event (use `Sentry.lastEventId()` or the return value of `captureException`) |

---

## Approach 3: Crash-Report Modal (`showReportDialog`)

Show a modal prompting users to describe what happened when an error occurs. Ideal for "something went wrong" pages or after unhandled errors.

### Basic Setup

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  beforeSend(event) {
    if (event.exception && event.event_id) {
      Sentry.showReportDialog({ eventId: event.event_id });
    }
    return event;
  },
});
```

### On a 500 Error Page

```html
<script>
  Sentry.init({ dsn: "___PUBLIC_DSN___" });
</script>

<script>
  // eventId is provided by your server-side Sentry SDK after capturing the error
  Sentry.showReportDialog({ eventId: "{{ sentry_event_id }}" });
</script>
```

### After Manual `captureException`

```javascript
try {
  await riskyOperation();
} catch (err) {
  const eventId = Sentry.captureException(err);
  Sentry.showReportDialog({ eventId });
}
```

### `showReportDialog` Options

| Option | Required | Description |
|--------|----------|-------------|
| `eventId` | ✅ | The Sentry event ID to associate the feedback with |
| `user.name` | ❌ | Pre-fill user's name |
| `user.email` | ❌ | Pre-fill user's email |
| `lang` | ❌ | Dialog language code (e.g., `"de"`, `"fr"`) |
| `title` | ❌ | Override dialog title |
| `subtitle` | ❌ | Override dialog subtitle |
| `subtitle2` | ❌ | Override second subtitle line |
| `labelSubmit` | ❌ | Override submit button label |

The modal collects: **user name, email, and a description** — paired with the original captured error event.

---

## Screenshot Capture

- Available on SDK **v8.0.0+**
- Enabled by default via `enableScreenshot: true` on `feedbackIntegration()`
- Auto-hidden on mobile devices
- Screenshots count against your **attachment quota** (1GB standard)

```javascript
Sentry.feedbackIntegration({
  enableScreenshot: true, // default — can set false to disable
});
```

---

## Session Replay Integration

When Session Replay is configured alongside User Feedback, submitted feedback links to the user's replay:

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  replaysOnErrorSampleRate: 1.0, // Buffer replays for error sessions
  integrations: [
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({ colorScheme: "system" }),
  ],
});
```

The system buffers up to **30 seconds** when the feedback widget opens. This enables viewing the replay alongside the submitted feedback in Sentry.

---

## Best Practices

- **Use `feedbackIntegration()` for proactive collection** — don't wait for errors; a persistent feedback button catches issues that never throw exceptions
- **Pre-fill user info** — call `Sentry.setUser()` after login so users don't have to type their email each time
- **Combine crash modal with `beforeSend`** — automatic prompting after errors maximizes feedback capture
- **Link programmatic feedback to events** — use `associatedEventId` so feedback appears alongside error context in Sentry
- **Set `autoInject: false`** for branded UI — implement your own trigger button to match your design system
- **Keep `showReportDialog` for 500 pages** — server-rendered error pages are the primary use case; pass the server-side event ID to the client

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't appear | Check that `feedbackIntegration()` is in the `integrations` array and SDK ≥7.85.0 |
| Widget appears but form won't submit | Verify DSN is correct; check browser network tab for blocked requests |
| Screenshots not showing | Requires SDK ≥8.0.0; check `enableScreenshot` is not set to `false` |
| `showReportDialog` shows but feedback not linked to error | Ensure `eventId` is passed; use `captureException()` return value or `Sentry.lastEventId()` |
| Crash modal not appearing after error | `showReportDialog` must be called with a valid `eventId`; check `beforeSend` hook is executing |
| Feedback not appearing in Sentry | Check attachment quota; ensure self-hosted Sentry is version ≥24.4.2 |
| Form fields are empty (no pre-fill) | Call `Sentry.setUser({ name, email })` before the widget is opened |
| Replay not linked to feedback | Set `replaysOnErrorSampleRate > 0`; replay must be active when feedback is submitted |
| Widget conflicts with page z-index | Widget uses Shadow DOM — if still conflicting, use `autoInject: false` and position manually |
