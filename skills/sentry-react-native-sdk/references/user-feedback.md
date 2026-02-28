# User Feedback — Sentry React Native SDK

> **Minimum SDK:** `@sentry/react-native` ≥6.5.0 for `captureFeedback()` API  
> **Feedback widget** (`showFeedbackWidget`, `feedbackIntegration`): ≥6.9.0  
> **Self-hosted Sentry:** ≥24.4.2 required for full user feedback functionality  
> **New Architecture (Fabric):** Feedback widget requires React Native ≥0.71+

---

## Overview

Sentry provides three complementary approaches to collecting user feedback in React Native:

| Approach | When to Use |
|----------|-------------|
| **Feedback Widget** | Built-in modal; minimal code; works out of the box |
| **`FeedbackWidget` component** | Embed feedback form inline within your own screen |
| **`captureFeedback()` API** | Full control; build your own UI and submit programmatically |

All approaches support:
- Linking feedback to specific error events via `associatedEventId`
- Offline caching (stored on-device, sent when connectivity restores)
- Session Replay integration (buffers last 60 seconds of activity with submitted feedback)

---

## Prerequisites

Wrap your root component with `Sentry.wrap` — this is **required** for the feedback widget and error boundary integration:

```typescript
import * as Sentry from "@sentry/react-native";

export default Sentry.wrap(App);
```

Without `Sentry.wrap`, `Sentry.showFeedbackWidget()` and `Sentry.showFeedbackButton()` will not function correctly.

---

## Approach 1: Built-In Feedback Widget

The simplest integration. Call `Sentry.showFeedbackWidget()` from anywhere — a button, menu item, shake gesture handler, or support screen.

### Trigger the Widget

```typescript
import * as Sentry from "@sentry/react-native";
import { Button } from "react-native";

function SupportButton() {
  return (
    <Button
      title="Report a Problem"
      onPress={() => Sentry.showFeedbackWidget()}
    />
  );
}
```

### Persistent Feedback Button

Show or hide the built-in floating feedback button:

```typescript
// Show the floating feedback button (persists on screen)
Sentry.showFeedbackButton();

// Hide it when no longer needed
Sentry.hideFeedbackButton();
```

### Configure the Widget via `feedbackIntegration`

Customize appearance and fields in `Sentry.init`:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  integrations: [
    Sentry.feedbackIntegration({
      // Field placeholder text
      namePlaceholder: "Full Name",
      emailPlaceholder: "your@email.com",
      messagePlaceholder: "What went wrong? What did you expect?",

      // Field labels
      nameLabel: "Name",
      emailLabel: "Email",
      messageLabel: "Description",
      submitButtonLabel: "Send Report",
      cancelButtonLabel: "Cancel",
      formTitle: "Report a Bug",

      // Require fields (all optional by default)
      isNameRequired: false,
      isEmailRequired: false,

      // Styling
      styles: {
        submitButton: {
          backgroundColor: "#6a1b9a",
        },
      },

      // Pre-fill from current user context (reads Sentry user scope)
      useSentryUser: {
        name: "username",   // maps user.username → name field
        email: "email",     // maps user.email → email field
      },
    }),
  ],
});
```

### Architecture Requirements

| Architecture | Support |
|---|---|
| Legacy (Bridge) | ✅ Fully supported |
| New Architecture (Fabric) | ✅ Requires React Native ≥0.71 |

---

## Approach 2: `FeedbackWidget` Component

Embed the feedback form directly into your own screen layout instead of showing it as a modal:

```typescript
import { FeedbackWidget } from "@sentry/react-native";
import { View, Text, StyleSheet } from "react-native";

function SupportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Having trouble?</Text>
      <Text style={styles.subtext}>
        Describe what happened and we'll look into it.
      </Text>
      <FeedbackWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  subtext: { color: "#666", marginBottom: 16 },
});
```

The `FeedbackWidget` component respects the same configuration set in `feedbackIntegration` within `Sentry.init`.

---

## Approach 3: Programmatic API (`captureFeedback`)

Build a completely custom feedback UI and submit via the SDK. Gives full control over form layout, validation, and submission flow.

### Basic Feedback (Standalone)

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.captureFeedback({
  name: "Jane Smith",
  email: "jane@example.com",
  message: "The checkout button doesn't respond after the first tap.",
});
```

### Link Feedback to a Specific Error Event

