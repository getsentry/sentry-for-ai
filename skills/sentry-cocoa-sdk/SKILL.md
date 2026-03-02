---
name: sentry-cocoa-sdk
description: Full Sentry SDK setup for Apple platforms (iOS, macOS, tvOS, watchOS, visionOS). Use when asked to "add Sentry to iOS", "add Sentry to Swift", "install sentry-cocoa", or configure error monitoring, tracing, profiling, session replay, or logging for Apple applications. Supports SwiftUI and UIKit.
license: Apache-2.0
category: sdk-setup
parent: sentry-sdk-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [SDK Setup](../sentry-sdk-setup/SKILL.md) > Cocoa SDK

# Sentry Cocoa SDK

Opinionated wizard that scans your Apple project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to iOS/macOS/tvOS" or "set up Sentry" in an Apple app
- User wants error monitoring, tracing, profiling, session replay, or logging in Swift/ObjC
- User mentions `sentry-cocoa`, `SentrySDK`, or the Apple/iOS Sentry SDK
- User wants to monitor crashes, app hangs, watchdog terminations, or performance

> **Note:** SDK versions and APIs below reflect Sentry docs at time of writing (sentry-cocoa 9.5.1).
> Always verify against [docs.sentry.io/platforms/apple/](https://docs.sentry.io/platforms/apple/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making any recommendations:

```bash
# Check existing Sentry dependency
grep -i sentry Package.swift Podfile Cartfile 2>/dev/null

# Detect UI framework (SwiftUI vs UIKit)
grep -rE "@main|struct.*App.*:.*App" --include="*.swift" . 2>/dev/null | head -5
grep -rE "AppDelegate|UIApplicationMain" --include="*.swift" . 2>/dev/null | head -5

# Detect platform and deployment targets
grep -E "platforms:|\.iOS|\.macOS|\.tvOS|\.watchOS|\.visionOS" Package.swift 2>/dev/null
grep -E "platform :ios|platform :osx|platform :tvos|platform :watchos" Podfile 2>/dev/null

# Detect logging
grep -rE "import OSLog|os\.log|CocoaLumberjack|DDLog" --include="*.swift" . 2>/dev/null | head -5

# Detect companion backend
ls ../backend ../server ../api 2>/dev/null
ls ../go.mod ../requirements.txt ../Gemfile ../package.json 2>/dev/null
```

**What to note:**
- Is `sentry-cocoa` already in `Package.swift` or `Podfile`? If yes, skip to Phase 2 (configure features).
- SwiftUI (`@main App` struct) or UIKit (`AppDelegate`)? Determines init pattern.
- Which Apple platforms? (Affects which features are available — see Platform Support Matrix.)
- Existing logging library? (Enables structured log capture.)
- Companion backend? (Triggers Phase 4 cross-link for distributed tracing.)

---

## Phase 2: Recommend

Based on what you found, present a concrete recommendation. Don't ask open-ended questions — lead with a proposal:

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; crash reporting, app hangs, watchdog terminations, NSError/Swift errors
- ✅ **Tracing** — always for apps; auto-instruments app launch, network, UIViewController, file I/O, Core Data
- ✅ **Profiling** — production apps; continuous profiling with minimal overhead

**Optional (enhanced observability):**
- ⚡ **Session Replay** — user-facing apps; ⚠️ disabled by default on iOS 26+ (Liquid Glass rendering)
- ⚡ **Logging** — when structured log capture is needed
- ⚡ **User Feedback** — apps that want crash/error feedback forms from users

**Not available for Cocoa:**
- ❌ Metrics — use custom spans instead
- ❌ Crons — backend only
- ❌ AI Monitoring — JS/Python only

**Recommendation logic:**

| Feature | Recommend when... |
|---------|------------------|
| Error Monitoring | **Always** — non-negotiable baseline |
| Tracing | **Always for apps** — rich auto-instrumentation out of the box |
| Profiling | Production apps where performance matters |
| Session Replay | **iOS only** user-facing apps (check iOS 26+ caveat; not tvOS/macOS/watchOS/visionOS) |
| Logging | Existing `os.log` / CocoaLumberjack usage, or structured logs needed |
| User Feedback | Apps wanting in-app bug reports with screenshots |

Propose: *"I recommend Error Monitoring + Tracing + Profiling. Want me to also add Session Replay and Logging?"*

---

## Phase 3: Guide

### Install

**Option 1 — Sentry Wizard (recommended):**

> **You need to run this yourself** — the wizard opens a browser for login and requires interactive input that the agent can't handle. Copy-paste into your terminal:
>
> ```
> brew install getsentry/tools/sentry-wizard && sentry-wizard -i ios
> ```
>
> It handles login, org/project selection, auth token setup, SDK installation, AppDelegate updates, and dSYM/debug symbol upload build phases.
>
> **Once it finishes, come back and the agent will continue with configuration.**

If the user skips the wizard, proceed with Option 2 (SPM/CocoaPods) and manual setup below.

**Option 2 — Swift Package Manager:** File → Add Packages → enter:
```
https://github.com/getsentry/sentry-cocoa.git
```

Or in `Package.swift`:
```swift
.package(url: "https://github.com/getsentry/sentry-cocoa", from: "9.5.1"),
```

**SPM Products** — choose **exactly one** per target:

| Product | Use Case |
|---------|----------|
| `Sentry` | **Recommended** — static framework, fast app start |
| `Sentry-Dynamic` | Dynamic framework alternative |
| `SentrySwiftUI` | SwiftUI view performance tracking (`SentryTracedView`) |
| `Sentry-WithoutUIKitOrAppKit` | watchOS, app extensions, CLI tools |

> ⚠️ Xcode allows selecting multiple products — choose only one.

**Option 3 — CocoaPods:**
```ruby
platform :ios, '11.0'
use_frameworks!

target 'YourApp' do
  pod 'Sentry', :git => 'https://github.com/getsentry/sentry-cocoa.git', :tag => '9.5.1'
end
```

> **Known issue (Xcode 14+):** Sandbox `rsync.samba` error → Target Settings → "Enable User Script Sandbox" → `NO`.

---

### Quick Start — Recommended Init

Full config enabling the most features with sensible defaults. Add before any other code at app startup.

**SwiftUI — App entry point:**
```swift
import SwiftUI
import Sentry

@main
struct MyApp: App {
    init() {
        SentrySDK.start { options in
            options.dsn = ProcessInfo.processInfo.environment["SENTRY_DSN"]
                ?? "https://examplePublicKey@o0.ingest.sentry.io/0"
            options.environment = ProcessInfo.processInfo.environment["SENTRY_ENVIRONMENT"]
            options.releaseName = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String

            // Error monitoring (on by default — explicit for clarity)
            options.enableCrashHandler = true
            options.enableAppHangTrackingV2 = true
            options.enableWatchdogTerminationTracking = true
            options.attachScreenshot = true
            options.attachViewHierarchy = true
            options.sendDefaultPii = true

            // Tracing
            options.tracesSampleRate = 1.0          // lower to 0.2 in high-traffic production

            // Profiling (SDK 9.0.0+ API)
            options.configureProfiling = {
                $0.sessionSampleRate = 1.0
                $0.lifecycle = .trace
            }

            // Session Replay (disabled on iOS 26+ by default — safe to configure)
            options.sessionReplay.sessionSampleRate = 1.0
            options.sessionReplay.onErrorSampleRate = 1.0

            // Logging (SDK 9.0.0+ top-level; use options.experimental.enableLogs in 8.x)
            options.enableLogs = true
        }
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

**UIKit — AppDelegate:**
```swift
import UIKit
import Sentry

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        SentrySDK.start { options in
            options.dsn = ProcessInfo.processInfo.environment["SENTRY_DSN"]
                ?? "https://examplePublicKey@o0.ingest.sentry.io/0"
            options.environment = ProcessInfo.processInfo.environment["SENTRY_ENVIRONMENT"]
            options.releaseName = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String

            options.enableCrashHandler = true
            options.enableAppHangTrackingV2 = true
            options.enableWatchdogTerminationTracking = true
            options.attachScreenshot = true
            options.attachViewHierarchy = true
            options.sendDefaultPii = true

            options.tracesSampleRate = 1.0

            options.configureProfiling = {
                $0.sessionSampleRate = 1.0
                $0.lifecycle = .trace
            }

            options.sessionReplay.sessionSampleRate = 1.0
            options.sessionReplay.onErrorSampleRate = 1.0

            // Logging (SDK 9.0.0+ top-level; use options.experimental.enableLogs in 8.x)
            options.enableLogs = true
        }
        return true
    }
}
```

> ⚠️ SDK initialization must occur on the **main thread**.

---

### For Each Agreed Feature

Walk through features one at a time. Load the reference file for each, follow its steps, and verify before moving to the next:

| Feature | Reference file | Load when... |
|---------|---------------|-------------|
| Error Monitoring | `${SKILL_ROOT}/references/error-monitoring.md` | Always (baseline) |
| Tracing | `${SKILL_ROOT}/references/tracing.md` | App launch, network, UIViewController perf |
| Profiling | `${SKILL_ROOT}/references/profiling.md` | Production perf-sensitive apps |
| Session Replay | `${SKILL_ROOT}/references/session-replay.md` | User-facing iOS/tvOS apps |
| Logging | `${SKILL_ROOT}/references/logging.md` | Structured log capture needed |
| User Feedback | `${SKILL_ROOT}/references/user-feedback.md` | In-app bug reporting wanted |

For each feature: `Read ${SKILL_ROOT}/references/<feature>.md`, follow steps exactly, verify it works.

---

## Configuration Reference

### Key `SentryOptions` Fields

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `dsn` | `String` | `""` | SDK disabled if empty; reads `SENTRY_DSN` env var |
| `environment` | `String` | `""` | e.g., `"production"`; reads `SENTRY_ENVIRONMENT` |
| `releaseName` | `String` | `""` | e.g., `"my-app@1.0.0"`; reads `SENTRY_RELEASE` |
| `debug` | `Bool` | `false` | Verbose SDK output — **disable in production** |
| `sendDefaultPii` | `Bool` | `false` | Include IP, user info from active integrations |
| `enableCrashHandler` | `Bool` | `true` | Master switch for crash reporting |
| `enableAppHangTrackingV2` | `Bool` | `true` (9.0+) | Differentiates fully/non-fully blocked hangs |
| `appHangTimeoutInterval` | `Double` | `2.0` | Seconds before classifying as hang |
| `enableWatchdogTerminationTracking` | `Bool` | `true` | Track watchdog kills (iOS, tvOS, Mac Catalyst) |
| `attachScreenshot` | `Bool` | `false` | Capture screenshot on error |
| `attachViewHierarchy` | `Bool` | `false` | Capture view hierarchy on error |
| `tracesSampleRate` | `NSNumber?` | `nil` | Transaction sample rate (`nil` = tracing disabled); Swift auto-boxes `Double` literals (e.g. `1.0` → `NSNumber`) |
| `tracesSampler` | `Closure` | `nil` | Dynamic per-transaction sampling (overrides rate) |
| `enableAutoPerformanceTracing` | `Bool` | `true` | Master switch for auto-instrumentation |
| `tracePropagationTargets` | `[String]` | `[".*"]` | Hosts/regex that receive distributed trace headers |
| `enableCaptureFailedRequests` | `Bool` | `true` | Auto-capture HTTP 5xx errors as events |
| `enableNetworkBreadcrumbs` | `Bool` | `true` | Breadcrumbs for outgoing HTTP requests |
| `inAppInclude` | `[String]` | `[]` | Module prefixes treated as "in-app" code |
| `maxBreadcrumbs` | `Int` | `100` | Max breadcrumbs per event |
| `sampleRate` | `Float` | `1.0` | Error event sample rate |
| `beforeSend` | `Closure` | `nil` | Hook to mutate/drop error events |
| `onCrashedLastRun` | `Closure` | `nil` | Called on next launch after a crash |

### Environment Variables

| Variable | Maps to | Purpose |
|----------|---------|---------|
| `SENTRY_DSN` | `dsn` | Data Source Name |
| `SENTRY_RELEASE` | `releaseName` | App version (e.g., `my-app@1.0.0`) |
| `SENTRY_ENVIRONMENT` | `environment` | Deployment environment |

### Platform Feature Support Matrix

| Feature | iOS | tvOS | macOS | watchOS | visionOS |
|---------|-----|------|-------|---------|----------|
| Crash Reporting | ✅ | ✅ | ✅ | ✅ | ✅ |
| App Hangs V2 | ✅ | ✅ | ❌ | ❌ | ❌ |
| Watchdog Termination | ✅ | ✅ | ❌ | ❌ | ❌ |
| App Start Tracing | ✅ | ✅ | ❌ | ❌ | ✅ |
| UIViewController Tracing | ✅ | ✅ | ❌ | ❌ | ✅ |
| SwiftUI Tracing | ✅ | ✅ | ✅ | ❌ | ✅ |
| Network Tracking | ✅ | ✅ | ✅ | ❌ | ✅ |
| Profiling | ✅ | ✅ | ✅ | ❌ | ✅ |
| Session Replay | ✅ | ❌ | ❌ | ❌ | ❌ |
| MetricKit | ✅ (15+) | ❌ | ✅ (12+) | ❌ | ❌ |

---

## Verification

Test that Sentry is receiving events:

```swift
// Trigger a test error event:
SentrySDK.capture(message: "Sentry Cocoa SDK test")

