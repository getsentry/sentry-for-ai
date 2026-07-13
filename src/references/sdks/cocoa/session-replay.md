# Session Replay — Sentry Cocoa SDK

> Minimum SDK: `sentry-cocoa` v8.31.1+
> View Renderer V2 (default): v8.50.0+
> Official support: iOS 16+ with UIKit and SwiftUI. tvOS 16+ may work but is not officially supported.
> SDK 9.12.0+ runs on iOS 26 Liquid Glass; verify masking for your app.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sessionReplay.sessionSampleRate` | `Float` (0.0–1.0) | `0` | Continuous recording sample rate |
| `sessionReplay.onErrorSampleRate` | `Float` (0.0–1.0) | `0` | Buffered recording sample rate (uploads on error) |
| `sessionReplay.maskAllText` | `Bool` | `true` | Mask all text content |
| `sessionReplay.maskAllImages` | `Bool` | `true` | Mask all images |
| `sessionReplay.maskedViewClasses` | `[AnyClass]` | `[]` | Additional view classes to always mask |
| `sessionReplay.unmaskedViewClasses` | `[AnyClass]` | `[]` | View classes to always unmask |
| `sessionReplay.quality` | `SentryReplayQuality` | `.medium` | Video quality (bitrate and resolution) |
| `sessionReplay.enableViewRendererV2` | `Bool` | `true` | Faster renderer (default since v8.50.0) |
| `sessionReplay.enableFastViewRendering` | `Bool` | `false` | Experimental CALayer renderer (faster, less accurate) |
| `sessionReplay.frameRate` | `UInt` | `1` | Frames per second |
| `sessionReplay.errorReplayDuration` | `TimeInterval` | `30` | Seconds of buffer kept before an error |
| `sessionReplay.sessionSegmentDuration` | `TimeInterval` | `5` | Seconds per upload segment |
| `sessionReplay.maximumDuration` | `TimeInterval` | `3600` | Maximum session duration (60 min) |
| `experimental.enableReplayNetworkDetailsCapturing` | `Bool` | `false` | Capture request/response details in replays (SDK 9.12+) |
| `sessionReplay.networkDetailAllowUrls` | `[SentryUrlMatchable]` | `[]` | URL allowlist for replay network details |
| `sessionReplay.networkDetailDenyUrls` | `[SentryUrlMatchable]` | `[]` | URL denylist for replay network details |
| `sessionReplay.networkCaptureBodies` | `Bool` | `true` | Capture bodies for allowed URLs when network details are enabled |
| `sessionReplay.networkRequestHeaders` | `[String]` | default safe headers | Request headers to capture for allowed URLs |
| `sessionReplay.networkResponseHeaders` | `[String]` | default safe headers | Response headers to capture for allowed URLs |

## Code Examples

### Basic setup

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"

    // Continuously record 10% of sessions
    options.sessionReplay.sessionSampleRate = 0.1

    // Buffer and upload on error for all other sessions
    options.sessionReplay.onErrorSampleRate = 1.0
}
```

**Sampling logic:** `sessionSampleRate` is evaluated first. If not selected for continuous recording, the SDK switches to buffered mode and evaluates `onErrorSampleRate` — keeping a rolling buffer that is uploaded only when an error fires.

### Session lifecycle

- **Starts:** SDK init or app foreground
- **Ends:** 30+ seconds in background, or 60-minute maximum
- **Buffer mode:** Keeps a rolling 30-second window; uploaded on error capture
- **Segments:** Chunked into 5-second segments for upload
- **Resumes:** Within 30 seconds of foreground using the same `replay_id`

### Privacy masking defaults

What is masked by default:

- Masked: all text content (`maskAllText = true`)
- Masked: all images (`maskAllImages = true`)
- Masked: user input fields (always masked, regardless of settings)
- Masked: video players
- Masked: WebViews
- Not masked by default: bundled image assets (considered low PII risk; shown in replay)

### SwiftUI view modifiers

```swift
import Sentry

// UNMASK a specific view (show in replay despite global maskAllText/maskAllImages)
Text("Public promotion text")
    .sentryReplayUnmask()

// MASK a specific view (hide in replay even if global masking is off)
Text("\(user.creditCardNumber)")
    .sentryReplayMask()

// Visualize masking overlay in DEBUG builds / Xcode Previews
ContentView()
    .sentryReplayPreviewMask()
```

### UIKit view instance masking

```swift
// Mask a single UIView instance
myView.sentryReplayMask()
// equivalent:
SentrySDK.replay.maskView(view: myView)

// Unmask a single UIView instance
myLabel.sentryReplayUnmask()
// equivalent:
SentrySDK.replay.unmaskView(view: myLabel)
```

> Note: Masking targets `UIView` subclasses only. You **cannot** target `UIViewController` types directly.

### Class-level masking (all instances of a class)

```swift
SentrySDK.start { options in
    options.sessionReplay.maskedViewClasses   = [MySecretView.self, CreditCardField.self]
    options.sessionReplay.unmaskedViewClasses = [MyPublicBanner.self]
}
```

### Debug — visualize the masking overlay live

```swift
#if DEBUG
SentrySDK.replay.showMaskPreview()       // full opacity
SentrySDK.replay.showMaskPreview(0.5)    // 50% opacity
#endif
```