```typescript
import * as Sentry from "@sentry/react-native";

// Capture an error and get its ID
const eventId = Sentry.captureException(new Error("Payment failed"));

// Associate the user's report with that exact error
Sentry.captureFeedback({
  name: "John Doe",
  email: "john@example.com",
  message: "App crashed when I tapped Pay Now.",
  associatedEventId: eventId,
});
```

### Link Feedback to the Most Recent Event

`Sentry.lastEventId()` retrieves the ID of the last event captured in the current session — useful for post-crash feedback flows:

```typescript
import * as Sentry from "@sentry/react-native";

const lastId = Sentry.lastEventId();

if (lastId) {
  Sentry.captureFeedback({
    name: user.name,
    email: user.email,
    message: feedbackText,
    associatedEventId: lastId,
  });
}
```

### Feedback with Tags and Attachments

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.captureFeedback(
  {
    name: user.displayName,
    email: user.email,
    message: feedbackText,
  },
  {
    captureContext: {
      tags: {
        screen: currentScreen,
        appVersion: appVersion,
        platform: Platform.OS,
      },
    },
    attachments: [
      {
        filename: "device_info.txt",
        data: JSON.stringify(deviceInfo, null, 2),
        contentType: "text/plain",
      },
    ],
  }
);
```

---

## Crash Report Modal (Post-Crash Feedback)

Show a feedback form on the next app launch after a crash. This is the recommended pattern for collecting context around hard crashes that the user survived.

### Pattern: Check for Last Event on Launch

```typescript
import * as Sentry from "@sentry/react-native";
import React from "react";
import { Modal, View, Text, TextInput, Button } from "react-native";

function App() {
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState("");
  const lastEventId = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    // Check if there was a crash in the previous session
    const eventId = Sentry.lastEventId();
    if (eventId) {
      lastEventId.current = eventId;
      setShowFeedback(true);
    }
  }, []);

  function submitCrashFeedback() {
    if (!feedbackText.trim()) return;

    Sentry.captureFeedback({
      message: feedbackText,
      associatedEventId: lastEventId.current,
    });

    setShowFeedback(false);
    setFeedbackText("");
  }

  return (
    <>
      <Modal visible={showFeedback} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
            It looks like the app crashed
          </Text>
          <Text style={{ color: "#555", marginBottom: 16 }}>
            What were you doing when it happened?
          </Text>
          <TextInput
            multiline
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="Describe what happened..."
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 12,
              minHeight: 100,
              marginBottom: 16,
            }}
          />
          <Button title="Send Report" onPress={submitCrashFeedback} />
          <Button title="Skip" onPress={() => setShowFeedback(false)} />
        </View>
      </Modal>
      {/* rest of app */}
    </>
  );
}
```

> **Tip:** `Sentry.lastEventId()` returns the ID of the most recent event captured during the *current* app session. For post-crash context, call it at app start before any other Sentry calls that might create a new event.

---

## Linking Feedback to Errors via `ErrorBoundary`

The `Sentry.ErrorBoundary` component can automatically show a feedback dialog after capturing a React render error, using the `showDialog` prop:

```typescript
import * as Sentry from "@sentry/react-native";
import { Text } from "react-native";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={<Text>Something went wrong. Your report has been sent.</Text>}
      showDialog  // Opens Sentry feedback widget after capturing the error
    >
      <MainContent />
    </Sentry.ErrorBoundary>
  );
}
```

### Custom Post-Error Feedback Form

For full control, use `onError` to capture the `eventId` and trigger your own feedback form:

```typescript
import * as Sentry from "@sentry/react-native";
import React from "react";
import { View, Text, TextInput, Button } from "react-native";

function ErrorFallback({ eventId, onReset }: { eventId: string; onReset: () => void }) {
  const [message, setMessage] = React.useState("");

  function submit() {
    Sentry.captureFeedback({
      message,
      associatedEventId: eventId,
    });
    onReset();
  }

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>Oops, something broke</Text>
      <TextInput
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="What were you trying to do?"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, marginVertical: 16 }}
      />
      <Button title="Send Feedback" onPress={submit} />
    </View>
  );
}

function App() {
  const [errorEventId, setErrorEventId] = React.useState<string | null>(null);

  return (
    <Sentry.ErrorBoundary
      onError={(_error, _componentStack, eventId) => {
        setErrorEventId(eventId);
      }}
      fallback={
        errorEventId
          ? <ErrorFallback eventId={errorEventId} onReset={() => setErrorEventId(null)} />
          : <Text>Something went wrong.</Text>
      }
    >
      <MainContent />
    </Sentry.ErrorBoundary>
  );
}
```

---

## Screenshots in Feedback

Allow users to attach screenshots to feedback reports. Use `attachments` in `captureFeedback` to include screenshots captured from the device:

```typescript
import * as Sentry from "@sentry/react-native";
import { captureScreen } from "react-native-view-shot"; // npm install react-native-view-shot
import RNFS from "react-native-fs"; // npm install react-native-fs

