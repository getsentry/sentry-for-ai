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
- User wants to "add error monitoring" or "crash reporting" to iOS
- User requests "session replay", "tracing", or "logging" for iOS
- User mentions "sentry-cocoa" or "@sentry/ios"
- User asks about `SentrySDK.start` or Sentry configuration in Swift

## Platform Detection

Before configuring, verify this is an iOS/Swift project:

### Detect Xcode Project

```bash
# Check for Xcode project files
ls -la *.xcodeproj *.xcworkspace 2>/dev/null

# Check for Swift Package Manager
ls -la Package.swift 2>/dev/null

# Check for app entry point
find . -name "*.swift" | xargs grep -l "@main" 2>/dev/null | head -5
```

### Detect Existing Sentry Installation

```bash
# Check Swift Package Manager dependencies
grep -r "sentry-cocoa" Package.swift Package.resolved 2>/dev/null

# Check CocoaPods
grep -i "sentry" Podfile Podfile.lock 2>/dev/null

# Check for existing Sentry imports
grep -r "import Sentry" --include="*.swift" . 2>/dev/null | head -5
```

---

## SDK Installation

### Minimum Requirements
- **iOS**: 13.0+
- **Xcode**: 15.0+
- **Swift**: 5.0+
- **SDK Version**: 9.0.0+ (current stable: 9.3.0)

### Option 1: Swift Package Manager (Recommended)

**Via Xcode UI:**
1. File > Add Package Dependencies
2. Enter URL: `https://github.com/getsentry/sentry-cocoa`
3. Select version rule (e.g., "Up to Next Major Version" from 9.0.0)
4. Add to target

**Via Package.swift:**

```swift
dependencies: [
    .package(url: "https://github.com/getsentry/sentry-cocoa", from: "9.0.0")
]
```

### Option 2: CocoaPods

```ruby
# In Podfile
pod 'Sentry', '~> 9.0'
```

Then run:
```bash
pod install
```

---

## Required Information

Ask the user for:

```
I'll help you set up Sentry for your iOS app. I need:

1. **DSN** - Your Sentry Data Source Name
   - Find it at: Project Settings > Client Keys (DSN) in Sentry

2. **Features to enable** (all recommended):
   - Error monitoring (enabled by default)
   - Tracing/Performance monitoring
   - Session Replay
   - Structured Logging
   - Profiling

3. **Environment**: development, staging, or production
```

---

## Basic Configuration

### Step 1: Locate App Entry Point

Find the main app file:
- **SwiftUI**: File with `@main` attribute (e.g., `YourAppApp.swift`)
- **UIKit**: `AppDelegate.swift`

### Step 2: Initialize Sentry

**SwiftUI App:**

```swift
import SwiftUI
import Sentry

@main
struct YourAppApp: App {
    init() {
        SentrySDK.start { options in
            options.dsn = "YOUR_DSN_HERE"
            options.environment = "development"
            
            // Debug (disable in production)
            options.debug = true
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

**UIKit App:**

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
        }
        
        return true
    }
}
```

---

## Full Configuration (All Features)

For a complete setup with all features enabled:

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    options.environment = "development"
    
    // Debug mode (disable in production)
    options.debug = true
    
    // ─────────────────────────────────────────────
    // ERROR MONITORING
    // ─────────────────────────────────────────────
    // Attach screenshot on error
    options.attachScreenshot = true
    // Attach view hierarchy on error
    options.attachViewHierarchy = true
    
    // ─────────────────────────────────────────────
    // TRACING (Performance Monitoring)
    // ─────────────────────────────────────────────
    // Sample rate: 1.0 = 100% (use lower in production)
    options.tracesSampleRate = 1.0
    
    // ─────────────────────────────────────────────
    // PROFILING
    // ─────────────────────────────────────────────
    options.configureProfiling = {
        $0.sessionSampleRate = 1.0  // 100% for development
        $0.lifecycle = .trace       // Profile during traces
    }
    
    // ─────────────────────────────────────────────
    // SESSION REPLAY
    // ─────────────────────────────────────────────
    // Record 100% of sessions (lower in production)
    options.sessionReplay.sessionSampleRate = 1.0
    // Always record sessions with errors
    options.sessionReplay.onErrorSampleRate = 1.0
    
    // ─────────────────────────────────────────────
    // STRUCTURED LOGGING
    // ─────────────────────────────────────────────
    options.enableLogs = true
}
```

### Production Configuration

For production, use appropriate sample rates:

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    options.environment = "production"
    options.debug = false
    
    // Error monitoring
    options.attachScreenshot = true
    options.attachViewHierarchy = true
    
    // Tracing: 10-20% in production
    options.tracesSampleRate = 0.2
    
    // Profiling: Match tracing rate
    options.configureProfiling = {
        $0.sessionSampleRate = 0.2
        $0.lifecycle = .trace
    }
    
    // Session Replay: 10% general, 100% on error
    options.sessionReplay.sessionSampleRate = 0.1
    options.sessionReplay.onErrorSampleRate = 1.0
    
    // Logging
    options.enableLogs = true
}
```