// Or test crash reporting (without debugger — crashes are intercepted by debugger):
// SentrySDK.crash()  // uncomment, run without debugger, relaunch to see crash report
```

Check the Sentry dashboard within a few seconds. If nothing appears:
1. Set `options.debug = true` — prints SDK internals to Xcode console
2. Verify the DSN is correct and the project exists
3. Ensure initialization is on the **main thread**

---

## Production Settings

Lower sample rates for production to control volume and cost:

```swift
options.tracesSampleRate = 0.2          // 20% of transactions

options.configureProfiling = {
    $0.sessionSampleRate = 0.1          // 10% of sessions
    $0.lifecycle = .trace
}

options.sessionReplay.sessionSampleRate = 0.1   // 10% continuous
options.sessionReplay.onErrorSampleRate = 1.0   // 100% on error (keep high)

options.debug = false                   // never in production
```

---

## Phase 4: Cross-Link

After completing Apple setup, check for a companion backend missing Sentry coverage:

```bash
# Detect companion backend
ls ../backend ../server ../api 2>/dev/null
cat ../go.mod 2>/dev/null | head -5
cat ../requirements.txt ../Pipfile 2>/dev/null | head -5
cat ../Gemfile 2>/dev/null | head -5
cat ../package.json 2>/dev/null | grep -E '"name"|"dependencies"' | head -5
```

If a backend is found, configure `tracePropagationTargets` to enable distributed tracing end-to-end, and suggest the matching skill:

| Backend detected | Suggest skill | Trace header support |
|-----------------|--------------|---------------------|
| Go (`go.mod`) | `sentry-go-sdk` | ✅ automatic |
| Python (`requirements.txt`) | `sentry-python-sdk` | ✅ automatic |
| Ruby (`Gemfile`) | `sentry-ruby-sdk` | ✅ automatic |
| Node.js backend (`package.json`) | `sentry-node-sdk` (or `sentry-express-sdk`) | ✅ automatic |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `debug: true`, verify DSN format, ensure init is on main thread |
| Crashes not captured | **Run without debugger attached** — debugger intercepts signals |
| App hangs not reported | Auto-disabled when debugger attached; check `appHangTimeoutInterval` |
| Session Replay not recording | Check iOS version — disabled by default on iOS 26+ (Liquid Glass); verify `sessionSampleRate > 0` |
| Tracing data missing | Confirm `tracesSampleRate > 0`; check `enableAutoPerformanceTracing = true` |
| Profiling data missing | Verify `sessionSampleRate > 0` in `configureProfiling`; for `.trace` lifecycle, tracing must be enabled |
| `rsync.samba` build error (CocoaPods) | Target Settings → "Enable User Script Sandbox" → `NO` |
| Multiple SPM products selected | Choose **only one** of `Sentry`, `Sentry-Dynamic`, `SentrySwiftUI`, `Sentry-WithoutUIKitOrAppKit` |
| `inAppExclude` compile error | Removed in SDK 9.0.0 — use `inAppInclude` only |
| Watchdog termination not tracked | Requires `enableCrashHandler = true` (it is by default) |
| Network breadcrumbs missing | Requires `enableSwizzling = true` (it is by default) |
| `profilesSampleRate` compile error | Removed in SDK 9.0.0 — use `configureProfiling` closure instead |
