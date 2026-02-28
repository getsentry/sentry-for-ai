# User Feedback — Sentry Cocoa SDK

> Minimum SDK: `sentry-cocoa` v8.46.0+  
> Self-hosted Sentry server: 24.4.2+

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configureUserFeedback` | `((SentryUserFeedbackConfiguration) -> Void)?` | `nil` | Configure the feedback widget and form |
| `autoInject` | `Bool` | `true` | Auto-show floating "Report a Bug" button |
| `useShakeGesture` | `Bool` | `false` | Open the form on device shake |
| `showFormForScreenshots` | `Bool` | `false` | Auto-open form when user takes a screenshot |
| `animations` | `Bool` | `true` | Enable present/dismiss animations |
| `useSentryUser` | `Bool` | `true` | Pre-fill name/email from `SentrySDK.setUser(...)` |
| `isNameRequired` | `Bool` | `false` | Require name field before submission |
| `isEmailRequired` | `Bool` | `false` | Require email field before submission |
| `showName` | `Bool` | `true` | Show the name field |
| `showEmail` | `Bool` | `true` | Show the email field |

## Code Examples

### Basic widget setup (auto-inject mode)

By default (`autoInject = true`), the SDK injects a floating "Report a Bug" button:

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.configureUserFeedback { config in
        config.onSubmitSuccess = { data in
            // data keys: "message", "name", "email", "attachments"
            print("Feedback submitted: \(data["message"] ?? "")")
        }
        config.onSubmitError = { error in
            print("Submission failed: \(error)")
        }
    }
}
```

### Programmatic widget control

```swift
// Show the floating widget button programmatically
SentrySDK.feedback.showWidget()

// Hide the widget button
SentrySDK.feedback.hideWidget()
```

> `SentrySDK.feedback` is of type `SentryFeedbackAPI`. There is no `showUserFeedbackForm()` method — always use `showWidget()` to trigger the UI.

### SwiftUI integration

The feedback widget is UIKit-based. In a SwiftUI app, inject it via `.onAppear` on the root view:

```swift
import SwiftUI
import Sentry

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    SentrySDK.feedback.showWidget()
                }
        }
    }
}
```

Or via a `UISceneDelegate`:

```swift
func sceneDidBecomeActive(_ scene: UIScene) {
    SentrySDK.feedback.showWidget()
}
```

### Bind to a custom UIButton

```swift
SentrySDK.start { options in
    options.configureUserFeedback { config in
        config.configureWidget { widget in
            widget.autoInject = false       // disable the default floating button
            widget.customButton = myButton  // tapping this button opens the form
        }
    }
}
```

### Trigger via shake gesture or screenshot

```swift
options.configureUserFeedback { config in
    config.useShakeGesture = true          // shake to open form
    config.showFormForScreenshots = true   // auto-open after screenshot
}
```

### Programmatic feedback capture (no widget, custom UI)

Use `SentrySDK.capture(feedback:)` to send feedback from your own UI without any Sentry widget:

```swift
import Sentry

SentrySDK.capture(feedback: .init(
    message: "The checkout button doesn't respond after adding a promo code.",
    name: "Jane Doe",
    email: "jane@example.org",
    source: .custom,
    attachments: nil   // pass [Attachment] to include screenshots or files; nil for none
))
```

### Link feedback to an error event

To associate a feedback submission with a specific Sentry issue, capture the error first and use the resulting event ID:

```swift
let eventId = SentrySDK.capture(error: error)

SentrySDK.capture(feedback: .init(
    message: "App crashed on the checkout screen.",
    name: "User",
    email: "user@example.com",
    associatedEventId: eventId
))
```

### Form customisation

```swift
options.configureUserFeedback { config in
    config.configureForm { form in
        form.formTitle           = "Share Your Feedback"
        form.submitButtonLabel   = "Send Feedback"
        form.cancelButtonLabel   = "Never Mind"
        form.messagePlaceholder  = "What went wrong? What did you expect?"
        form.isNameRequired      = true
        form.isEmailRequired     = true
        form.showBranding        = false
        form.useSentryUser       = true   // pre-fill from SentrySDK.setUser(...)
    }
}
```

### Widget placement and labels

```swift
options.configureUserFeedback { config in
    config.configureWidget { widget in
        widget.labelText = "Give Feedback"
        widget.location  = [.bottom, .trailing]   // anchor edges
        widget.showIcon  = true
        widget.layoutUIOffset = UIOffset(horizontal: -16, vertical: -32)
    }
}
```

### Theme customisation

```swift
options.configureUserFeedback { config in
    config.theme { theme in
        theme.submitBackground = .init(color: .systemBlue)
        theme.fontFamily       = "SF Pro Rounded"
    }
    config.darkTheme { theme in
        theme.background       = .init(color: .black)
        theme.submitBackground = .init(color: .systemPurple)
    }
}
```

Theme properties:

