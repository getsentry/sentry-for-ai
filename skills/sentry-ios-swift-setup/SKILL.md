---
name: sentry-ios-swift-setup
description: Setup Sentry in iOS/Swift apps. Use when asked to add Sentry to iOS, install sentry-cocoa SDK, or configure error monitoring, tracing, session replay, logging, or profiling for iOS applications using Swift and SwiftUI.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, AskUserQuestion
---

# Setup Sentry for iOS (Swift)

This skill helps configure Sentry's iOS SDK (sentry-cocoa) for Swift and SwiftUI applications, including error monitoring, tracing, session replay, structured logging, and profiling.

## When to Use This Skill

Invoke this skill when:
- User asks to "setup Sentry for iOS" or "add Sentry to my Swift app"
- User wants error monitoring, crash reporting, or performance monitoring for iOS
- User requests session replay, tracing, logging, or profiling for iOS
- User mentions "sentry-cocoa" or `SentrySDK.start`

## Platform Detection

Before configuring, verify this is an iOS/Swift project:

```bash
# Check for Xcode project files
ls -la *.xcodeproj *.xcworkspace Package.swift 2>/dev/null

# Check for existing Sentry installation
grep -r "sentry-cocoa" Package.swift Package.resolved 2>/dev/null
grep -i "sentry" Podfile Podfile.lock 2>/dev/null

# Check for existing Sentry imports
grep -r "import Sentry" --include="*.swift" . 2>/dev/null | head -5
```

### Minimum Requirements
- **iOS**: 13.0+ / **Xcode**: 15.0+ / **Swift**: 5.0+
- **SDK Version**: 9.0.0+ (current stable: 9.3.0)

---

## Step 1: Install SDK

### Option A: Swift Package Manager (Recommended)

**Via Package.swift:**

```swift
dependencies: [
    .package(url: "https://github.com/getsentry/sentry-cocoa", from: "9.0.0")
]
```

Or via Xcode: File > Add Package Dependencies > `https://github.com/getsentry/sentry-cocoa`

### Option B: CocoaPods

```ruby
pod 'Sentry', '~> 9.0'
```

Then run `pod install`.

---

## Step 2: Locate App Entry Point

Find the main app file:
- **SwiftUI**: File with `@main` attribute (e.g., `YourAppApp.swift`)
- **UIKit**: `AppDelegate.swift`

---

## Step 3: Initialize Sentry

### SwiftUI App

```swift
import SwiftUI
import Sentry

@main
struct YourAppApp: App {
    init() {
        SentrySDK.start { options in
            options.dsn = "YOUR_DSN_HERE"
            options.environment = "development"
            options.debug = true  // Disable in production

            // Error monitoring
            options.attachScreenshot = true
            options.attachViewHierarchy = true

            // Tracing (1.0 = 100%, lower in production)
            options.tracesSampleRate = 1.0

            // Profiling
            options.configureProfiling = {
                $0.sessionSampleRate = 1.0
                $0.lifecycle = .trace
            }

            // Session Replay
            options.sessionReplay.sessionSampleRate = 1.0
            options.sessionReplay.onErrorSampleRate = 1.0

            // Structured Logging
            options.enableLogs = true
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### UIKit App

```swift
import UIKit
import Sentry

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        SentrySDK.start { options in
            options.dsn = "YOUR_DSN_HERE"
            options.environment = "development"
            options.debug = true
            options.attachScreenshot = true
            options.attachViewHierarchy = true
            options.tracesSampleRate = 1.0
            options.configureProfiling = {
                $0.sessionSampleRate = 1.0
                $0.lifecycle = .trace
            }
            options.sessionReplay.sessionSampleRate = 1.0
            options.sessionReplay.onErrorSampleRate = 1.0
            options.enableLogs = true
        }

        return true
    }
}
```

### Production Sample Rates

For production, use appropriate sample rates:

```swift
options.debug = false
options.tracesSampleRate = 0.2
options.configureProfiling = { $0.sessionSampleRate = 0.2; $0.lifecycle = .trace }
options.sessionReplay.sessionSampleRate = 0.1
options.sessionReplay.onErrorSampleRate = 1.0
```

---

## Structured Logging

Requires SDK 8.55.0+ (recommended: 9.0.0+). Ensure `options.enableLogs = true` is set.

```swift
let logger = SentrySDK.logger

// Basic levels
logger.trace("Detailed trace information")
logger.debug("Debug information")
logger.info("Informational message")
logger.warn("Warning message")
logger.error("Error occurred")
logger.fatal("Fatal error")

// With attributes
logger.info("User action completed", attributes: [
    "userId": "user_123",
    "action": "checkout",
    "itemCount": 3
])

