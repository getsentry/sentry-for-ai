# Session Replay — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android:8.33.0`  
> **Minimum Android API: 26 (Oreo)** — silently disabled on API 21-25  
> **Status:** Production-ready  
> **Docs:** https://docs.sentry.io/platforms/android/session-replay/

---

## ⚠️ API Level Requirement

Session Replay requires **Android API 26 (Oreo)** or higher. On devices running API 21–25, replay is silently skipped with an `INFO` log — no crash, no error, no recording. Apps with `minSdk = 21` (covering ~4–5% of devices) have zero replay coverage on those devices.

```kotlin
// Guard in ReplayIntegration.kt (line 128):
// if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { return }
```

---

## How Android Replay Works

Android Session Replay is **screenshot-based**, not DOM-based:

| Dimension | Web Replay | Android Replay |
|-----------|-----------|----------------|
| Recording method | DOM serialization | Native view hierarchy screenshots |
| Frame rate | Variable / mutation-driven | ~1 frame per second |
| Privacy mechanism | CSS-based DOM masking | **Native pixel masking** over screenshots |
| Touch recording | Full pointer events | Tap breadcrumbs only |
| Text in replay | Selectable, searchable | Pixel-only — text is in screenshots |

---

## Installation

`sentry-android` bundles session replay — no separate dependency needed:

```groovy
dependencies {
    implementation("io.sentry:sentry-android:8.33.0")
}
```

For a lighter build using explicit modules:

```groovy
dependencies {
    implementation("io.sentry:sentry-android-core:8.33.0")
    implementation("io.sentry:sentry-android-replay:8.33.0")
}
```

For Jetpack Compose masking support:

```groovy
dependencies {
    implementation("io.sentry:sentry-compose-android:8.33.0")
}
```

---

## Basic Setup

```kotlin
SentryAndroid.init(this) { options ->
    options.dsn = "https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID"

    // Continuous recording — record 10% of all sessions
    options.sessionReplay.sessionSampleRate = 0.1

    // Error-triggered — buffer 30s and upload when an error occurs
    options.sessionReplay.onErrorSampleRate = 1.0

    // Production-recommended: both modes together
    options.sessionReplay.sessionSampleRate = 0.05  // 5% continuous baseline
    options.sessionReplay.onErrorSampleRate = 0.75  // 75% on error
}
```

**Via AndroidManifest.xml:**

```xml
<meta-data android:name="io.sentry.session-replay.session-sample-rate"  android:value="0.1" />
<meta-data android:name="io.sentry.session-replay.on-error-sample-rate" android:value="1.0" />
```

---

## Configuration Reference

Accessed via `options.sessionReplay` (Kotlin) or `options.getSessionReplay()` (Java).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sessionSampleRate` | `Double?` | `0.0` | Fraction of all sessions recorded continuously (0.0–1.0) |
| `onErrorSampleRate` | `Double?` | `0.0` | Fraction captured when an error occurs; buffers 30s prior |
| `quality` | `SentryReplayQuality` | `MEDIUM` | Video encoding quality preset |
| `screenshotStrategy` | `ScreenshotStrategyType` | `PIXEL_COPY` | Frame capture method (`PIXEL_COPY` or `CANVAS`) |
| `maskAllText` | `Boolean` | `true` | Mask all `TextView` subclasses (includes `Button`, `EditText`, etc.) |
| `maskAllImages` | `Boolean` | `true` | Mask all `ImageView` subclasses |
| `frameRate` | `Int` | `1` | Frames per second |
| `errorReplayDuration` | `Long` (ms) | `30_000` | Pre-error ring buffer size (30 seconds) |
| `sessionSegmentDuration` | `Long` (ms) | `5_000` | How often video segments are uploaded |
| `sessionDuration` | `Long` (ms) | `3_600_000` | Maximum session length (1 hour) |
| `networkDetailAllowUrls` | `List<String>` | `[]` | URL prefixes for network request/response capture |
| `networkDetailDenyUrls` | `List<String>` | `[]` | URL prefixes excluded from network capture |
| `networkCaptureBodies` | `Boolean` | `true` | Capture HTTP request/response bodies |
| `networkRequestHeaders` | `List<String>` | `[Content-Type, Content-Length, Accept]` | Request headers to capture |
| `networkResponseHeaders` | `List<String>` | `[Content-Type, Content-Length, Accept]` | Response headers to capture |
| `debug` | `Boolean` | `false` | Enable verbose replay diagnostic logging |
| `trackConfiguration` | `Boolean` | `true` | Track device orientation and configuration changes |

---

## Code Examples

### Video Quality

```kotlin
SentryAndroid.init(this) { options ->
    // Choose based on bandwidth/battery vs. fidelity trade-off
    options.sessionReplay.quality = SentryReplayQuality.LOW    // 80% res, 50 kbps, JPEG q10
    options.sessionReplay.quality = SentryReplayQuality.MEDIUM  // 100% res, 75 kbps, JPEG q30 (default)
    options.sessionReplay.quality = SentryReplayQuality.HIGH    // 100% res, 100 kbps, JPEG q50
}
```

### Screenshot Strategy

```kotlin
SentryAndroid.init(this) { options ->
    // Default — stable, supports all custom masking
    options.sessionReplay.screenshotStrategy = ScreenshotStrategyType.PIXEL_COPY

    // Experimental — always masks ALL text and images; custom masking rules are ignored
    options.sessionReplay.screenshotStrategy = ScreenshotStrategyType.CANVAS
}
```

> **Canvas strategy warning:** When `CANVAS` is active, `addMaskViewClass()`, XML tags, Kotlin extensions, and Compose modifiers are **completely ignored**. Canvas always masks all text and images. Use only when total masking is acceptable.

### Development Configuration

```kotlin
SentryAndroid.init(this) { options ->
    if (BuildConfig.DEBUG) {
        options.sessionReplay.sessionSampleRate = 1.0  // record all sessions in dev
        options.sessionReplay.debug = true              // verbose diagnostic logging
    } else {
        options.sessionReplay.sessionSampleRate = 0.05
        options.sessionReplay.onErrorSampleRate = 1.0
    }
}
```

---

## Privacy Masking

### Default Masked Types

These view classes are masked by default:

```
android.widget.TextView            (+ ALL subclasses: Button, EditText, CheckBox, RadioButton, Switch...)
android.widget.ImageView
android.webkit.WebView
android.widget.VideoView
androidx.camera.view.PreviewView
androidx.media3.ui.PlayerView
com.google.android.exoplayer2.ui.PlayerView
com.google.android.exoplayer2.ui.StyledPlayerView
```

> **Masking is hierarchical.** Masking `TextView` also masks every subclass automatically.

### Disabling Default Masking

```kotlin
// Only if you are certain your UI contains no PII in text or images
options.sessionReplay.maskAllText   = false
options.sessionReplay.maskAllImages = false
```

### Class-Based Masking

```kotlin
// Mask custom view class and all subclasses
options.sessionReplay.addMaskViewClass("com.example.ui.CreditCardInputView")
options.sessionReplay.addMaskViewClass("com.example.ui.SsnField")

