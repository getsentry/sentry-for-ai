# Session Replay — Sentry Cocoa SDK

> Minimum SDK: `sentry-cocoa` v8.31.1+  
> View Renderer V2 (default): v8.50.0+  
> iOS 26 auto-disable safeguard: v8.57.0+

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
| `experimental.enableSessionReplayInUnreliableEnvironment` | `Bool` | `false` | Force-enable on iOS 26+ (⚠️ PII risk) |

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

- ✅ All text content (`maskAllText = true`)
- ✅ All images (`maskAllImages = true`)
- ✅ User input fields (always masked, regardless of settings)
- ✅ Video players
- ✅ WebViews
- ❌ Bundled image assets (considered low PII risk — shown in replay)

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

## ⚠️ iOS 26 / Xcode 26 / Liquid Glass Caveat

Apple's **Liquid Glass** rendering engine in iOS 26 breaks the SDK's view-snapshotting approach, causing unreliable masking and potential PII leaks.

**Starting with v8.57.0**, Session Replay is **automatically and silently disabled** when both:
- App is running on **iOS 26.0 or later**
- App was **compiled with Xcode 26.0 or later**

Replay continues to work if:
- The device runs iOS < 26
- The app was built with Xcode < 26
- `UIDesignRequiresCompatibility = YES` is set in `Info.plist`

**SDKs older than v8.57.0** do **not** include this safeguard and may crash or leak PII on iOS 26. Upgrade immediately.

**Force-enable on iOS 26+ (experimental — will be removed once masking is fixed):**

```swift
SentrySDK.start { options in
    // ⚠️ WARNING: May leak PII. Only use if you understand the risk.
    options.experimental.enableSessionReplayInUnreliableEnvironment = true
}
```

Track the fix at [getsentry/sentry-cocoa#6390](https://github.com/getsentry/sentry-cocoa/issues/6390).

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

- Never enable `enableSessionReplayInUnreliableEnvironment` in production without understanding the PII risk
- Set `maskAllText = true` and `maskAllImages = true` (both default) — only unmasked explicitly what's safe to show
- Use `.sentryReplayUnmask()` sparingly on known-safe content rather than globally disabling masking
- Start with `onErrorSampleRate = 1.0` and `sessionSampleRate = 0` to capture replays only on errors (lowest overhead)
- Test masking on real devices — use `SentrySDK.replay.showMaskPreview()` in DEBUG builds to verify

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No replays appearing | Verify `sessionSampleRate > 0` or `onErrorSampleRate > 0`; both default to `0` |
| Replay disabled on iOS 26 | Expected — SDK 8.57.0+ auto-disables for safety; use the experimental override at your own risk |
| PII visible in replay | Verify `maskAllText = true` and `maskAllImages = true`; check `.sentryReplayUnmask()` isn't applied too broadly |
| Scrolling jank during replay | Enable `enableFastViewRendering = true`; switch to `quality = .low`; consider disabling on low-end devices |
| Replay stops after 60 minutes | Expected — `maximumDuration = 3600` seconds is the default cap |
| Error buffer not uploading | Verify `onErrorSampleRate > 0`; buffer is only uploaded when `SentrySDK.capture(error:)` is called |
| App crash during replay capture | Use `excludeViewTypeFromSubtreeTraversal` for the problematic view type |
| Texture/AsyncDisplayKit views not masked | Access `.view` on the node: `SentrySDK.replay.maskView(view: myNode.view)` |