---

## Structured Logging

### SDK Version Requirement
Logs require SDK version **8.55.0+** (recommended: 9.0.0+)

### Using the Logger API

```swift
import Sentry

let logger = SentrySDK.logger

// Six log levels available
logger.trace("Detailed trace information")
logger.debug("Debug information")
logger.info("Informational message")
logger.warn("Warning message")
logger.error("Error occurred")
logger.fatal("Fatal error")
```

### Logging with Attributes

```swift
// Add structured data for filtering
logger.info("User action completed", attributes: [
    "userId": "user_123",
    "action": "checkout",
    "itemCount": 3
])

logger.error("API request failed", attributes: [
    "endpoint": "/api/users",
    "statusCode": 500,
    "retryCount": 2
])
```

### String Interpolation

Swift automatically extracts interpolated values as attributes:

```swift
let userId = "user_123"
let itemCount = 5

// Values automatically become searchable attributes
logger.info("User \(userId) purchased \(itemCount) items")
```

### Log Filtering

Filter logs before sending:

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    options.enableLogs = true
    
    options.beforeSendLog = { log in
        // Filter out debug logs in production
        if log.level == .debug {
            return nil
        }
        return log
    }
}
```

---

## Session Replay

### Default Masking Behavior

By default, Session Replay masks:
- All text content
- All images
- User input

### Unmasking Content (Development Only)

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    
    options.sessionReplay.sessionSampleRate = 1.0
    options.sessionReplay.onErrorSampleRate = 1.0
    
    // WARNING: Only for development/testing
    options.sessionReplay.maskAllText = false
    options.sessionReplay.maskAllImages = false
}
```

### SwiftUI Masking Modifiers

**Unmask safe content:**

```swift
Text("Welcome to the App")
    .sentryReplayUnmask()

VStack {
    Text("Public Information")
    Image("logo")
}
.sentryReplayUnmask()
```

**Mask sensitive content:**

```swift
Text(user.email)
    .sentryReplayMask()

Text(user.creditCardLast4)
    .sentryReplayMask()
```

**Handle SwiftUI backgrounds:**

```swift
VStack {
    Text("Hello")
    Text(user.name)
        .sentryReplayMask()  // Mask sensitive part
}
.background(.blue)
.sentryReplayUnmask()  // Unmask container
```

### Masking by View Class

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    
    // Always mask these view types
    options.sessionReplay.maskedViewClasses = [
        SensitiveDataView.self,
        PaymentFormView.self
    ]
    
    // Never mask these types
    options.sessionReplay.unmaskedViewClasses = [
        PublicLabel.self
    ]
}
```

### Debug Masking Configuration

```swift
#if DEBUG
// Show overlay on masked elements
SentrySDK.replay.showMaskPreview()

// With custom opacity
SentrySDK.replay.showMaskPreview(0.5)
#endif
```

For SwiftUI Previews:

```swift
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .sentryReplayPreviewMask()
    }
}
```

---

## Tracing (Performance Monitoring)

### What's Automatically Captured

With tracing enabled, Sentry automatically instruments:

| Operation | Description |
|-----------|-------------|
| App Launches | Cold and warm start times |
| Network Requests | All URLSession requests |
| UI Transitions | Screen loads, view controller lifecycle |
| File I/O | Read/write operations |
| Core Data | Fetch and save operations |
| App Hangs | Main thread blocking |

### Custom Spans

Create custom spans for specific operations:

```swift
import Sentry

// Simple span
let span = SentrySDK.span
let childSpan = span?.startChild(operation: "custom.operation", description: "Processing data")

// Do work...

childSpan?.finish()
```

### Async/Await Pattern

```swift
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

