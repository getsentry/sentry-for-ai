# Tracing — Sentry Cocoa SDK

> Minimum SDK: `sentry-cocoa` v7.0.0+  
> SwiftUI instrumentation stable: v8.17.0+  
> File I/O manual tracing extensions: v8.48.0+

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tracesSampleRate` | `Double` (0.0–1.0) | `nil` | Uniform sample rate; mutually exclusive with `tracesSampler` |
| `tracesSampler` | `(SentrySamplingContext) -> NSNumber` | `nil` | Dynamic per-transaction sampling; overrides `tracesSampleRate` |
| `enableAutoPerformanceTracing` | `Bool` | `true` | Master switch for all automatic instrumentation |
| `enableUIViewControllerTracing` | `Bool` | `true` | UIViewController lifecycle spans |
| `enableUserInteractionTracing` | `Bool` | `true` | Transactions for UIControl tap/click events |
| `enableNetworkTracking` | `Bool` | `true` | URLSession HTTP request spans |
| `enableFileIOTracing` | `Bool` | `true` | NSData / FileManager file I/O spans |
| `enableCoreDataTracing` | `Bool` | `true` | Core Data fetch/save spans |
| `enableTimeToFullDisplayTracing` | `Bool` | `false` | TTFD span; requires `SentrySDK.reportFullyDisplayed()` |
| `enablePreWarmedAppStartTracing` | `Bool` | `true` | Prewarmed cold/warm start tracing (iOS 15+) |
| `enableDataSwizzling` | `Bool` | `true` | NSData swizzling for automatic file I/O tracing |
| `enableFileManagerSwizzling` | `Bool` | `false` | NSFileManager swizzling (experimental; needed for iOS 18+) |
| `tracePropagationTargets` | `[String]` | `[".*"]` | Hosts/regex for outgoing distributed trace headers |
| `enableSwizzling` | `Bool` | `true` | Master switch for method swizzling (required by several auto-instrumentation features) |

## Code Examples

### Basic tracing setup

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.tracesSampleRate = 1.0   // 100% in dev; lower for production (e.g., 0.2)
}
```

### Dynamic sampling with tracesSampler

```swift
SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.tracesSampler = { context in
        // Never sample next-launch transactions
        if context.isForNextAppLaunch { return 0 }
        // Always sample checkout
        if context.customSamplingContext?["flow"] as? String == "checkout" { return 1.0 }
        // Default: 25%
        return 0.25
    }
}
```

### Custom transaction with child spans

```swift
import Sentry

func performCheckout() {
    let transaction = SentrySDK.startTransaction(
        name: "checkout",
        operation: "perform-checkout",
        bindToScope: true   // makes it accessible via SentrySDK.span
    )

    let validationSpan = transaction.startChild(
        operation: "validation",
        description: "validating shopping cart"
    )
    validateShoppingCart()
    validationSpan.finish()

    let processSpan = transaction.startChild(
        operation: "process",
        description: "processing payment"
    )

    do {
        try processPayment()
        processSpan.finish()
        transaction.finish()
    } catch {
        SentrySDK.capture(error: error)
        processSpan.finish(status: .internalError)
        transaction.finish(status: .internalError)
    }
}
```

### Accessing the scope-bound span from a called function

```swift
func processPayment() {
    // Grab the transaction bound to scope (or start a standalone one)
    let span = SentrySDK.span ?? SentrySDK.startTransaction(
        name: "processPayment",
        operation: "task"
    )
    let child = span.startChild(operation: "payment.gateway")
    defer { child.finish() }

    // payment logic...
}
```

### Setting data attributes on transactions and spans

```swift
let transaction = SentrySDK.startTransaction(name: "sync", operation: "task")
transaction.setData(value: "incremental",  key: "sync.type")
transaction.setData(value: 42,             key: "sync.item_count")
transaction.setData(value: true,           key: "sync.force")
transaction.setData(value: ["a", "b"],     key: "sync.queues")

let span = transaction.startChild(operation: "db.fetch")
span.setData(value: "orders",              key: "db.table")
span.finish()
transaction.finish()
```

### Custom performance measurements

```swift
let span = SentrySDK.span

span?.setMeasurement(name: "memory_used",
                     value: 64,
                     unit: MeasurementUnitInformation.megabyte)

span?.setMeasurement(name: "profile_load_time",
                     value: 1.3,
                     unit: MeasurementUnitDuration.second)

span?.setMeasurement(name: "items_processed", value: 128)
```

---

## Automatic Instrumentation

All features are enabled once `tracesSampleRate > 0` (or `tracesSampler` is set). Disable all at once with `enableAutoPerformanceTracing = false`.

### App Start Tracing

**Platforms:** iOS, tvOS, Mac Catalyst