// String interpolation (values become searchable attributes)
logger.info("User \(userId) purchased \(itemCount) items")
```

### Log Filtering

```swift
options.beforeSendLog = { log in
    if log.level == .debug { return nil }
    return log
}
```

---

## Session Replay

By default, Session Replay masks all text, images, and user input.

### SwiftUI Masking Modifiers

```swift
// Unmask safe content
Text("Welcome to the App").sentryReplayUnmask()

// Mask sensitive content
Text(user.email).sentryReplayMask()
Text(user.creditCardLast4).sentryReplayMask()
```

### Masking by View Class

```swift
options.sessionReplay.maskedViewClasses = [SensitiveDataView.self]
options.sessionReplay.unmaskedViewClasses = [PublicLabel.self]
```

### Unmasking for Development

```swift
// WARNING: Only for development/testing
options.sessionReplay.maskAllText = false
options.sessionReplay.maskAllImages = false
```

---

## Custom Spans

With tracing enabled, Sentry automatically instruments app launches, URLSession requests, UI transitions, File I/O, Core Data, and app hangs.

For custom operations:

```swift
// Simple span
let span = SentrySDK.span
let childSpan = span?.startChild(operation: "custom.operation", description: "Processing data")
// Do work...
childSpan?.finish()

// Async/await pattern
func processOrder(_ orderId: String) async throws -> Order {
    let span = SentrySDK.span?.startChild(
        operation: "order.process",
        description: "Processing order \(orderId)"
    )
    defer { span?.finish() }
    span?.setData(value: orderId, key: "order.id")
    let order = try await orderService.process(orderId)
    span?.setData(value: order.total, key: "order.total")
    return order
}
```

---

## User Context

```swift
// Set user after authentication
let user = User()
user.userId = "user_123"
user.email = "user@example.com"
user.username = "johndoe"
SentrySDK.setUser(user)

// Clear on logout
SentrySDK.setUser(nil)
```

---

## Manual Error Capture

```swift
// Capture an error
do {
    try riskyOperation()
} catch {
    SentrySDK.capture(error: error)
}

// Capture with extra context
SentrySDK.capture(error: error) { scope in
    scope.setTag(value: "checkout", key: "feature")
    scope.setExtra(value: orderId, key: "order_id")
}
```

---

## Verification Steps

```swift
// Test error capture
SentrySDK.capture(message: "Test message from iOS app")

// Test logging
SentrySDK.logger.info("Test log from iOS app", attributes: ["test": true])
```

**Check in Sentry:**
1. **Issues** - Look for test message
2. **Performance** - Look for app start transactions
3. **Replays** - Look for session recordings
4. **Logs** - Look for test log entry

---

## Common Issues and Solutions

### Issue: Events not appearing in Sentry
**Solutions:**
1. Verify DSN is correct
2. Check `options.debug = true` for console output
3. Ensure network connectivity
4. Wait 1-2 minutes for events to process

### Issue: Session Replay not recording
**Solutions:**
1. Verify `sessionSampleRate > 0`
2. Check SDK version is 8.0.0+
3. For SwiftUI, check masking isn't hiding everything

### Issue: Tracing spans missing
**Solutions:**
1. Verify `tracesSampleRate > 0`
2. Ensure spans are properly finished with `.finish()`

### Issue: Logs not appearing
**Solutions:**
1. Verify `options.enableLogs = true`
2. Check SDK version is 8.55.0+
3. Verify `beforeSendLog` isn't filtering everything

### Issue: CocoaPods installation fails
**Solutions:**
1. Run `pod repo update`
2. Delete `Podfile.lock` and `Pods/` directory, re-run `pod install`
3. Ensure minimum iOS deployment target is 13.0+

---

## Summary Checklist

```markdown
## Sentry iOS Setup Complete

### Installation:
- [ ] SDK added via Swift Package Manager or CocoaPods
- [ ] SDK version 9.0.0+ installed

### Configuration Applied:
- [ ] DSN configured
- [ ] Environment set
- [ ] attachScreenshot / attachViewHierarchy enabled
- [ ] Tracing (tracesSampleRate)
- [ ] Profiling (configureProfiling)
- [ ] Session Replay (sessionReplay settings)
- [ ] Logging (enableLogs)

### Next Steps:
1. Set appropriate sample rates for production
2. Configure user context after authentication
3. Review masking for sensitive screens
4. Add custom spans for important operations
```

---

## Quick Reference

| Feature | Configuration | Minimum SDK |
|---------|--------------|-------------|
| Error Monitoring | Default (always on) | Any |
| Tracing | `tracesSampleRate` | 8.0.0+ |
| Profiling | `configureProfiling` | 8.0.0+ |
| Session Replay | `sessionReplay.sessionSampleRate` | 8.0.0+ |
| Logging | `enableLogs = true` | 8.55.0+ |

| Replay Modifier | Purpose |
|-----------------|---------|
| `.sentryReplayMask()` | Hide view content |
| `.sentryReplayUnmask()` | Show view content |
| `.sentryReplayPreviewMask()` | Preview masking in SwiftUI previews |