| Property | Light Default | Dark Default |
|----------|--------------|--------------|
| `background` | `rgb(255,255,255)` | `rgb(41,35,47)` |
| `foreground` | `rgb(43,34,51)` | `rgb(235,230,239)` |
| `submitBackground` | `rgb(88,74,192)` | `rgb(88,74,192)` |
| `submitForeground` | `rgb(255,255,255)` | `rgb(255,255,255)` |
| `errorColor` | `rgb(223,51,56)` | `rgb(245,84,89)` |
| `font` | `UIFontTextStyleCallout` | — |
| `headerFont` | `UIFontTextStyleTitle1` | — |
| `fontFamily` | `nil` (system font) | — |

### Session Replay integration

When a user opens the feedback form and Session Replay is enabled, the SDK automatically buffers up to **30 seconds** of the session. On submission, that replay clip is sent alongside the feedback event — no extra configuration needed.

### Full configuration example

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"

    options.configureUserFeedback { config in
        config.showFormForScreenshots = true
        config.useShakeGesture        = false
        config.animations             = true

        config.configureForm { form in
            form.formTitle           = "Report a Bug"
            form.submitButtonLabel   = "Send Bug Report"
            form.isNameRequired      = true
            form.isEmailRequired     = false
            form.showBranding        = false
            form.useSentryUser       = true
        }

        config.configureWidget { widget in
            widget.labelText  = "Report a Bug"
            widget.location   = [.bottom, .trailing]
            widget.autoInject = true
        }

        config.theme { theme in
            theme.submitBackground = .init(color: .systemBlue)
        }
        config.darkTheme { theme in
            theme.background = .init(color: .black)
        }

        config.onFormOpen  = { print("Feedback form opened") }
        config.onFormClose = { print("Feedback form closed") }
        config.onSubmitSuccess = { data in
            print("✅ Feedback: \(data["message"] ?? "")")
        }
        config.onSubmitError = { error in
            print("❌ Submission failed: \(error)")
        }
    }
}
```

## SentryUserFeedbackWidgetConfiguration Reference

| Property | Type | Default |
|----------|------|---------|
| `autoInject` | `Bool` | `true` |
| `location` | `[NSDirectionalRectEdge]` | `[.bottom, .trailing]` |
| `layoutUIOffset` | `UIOffset` | `.zero` |
| `windowLevel` | `UIWindow.Level` | `normal + 1` |
| `showIcon` | `Bool` | `true` |
| `labelText` | `String?` | `"Report a Bug"` |
| `widgetAccessibilityLabel` | `String` | `labelText` |
| `customButton` | `UIButton?` | `nil` |

## SentryUserFeedbackFormConfiguration Reference

| Property | Type | Default |
|----------|------|---------|
| `formTitle` | `String` | `"Report a Bug"` |
| `showBranding` | `Bool` | `true` |
| `submitButtonLabel` | `String` | `"Send Bug Report"` |
| `cancelButtonLabel` | `String` | `"Cancel"` |
| `messagePlaceholder` | `String` | `"What's the bug? What did you expect?"` |
| `isNameRequired` | `Bool` | `false` |
| `showName` | `Bool` | `true` |
| `nameLabel` | `String` | `"Name"` |
| `namePlaceholder` | `String` | `"Your Name"` |
| `isEmailRequired` | `Bool` | `false` |
| `showEmail` | `Bool` | `true` |
| `emailLabel` | `String` | `"Email"` |
| `emailPlaceholder` | `String` | `"your.email@example.org"` |
| `useSentryUser` | `Bool` | `true` |

## Best Practices

- Set `useSentryUser = true` (default) and call `SentrySDK.setUser(...)` so the form pre-fills name and email — reduces friction
- Enable `showFormForScreenshots = true` — users often take screenshots when something goes wrong; it's a natural trigger
- Disable `autoInject` and use `widget.customButton = myButton` to match your app's design language
- Use `config.onSubmitSuccess` to show a native confirmation (toast/alert) after the Sentry form dismisses
- If collecting feedback from a known event ID, use `associatedEventId` to link the feedback to the specific issue in Sentry
- Add `tags` on the configuration to automatically tag all feedback events with context (e.g., app version, screen name)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget not appearing | Verify `autoInject = true`; in SwiftUI apps call `SentrySDK.feedback.showWidget()` in `.onAppear` |
| Form not opening on shake | Set `useShakeGesture = true`; verify the device is not muted (shake may be overridden by system) |
| Name/email fields not pre-filled | Ensure `useSentryUser = true` (default) and `SentrySDK.setUser(...)` was called before the form opens |
| Submission error | Check network connectivity; verify DSN is correct; inspect `onSubmitError` callback for the error |
| Feedback not linked to an issue | Use `associatedEventId` parameter with the event ID from `SentrySDK.capture(error:)` |
| Screenshot not attached | Wrap PNG `Data` in an `Attachment` and pass via `SentryFeedback.init(attachments:)`; ensure the data is non-nil and valid |
| Widget floating behind other UI | Raise `widget.windowLevel` above your custom windows |
| `configureUserFeedback` not available | Requires v8.46.0+; check your SPM/CocoaPods version |