async function submitFeedbackWithScreenshot(feedbackMessage: string) {
  // Capture current screen as PNG
  const screenshotUri = await captureScreen({ format: "png", quality: 0.8 });
  const screenshotBase64 = await RNFS.readFile(screenshotUri, "base64");

  Sentry.captureFeedback(
    {
      message: feedbackMessage,
      associatedEventId: Sentry.lastEventId(),
    },
    {
      attachments: [
        {
          filename: "screenshot.png",
          data: screenshotBase64,
          contentType: "image/png",
        },
      ],
    }
  );
}
```

> **Alternative:** Enable `attachScreenshot: true` in `Sentry.init` to automatically attach a screenshot to every error event — the screenshot then appears alongside any feedback linked to that event via `associatedEventId`.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  attachScreenshot: true, // Auto-attach screenshot to every error event
});
```

---

## Session Replay Integration with Feedback

When `mobileReplayIntegration()` is enabled and a user submits feedback via the widget, Sentry automatically buffers and attaches **up to 60 seconds of prior session replay** to the feedback submission. This gives you visual context for what the user experienced before they filed the report — no extra code required.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(), // replay attaches automatically on feedback submit
  ],
});
```

---

## Offline Feedback

Feedback captured while the device is offline is **automatically cached on-device** by the native SDK layer and replayed to Sentry when connectivity is restored. This applies to all three approaches (`showFeedbackWidget`, `FeedbackWidget`, `captureFeedback`). No additional configuration is needed.

---

## Complete Custom Feedback Form Example

A fully custom feedback flow — your own UI, validation, submission:

```typescript
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as Sentry from "@sentry/react-native";

interface FeedbackFormProps {
  onDismiss: () => void;
  associatedEventId?: string;
}

export function CustomFeedbackForm({ onDismiss, associatedEventId }: FeedbackFormProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (!message.trim()) {
      Alert.alert("Required", "Please describe what happened.");
      return;
    }

    setSubmitting(true);

    try {
      Sentry.captureFeedback(
        {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
          associatedEventId,
        },
        {
          captureContext: {
            tags: { feedbackSource: "custom-form" },
          },
        }
      );

      Alert.alert("Thank you", "Your feedback has been submitted.");
      onDismiss();
    } catch (err) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Feedback</Text>

      <TextInput
        style={styles.input}
        placeholder="Name (optional)"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Email (optional)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder="Describe what happened *"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Sending…" : "Submit"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fff", borderRadius: 12 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  messageInput: { minHeight: 120 },
  button: {
    backgroundColor: "#6200ee",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelButton: { alignItems: "center", padding: 10 },
  cancelText: { color: "#666", fontSize: 16 },
});
```

---

## `captureFeedback` API Reference

```typescript
Sentry.captureFeedback(
  feedback: UserFeedback,
  hint?: EventHint
): string | undefined
```

### `feedback` object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | ✅ | User's feedback text |
| `name` | `string` | ❌ | User's display name |
| `email` | `string` | ❌ | User's email address |
| `associatedEventId` | `string` | ❌ | Links feedback to a specific Sentry event (error or message) |

### `hint` object (optional)

| Field | Type | Description |
|-------|------|-------------|
| `captureContext` | `CaptureContext` | Scope data to attach (tags, extra, user, level, contexts) |
| `attachments` | `Attachment[]` | Files to attach (screenshots, logs, etc.) |

Returns the feedback event ID (or `undefined` if SDK is disabled).

---

## `feedbackIntegration` Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formTitle` | `string` | `"Report a Bug"` | Widget modal title |
| `submitButtonLabel` | `string` | `"Send Bug Report"` | Submit button text |
| `cancelButtonLabel` | `string` | `"Cancel"` | Cancel button text |
| `nameLabel` | `string` | `"Name"` | Name field label |
| `namePlaceholder` | `string` | `"Your Name"` | Name field placeholder |
| `emailLabel` | `string` | `"Email"` | Email field label |
| `emailPlaceholder` | `string` | `"your.email@example.org"` | Email field placeholder |
| `messageLabel` | `string` | `"Description"` | Message field label |
| `messagePlaceholder` | `string` | `"What's the bug? What did you expect?"` | Message field placeholder |
| `isNameRequired` | `boolean` | `false` | Make name field required |
| `isEmailRequired` | `boolean` | `false` | Make email field required |
| `useSentryUser` | `object` | — | Maps Sentry user scope fields to pre-fill name/email |
| `styles` | `object` | — | Style overrides for widget UI elements |