### Dynamic Sampling

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    
    options.tracesSampler = { context in
        // Always trace VIP users
        if context?["vip"] as? Bool == true {
            return 1.0
        }
        
        // Sample 25% of normal users
        return 0.25
    }
}
```

---

## Profiling

Profiling captures CPU usage and call stacks during traces.

### Configuration

```swift
SentrySDK.start { options in
    options.dsn = "YOUR_DSN_HERE"
    options.tracesSampleRate = 1.0
    
    options.configureProfiling = {
        // Sample rate for profiling (0.0 to 1.0)
        $0.sessionSampleRate = 1.0
        
        // Profile during traces
        $0.lifecycle = .trace
    }
}
```

### Lifecycle Options

| Option | Behavior |
|--------|----------|
| `.trace` | Profile during active traces only |
| `.manual` | Manual control over profiling start/stop |

---

## User Context

Set user information for better issue tracking:

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

Capture errors manually when needed:

```swift
// Capture an error
do {
    try riskyOperation()
} catch {
    SentrySDK.capture(error: error)
}

// Capture a message
SentrySDK.capture(message: "Something noteworthy happened")

// Capture with extra context
SentrySDK.capture(error: error) { scope in
    scope.setTag(value: "checkout", key: "feature")
    scope.setExtra(value: orderId, key: "order_id")
}
```

---

## Verification Steps

After setup, verify everything is working:

### 1. Test Error Capture

```swift
// Add temporarily to test
Button("Test Sentry") {
    SentrySDK.capture(message: "Test message from iOS app")
}
```

### 2. Test Crash Capture

```swift
// Add temporarily (will crash the app)
Button("Test Crash") {
    SentrySDK.crash()
}
```

### 3. Test Logging

```swift
Button("Test Logs") {
    SentrySDK.logger.info("Test log from iOS app", attributes: [
        "test": true
    ])
}
```

### 4. Check Sentry Dashboard

1. **Issues** - Look for test message/crash
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
3. Ensure app is in foreground
4. For SwiftUI, check masking isn't hiding everything

### Issue: Tracing spans missing

**Solutions:**
1. Verify `tracesSampleRate > 0`
2. Check that operation is within an active transaction
3. Ensure spans are properly finished with `.finish()`

### Issue: Logs not appearing

**Solutions:**
1. Verify `options.enableLogs = true`
2. Check SDK version is 8.55.0+
3. Verify `beforeSendLog` isn't filtering everything
4. Check Sentry dashboard under Explore > Logs

### Issue: Profiling data missing

**Solutions:**
1. Verify `configureProfiling` is set
2. Check `tracesSampleRate > 0` (profiling requires tracing)
3. Ensure `sessionSampleRate > 0` in profiling config

### Issue: CocoaPods installation fails

**Solutions:**
1. Run `pod repo update`
2. Delete `Podfile.lock` and `Pods/` directory
3. Run `pod install` again
4. Ensure minimum iOS deployment target is 13.0+

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
- [ ] Error monitoring enabled (default)
- [ ] attachScreenshot enabled
- [ ] attachViewHierarchy enabled

### Features Enabled:
- [ ] Tracing (tracesSampleRate)
- [ ] Profiling (configureProfiling)
- [ ] Session Replay (sessionReplay settings)
- [ ] Logging (enableLogs)

### Privacy (if Session Replay enabled):
- [ ] Masking strategy reviewed
- [ ] Sensitive views masked
- [ ] SwiftUI modifiers applied where needed

### Verification:
- [ ] Test message captured
- [ ] Events appearing in Sentry dashboard
- [ ] Traces visible in Performance
- [ ] Replays visible (if enabled)
- [ ] Logs visible (if enabled)

### Next Steps:
1. Set appropriate sample rates for production
2. Configure user context after authentication
3. Add custom spans for important operations
4. Review masking for sensitive screens
```

---

## Quick Reference

| Feature | Configuration | Minimum SDK |
|---------|--------------|-------------|
| Error Monitoring | Default (always on) | Any |
| Tracing | `tracesSampleRate` | 8.0.0+ |
| Session Replay | `sessionReplay.sessionSampleRate` | 8.0.0+ |
| Logging | `enableLogs = true` | 8.55.0+ |
| Profiling | `configureProfiling` | 8.0.0+ |

| Log Level | Method | Use Case |
|-----------|--------|----------|
| Trace | `logger.trace()` | Finest detail, method entry/exit |
| Debug | `logger.debug()` | Development debugging |
| Info | `logger.info()` | Normal operations, business events |
| Warn | `logger.warn()` | Potential issues |
| Error | `logger.error()` | Errors that don't crash |
| Fatal | `logger.fatal()` | Critical failures |

| Replay Modifier | Purpose |
|-----------------|---------|
| `.sentryReplayMask()` | Hide view content |
| `.sentryReplayUnmask()` | Show view content |
| `.sentryReplayPreviewMask()` | Preview masking in SwiftUI previews |