### Network details in replays (SDK 9.12+)

Network details are opt-in and require both the experimental flag and an allowlist:

```swift
SentrySDK.start { options in
    options.experimental.enableReplayNetworkDetailsCapturing = true
    options.sessionReplay.networkDetailAllowUrls = [
        "api.myapp.com",
        ".*\\.myapp\\.com"
    ]
    options.sessionReplay.networkDetailDenyUrls = [
        "api.myapp.com/oauth",
        "api.myapp.com/payment"
    ]
    options.sessionReplay.networkCaptureBodies = false
    options.sessionReplay.networkRequestHeaders = ["Content-Type", "X-Request-ID"]
    options.sessionReplay.networkResponseHeaders = ["Content-Type", "X-Request-ID"]
}
```

Keep request and response bodies disabled unless you have explicitly reviewed them for sensitive data.

### Exclude views from subtree traversal

For views that cause crashes or performance issues during replay capture:

```swift
options.sessionReplay.excludeViewTypeFromSubtreeTraversal("MyProblematicView")
// Force-include a system view normally excluded:
options.sessionReplay.includeViewTypeInSubtreeTraversal("CameraUI.ChromeSwiftUIView")
```

### Reducing performance overhead

```swift
SentrySDK.start { options in
    options.sessionReplay.quality = .low                    // lower bitrate/resolution
    options.sessionReplay.enableFastViewRendering = true    // CALayer renderer (faster, less accurate)
}

// Disable entirely on low-power / low-end devices:
if ProcessInfo.processInfo.isLowPowerModeEnabled {
    options.sessionReplay.sessionSampleRate  = 0.0
    options.sessionReplay.onErrorSampleRate  = 0.0
}
```

### Quality enum values

| Value | Bit Rate | Resolution |
|-------|---------|------------|
| `.low` | ~50 kbps | Reduced |
| `.medium` | Default | Default |
| `.high` | Higher | Full |

---

## iOS 26 / Xcode 26 / Liquid Glass

There is version-specific behavior here:

- SDK 8.57.0 through 9.11.x auto-disabled Session Replay on iOS 26 Liquid Glass builds to avoid masking risks.
- SDK 9.12.0+ removed that safeguard after redaction fixes; Session Replay records on iOS 26 again.
- If your app needs to keep replay disabled for Liquid Glass, gate `sessionSampleRate` and `onErrorSampleRate` yourself.

Example manual gate:

```swift
var sessionRate: Float = 0.1
var errorRate: Float = 1.0

if #available(iOS 26.0, *) {
    let compatibilityMode = Bundle.main.object(forInfoDictionaryKey: "UIDesignRequiresCompatibility") as? Bool ?? false
    let xcodeVersion = Int(Bundle.main.object(forInfoDictionaryKey: "DTXcode") as? String ?? "") ?? 0
    let liquidGlassActive = xcodeVersion >= 2600 && !compatibilityMode
    if liquidGlassActive {
        sessionRate = 0
        errorRate = 0
    }
}

options.sessionReplay.sessionSampleRate = sessionRate
options.sessionReplay.onErrorSampleRate = errorRate
```

---

## Performance Overhead (iPhone 14 Pro benchmarks)

| Metric | Without Replay | With Replay |
|--------|---------------|-------------|
| FPS | 55 | 53 |
| Memory | 102 MB | 121 MB |
| CPU | 4% | 13% |
| Main thread per capture | — | ~25 ms |
| Network bandwidth | — | ~10 KB/s |

> iPhone 8 and older: The ~25 ms capture time exceeds the 16.7 ms frame budget, causing scrolling jank. View Renderer V2 (default since v8.50.0) improved from ~155 ms to ~25 ms per capture.

---

## Best Practices

- Set `maskAllText = true` and `maskAllImages = true` (both default) — only unmask content that is explicitly safe to show
- Use `.sentryReplayUnmask()` sparingly on known-safe content rather than globally disabling masking
- Start with `onErrorSampleRate = 1.0` and `sessionSampleRate = 0` to capture replays only on errors (lowest overhead)
- Test masking on real devices — use `SentrySDK.replay.showMaskPreview()` in DEBUG builds to verify
- Re-test masking on iOS 26+ Liquid Glass after every SDK or Xcode upgrade

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No replays appearing | Verify `sessionSampleRate > 0` or `onErrorSampleRate > 0`; both default to `0` |
| Replay disabled on iOS 26 | SDK 8.57.0–9.11.x auto-disabled Liquid Glass builds; SDK 9.12+ records again unless you gate sample rates yourself |
| PII visible in replay | Verify `maskAllText = true` and `maskAllImages = true`; check `.sentryReplayUnmask()` isn't applied too broadly |
| Scrolling jank during replay | Enable `enableFastViewRendering = true`; switch to `quality = .low`; consider disabling on low-end devices |
| Replay stops after 60 minutes | Expected — `maximumDuration = 3600` seconds is the default cap |
| Error buffer not uploading | Verify `onErrorSampleRate > 0`; buffer is only uploaded when `SentrySDK.capture(error:)` is called |
| App crash during replay capture | Use `excludeViewTypeFromSubtreeTraversal` for the problematic view type |
| Texture/AsyncDisplayKit views not masked | Access `.view` on the node: `SentrySDK.replay.maskView(view: myNode.view)` |