---

## API Summary

| Method | Description |
|--------|-------------|
| `Sentry.showFeedbackWidget()` | Open the built-in feedback modal |
| `Sentry.showFeedbackButton()` | Show the persistent floating feedback button |
| `Sentry.hideFeedbackButton()` | Hide the persistent floating feedback button |
| `Sentry.captureFeedback(feedback, hint?)` | Submit feedback programmatically |
| `Sentry.lastEventId()` | Get the ID of the most recent captured event (for linking) |
| `Sentry.feedbackIntegration(options)` | Configure the built-in widget |

---

## Version Requirements

| Feature | Min SDK | Notes |
|---------|---------|-------|
| `captureFeedback()` | ≥6.5.0 | Replaces deprecated `captureUserFeedback()` |
| `showFeedbackWidget()` | ≥6.9.0 | Requires `Sentry.wrap(App)` |
| `feedbackIntegration()` | ≥6.9.0 | Configure widget appearance |
| `FeedbackWidget` component | ≥6.9.0 | Inline embedded widget |
| `showFeedbackButton()` / `hideFeedbackButton()` | ≥6.15.0 | Floating feedback button |
| Offline caching | Built-in | Automatic, no config needed |
| Session Replay attachment | ≥6.9.0 | When `mobileReplayIntegration` enabled |
| New Architecture (Fabric) support | React Native ≥0.71 | Widget works on new arch |

---

## Expo Considerations

- The feedback widget works in **Expo managed and bare** workflows
- `showFeedbackWidget()` requires a **native build** — it does **not** function in Expo Go
- `captureFeedback()` (programmatic API) works in both Expo Go and native builds
- Use `isRunningInExpoGo()` to guard widget calls in dev:

```typescript
import { isRunningInExpoGo } from "expo";
import * as Sentry from "@sentry/react-native";

function ReportButton() {
  if (isRunningInExpoGo()) {
    // Fallback: use captureFeedback directly instead of the widget
    return (
      <Button
        title="Report (dev mode)"
        onPress={() =>
          Sentry.captureFeedback({ message: "Test feedback from Expo Go" })
        }
      />
    );
  }

  return (
    <Button
      title="Report a Problem"
      onPress={() => Sentry.showFeedbackWidget()}
    />
  );
}
```

---

## Migration: `captureUserFeedback` → `captureFeedback`

`captureUserFeedback()` was removed in v7. Replace all usages:

```typescript
// ❌ BEFORE (v6 and earlier) — removed in v7
Sentry.captureUserFeedback({
  event_id: eventId,
  name: "John",
  email: "john@example.com",
  comments: "Something went wrong.",
});

// ✅ AFTER (v7+)
Sentry.captureFeedback({
  associatedEventId: eventId,
  name: "John",
  email: "john@example.com",
  message: "Something went wrong.", // renamed from "comments"
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `showFeedbackWidget()` has no effect | Confirm `Sentry.wrap(App)` wraps your root component |
| Widget doesn't open on New Architecture | Requires React Native ≥0.71; check architecture compatibility |
| Feedback not appearing in Sentry dashboard | Verify DSN is correct; check network connectivity; enable `debug: true` for SDK logs |
| `captureFeedback` not sending in Expo Go | Expected — use `captureFeedback()` (works) but not `showFeedbackWidget()` (native only) |
| `lastEventId()` returns `undefined` | No events have been captured in the current session yet; ensure an error or message was captured first |
| Offline feedback not delivered | Offline caching is automatic; check `maxCacheItems` (default: 30); old cache is evicted if full |
| `captureUserFeedback` is not a function | Upgrade to `@sentry/react-native` ≥7.0.0 and replace with `captureFeedback()` |
| Replay not attaching to feedback | Confirm `mobileReplayIntegration()` is in `integrations` and the app is running as a native build |
| `associatedEventId` not linking correctly | Pass the exact event ID string returned by `captureException`, `captureMessage`, or `lastEventId()` |
| Widget styles not applying | Pass `styles` config inside `feedbackIntegration({ styles: { ... } })` in `Sentry.init` |