// Unmask a subclass whose parent class is masked
options.sessionReplay.addUnmaskViewClass("com.example.ui.PublicLabelButton")
```

### Instance-Based Masking via XML

```xml
<!-- Using the standard tag attribute -->
<View android:tag="sentry-mask" ... />
<TextView android:tag="sentry-unmask" android:text="@string/public_product_name" />

<!-- Using the dedicated Sentry privacy tag (preferred — doesn't conflict with other tag uses) -->
<View ...>
    <tag android:id="@id/sentry_privacy" android:value="mask" />
</View>

<TextView android:text="@string/safe_label">
    <tag android:id="@id/sentry_privacy" android:value="unmask" />
</TextView>
```

### Instance-Based Masking via Kotlin Extensions

```kotlin
// On any View instance
creditCardInputView.sentryReplayMask()
productTitleLabel.sentryReplayUnmask()
```

### Jetpack Compose Masking

> **Requires:** `io.sentry:sentry-compose-android:8.33.0`  
> **Compose 1.8+ note:** A masking regression for Compose 1.8+ was fixed in SDK 8.32.x — use SDK ≥ 8.33.0 with Compose 1.8.

```kotlin
// Mask an entire composable subtree
@Composable
fun PaymentForm() {
    Column(modifier = Modifier.sentryReplayMask()) {
        CreditCardField()   // masked via parent
        CvvField()          // masked via parent
        ExpiryDateField()   // masked via parent
    }
}

// Unmask safe elements inside an otherwise-masked region
@Composable
fun ProductCard(product: Product) {
    Column(modifier = Modifier.sentryReplayMask()) {
        Text(
            text     = product.name,
            modifier = Modifier.sentryReplayUnmask()  // product name is safe to show
        )
        Text(
            text = userPaymentInfo,
            // inherits parent mask — sensitive data stays masked
        )
    }
}

// Masking via Sentry tag modifier (alternative)
Text(
    text     = "Public info",
    modifier = Modifier.sentryTag("sentry-unmask")
)
```

> **Compose + view flattening:** Compose can optimize away wrapper composables. If masking is unexpectedly dropped, verify the composable is not being flattened by the Compose compiler.

### Masking Priority Order (first match wins)

1. **View-level unmask** — `sentry-unmask` tag / `.sentryReplayUnmask()` / Compose `.sentryReplayUnmask()`
2. **View-level mask** — `sentry-mask` tag / `.sentryReplayMask()` / Compose `.sentryReplayMask()`
3. **Class-level unmask** — `addUnmaskViewClass(className)`
4. **Class-level mask** — `addMaskViewClass(className)` / `maskAllText` / `maskAllImages`

> **ViewGroup inheritance:** A masked parent does NOT automatically mask its children. Each child must be independently masked. An unmasked parent does NOT override class-level masks on children.

---

## Network Capture

Requires `SentryOkHttpInterceptor` or `SentryOkHttpEventListener` from `sentry-android-okhttp` (or `sentry-okhttp`):

```kotlin
SentryAndroid.init(this) { options ->
    options.sessionReplay.networkDetailAllowUrls = listOf(
        "https://api.myapp.com/v2"      // capture details for this prefix
    )
    options.sessionReplay.networkDetailDenyUrls = listOf(
        "https://api.myapp.com/v2/auth",    // exclude auth endpoints (tokens)
        "https://api.myapp.com/v2/payment"  // exclude payment endpoints
    )
    options.sessionReplay.networkCaptureBodies      = true
    options.sessionReplay.networkRequestHeaders  = listOf("X-Request-ID", "Accept-Language")
    options.sessionReplay.networkResponseHeaders = listOf("X-Response-Time", "X-Cache")
}
```

> Retrofit and `HttpURLConnection` apps have no network capture in replay — only OkHttp is supported.

---

## Session Lifecycle

```
App launches / comes to foreground
        │
        ▼
SDK init → ReplayIntegration.start()
        │
        │ [recording at 1 fps, uploading segments every 5s]
        │
        ├── app goes background ─────────► pause() + flush current segment
        │        < 30s background
        ├── app returns to foreground ───► resume() (SAME replay ID)
        │        > 30s background  
        ├── app returns to foreground ───► stop() + start() (NEW replay ID)
        │
        ├── 60 minutes elapsed ──────────► session ends, new one begins
        │
        └── error occurs (onErrorSampleRate mode)
                   │
                   └─► last 30s of buffered frames are uploaded
```

---

## Debug Masking Overlay

During development, enable a colored overlay to visually inspect which regions are masked:

```kotlin
// Get the ReplayIntegration instance
val replay = Sentry.getCurrentScopes().options.integrations
    .filterIsInstance<ReplayIntegration>()
    .firstOrNull()

replay?.enableDebugMaskingOverlay()   // shows colored rectangles over masked regions
replay?.disableDebugMaskingOverlay()
```

---

## Best Practices

1. **Always set both sample rates for production** — `sessionSampleRate` for baseline coverage, `onErrorSampleRate = 1.0` for debugging every error
2. **Start with `MEDIUM` quality** — then adjust down to `LOW` if bandwidth or battery becomes a concern
3. **Use `maskAllText = true` (default)** — erring on the side of more masking is always safer for user privacy
4. **Use XML `sentry_privacy` tag over `android:tag`** — the dedicated tag doesn't conflict with other usages of `android:tag`
5. **Use Compose `Modifier.sentryReplayMask()` at the layout level** — mask entire sections (payment forms, PII screens) rather than individual fields
6. **Never enable Canvas strategy in production without testing** — it ignores all custom masking rules
7. **Set `debug = true` during development** — helps verify masking is applied correctly before releasing
8. **Test on an API 26 device** — replay silently does nothing on API 21-25; don't test exclusively on newer devices and assume all users have coverage
9. **Exclude auth and payment URLs from network capture** — `networkDetailDenyUrls` prevents tokens and card data from appearing in replay

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| API 26+ hard requirement | Silent no-op on API 21-25; no fallback or warning unless `debug = true` |
| Canvas strategy ignores all masking | `addMaskViewClass`, XML tags, Kotlin extensions, and Compose modifiers have zero effect with `CANVAS` |
| PixelCopy masking misalignment | Mask overlay can misalign on views with `setTranslationX/Y`, `setScaleX/Y`, or inside `RecyclerView` with `ItemAnimator` |
| 60-minute session cutoff | Sessions longer than 1 hour are truncated; a new session starts but replay continuity is broken |
| Compose 1.8 masking regression | Fixed in 8.32.x — requires SDK ≥ 8.33.0 for reliable masking with Compose 1.8+ |
| OkHttp required for network capture | `networkDetailAllowUrls` / `networkCaptureBodies` only work with Sentry OkHttp integration installed |
| Trailing frame loss on crash | In-memory frames from the current segment are lost if the app is killed mid-segment; completed segments are persisted to disk |
| No Retrofit/HttpURLConnection network capture | Only OkHttp-based networking is captured in replay |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No replays appearing in Sentry | Check `sessionSampleRate` or `onErrorSampleRate` > 0; verify device is API 26+ (enable `debug = true` to see skip log on API 21-25) |
| Masking not applied to custom view | Add class to `addMaskViewClass("com.example.MyView")` or apply `sentry-mask` tag |
| Masking applied but view content still visible | Check masking priority order; a view-level unmask overrides class-level masks |
| Compose masking not working | Add `sentry-compose-android` dependency; ensure SDK ≥ 8.33.0 for Compose 1.8+ support |
| Canvas strategy masking all content | Expected — Canvas strategy masks all text and images regardless of masking configuration |
| Network requests not captured in replay | Add `SentryOkHttpInterceptor` and add the API base URL to `networkDetailAllowUrls` |
| High battery drain | Reduce quality to `LOW`; replay runs at 1 fps but PixelCopy is GPU-accelerated |
| Replay ID not linked to log events | Replay ID is auto-attached to logs and metrics when replay is active; verify both features are enabled |