Measures process creation → first rendered frame. Start type classifications:

| Type | Description |
|------|-------------|
| `cold` | First launch, post-reboot, or post-update |
| `warm` | Any other process creation |
| `cold.prewarmed` | Cold start with OS pre-warm (iOS 15+) |
| `warm.prewarmed` | Warm start with OS pre-warm (iOS 15+) |

Child spans produced (sequential):

| Span | Measures |
|------|---------|
| Pre Runtime Init | Process start → runtime init |
| Runtime Init to Pre Main Initializers | Runtime init → pre-main setup |
| UIKit Init | Pre-main → Sentry SDK startup |
| Application Init | SDK startup → `didFinishLaunchingNotification` |
| Initial Frame Render | `didFinishLaunchingNotification` → first CADisplayLink callback (v9+) |

> ⚠️ If more than **5 seconds** elapse between transaction start and app-start end, app start spans are **not attached** to avoid misassociation.

### URLSession Network Tracking

**Platforms:** All  
**Note:** `NSURLConnection` is **not** supported — only `NSURLSession`.

Automatically adds HTTP spans to any active scope-bound transaction.

```swift
// Disable
options.enableNetworkTracking = false
```

### UIViewController Lifecycle Tracing

**Platforms:** iOS, tvOS, Mac Catalyst  
**Not available for:** SwiftUI (use `SentryTracedView` instead)

- Transaction operation: `ui.load`
- Transaction name: `Your_App.MainViewController`
- Auto-generated child spans: `loadView`, `viewDidLoad`, `viewWillAppear`, `viewDidAppear`
- Time to Initial Display (TTID) span: `ui.load.initial-display`

```swift
// Include framework view controllers
options.add(inAppInclude: "MyFramework")

// Exclude specific view controllers
options.swizzleClassNameExcludes = ["MyModalViewController"]

// Disable entirely
options.enableUIViewControllerTracing = false
```

### Time to Full Display (TTFD)

```swift
// Enable globally
options.enableTimeToFullDisplayTracing = true

// In your view controller, signal when async content is fully loaded:
SentrySDK.reportFullyDisplayed()
```

TTFD span status:

| Scenario | Status |
|----------|--------|
| `reportFullyDisplayed()` called | `.ok` |
| Not finished within 30 seconds | `.deadlineExceeded`; duration = TTID duration |
| Called before view appears | Reported time = TTID time |

### SwiftUI Instrumentation

**Package:** `SentrySwiftUI` (separate SPM product — do not also add `Sentry`)

```swift
import SentrySwiftUI

// Option 1: wrapper
var body: some View {
    SentryTracedView("My Awesome Screen") {
        List { /* content */ }
    }
}

// Option 2: modifier
var body: some View {
    List { /* content */ }
        .sentryTrace("My Awesome Screen")
}

// With TTFD (v8.44.0+)
SentryTracedView("Content", waitForFullDisplay: true) {
    VStack { /* async content */ }
        .onAppear {
            Task {
                data = await loadData()
                SentrySDK.reportFullyDisplayed()
            }
        }
}
```

### Slow & Frozen Frames

**Platforms:** iOS, tvOS, Mac Catalyst  
Tracked automatically during any active transaction. Appears as Mobile Vitals in the Sentry Performance UI.

| Threshold | Classification |
|-----------|----------------|
| > 16 ms per frame | Slow frame |
| > 700 ms per frame | Frozen frame |

### User Interaction Tracing

**Platforms:** iOS, tvOS, Mac Catalyst  
**Not available for:** SwiftUI

Creates a transaction for every UIControl tap/click.

- Transaction operation: `ui.action` or `ui.action.click`
- Transaction name: `YourApp_LoginViewController.loginButton`
- `idleTimeout`: 3000 ms — transaction finishes if no child spans within 3 seconds
- Transactions with **no child spans** are dropped

```swift
// Create child spans inside a tap handler:
func onLoginTapped() {
    let span = SentrySDK.span
    let child = span?.startChild(operation: "loadUserProfile")
    // ... work ...
    child?.finish()
}

// Disable
options.enableUserInteractionTracing = false
```

### File I/O Tracing (NSData)

**Platforms:** All  
Tracks `NSData` read/write operations as spans.

```swift
options.enableFileIOTracing = true   // default

// iOS 18+ / macOS 15+: NSFileManager no longer backed by NSData
// Enable experimental NSFileManager swizzling:
options.enableFileManagerSwizzling = true   // experimental, v9.0.0+
```

**Manual tracing extensions (v8.48.0+)** — only create spans when an active transaction exists:

```swift
// Data read/write
let data = try Data(contentsOfWithSentryTracing: url)
try data.writeWithSentryTracing(to: url)

// FileManager
let fm = FileManager.default
fm.createFileWithSentryTracing(atPath: path, contents: data)
try fm.moveItemWithSentryTracing(at: src, to: dst)
try fm.copyItemWithSentryTracing(at: src, to: dst)
try fm.removeItemWithSentryTracing(at: url)
```

Span operations created:

| Method | Span Op |
|--------|---------|
| `Data.init(contentsOf:)` | `file.read` |
| `data.write(to:)` / `createFile` | `file.write` |
| `moveItem` | `file.rename` |
| `copyItem` | `file.copy` |
| `removeItem` | `file.delete` |

### Core Data Tracing

**Platforms:** All  
Instruments `NSManagedObjectContext` fetch and save operations.

```swift
options.enableCoreDataTracing = true   // default

// Disable
options.enableCoreDataTracing = false
```

---

## Distributed Tracing

Sentry injects two headers into outgoing `NSURLSession` requests when the host matches `tracePropagationTargets`:

| Header | Purpose |
|--------|---------|
| `sentry-trace` | Carries trace ID, span ID, and sampled flag |
| `baggage` | Carries Dynamic Sampling Context key-value pairs |

```swift
SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.tracesSampleRate = 1.0

    // Only propagate to your own backend (default: all requests)
    options.tracePropagationTargets = [
        "api.myapp.com",
        ".*\\.myapp\\.com"   // regex supported
    ]

    // Also add W3C traceparent header (requires sentry-cocoa 9.0.0+)
    options.enablePropagateTraceparent = true
}
```

> **`enablePropagateTraceparent` requires sentry-cocoa 9.0.0+.** It is not available in 8.x.
>
> ⚠️ Both headers must be included in CORS allowlists and must not be blocked by proxies or firewalls.

---

## Platform Support Matrix

| Feature | iOS | tvOS | macOS | Mac Catalyst |
|---------|-----|------|-------|--------------|
| `tracesSampleRate` | ✅ | ✅ | ✅ | ✅ |
| App Start Tracing | ✅ | ✅ | ❌ | ✅ |
| UIViewController Lifecycle | ✅ | ✅ | ❌ | ✅ |
| TTID / TTFD | ✅ | ✅ | ❌ | ✅ |
| Slow & Frozen Frames | ✅ | ✅ | ❌ | ✅ |
| Network Tracking (URLSession) | ✅ | ✅ | ✅ | ✅ |
| File I/O Tracing | ✅ | ✅ | ✅ | ✅ |
| Core Data Tracing | ✅ | ✅ | ✅ | ✅ |
| User Interaction Tracing | ✅ | ✅ | ❌ | ✅ |
| SwiftUI (`SentryTracedView`) | ✅ (13+) | ✅ | ✅ | ✅ |
| Prewarmed App Start | ✅ (15+) | ❌ | ❌ | ❌ |
| NSFileManager Swizzling | ✅ (18+) | ✅ (18+) | ✅ (15+) | ✅ |

---

## Best Practices

- Start with `tracesSampleRate = 1.0` in development; lower to `0.1`–`0.2` in production
- Use `tracesSampler` (not `tracesSampleRate`) for route-specific or user-tier-based sampling
- Use `bindToScope: true` when starting a transaction so child spans created anywhere in the call stack are automatically linked
- Always `finish()` spans — unfinished spans are silently dropped
- Use `SentryTracedView` from the `SentrySwiftUI` package for SwiftUI screens (UIViewController tracing doesn't apply)
- Call `SentrySDK.reportFullyDisplayed()` only after your async data has been rendered — not just loaded
- Avoid setting `tracePropagationTargets = [".*"]` in production if you make requests to third-party services not using Sentry

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions appearing | Ensure `tracesSampleRate > 0` or `tracesSampler` returns `> 0` |
| Spans missing from transactions | Ensure `span.finish()` is called; check `bindToScope: true` for cross-function spans |
| App start spans not attached | Gap between transaction start and app-start end exceeded 5 seconds; check slow initialization |
| UIViewController tracing missing | Verify `enableSwizzling = true`; check class is not in `swizzleClassNameExcludes` |
| Network spans not appearing | Requires active scope-bound transaction; verify `enableNetworkTracking = true` and `enableSwizzling = true` |
| Distributed trace not linking to backend | Propagate both `sentry-trace` AND `baggage` headers; add them to CORS allowlist |
| File I/O spans missing on iOS 18+ | Enable `enableFileManagerSwizzling = true` (experimental) or use manual `WithSentryTracing` extensions |
| `SentryTracedView` not available | Add `SentrySwiftUI` SPM product — it's a separate package from `Sentry` |
| High-cardinality transaction names | UIViewController transactions use class name — expected; custom transactions should use stable names |
