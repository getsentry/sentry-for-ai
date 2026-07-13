# Session Replay — Sentry Flutter SDK

> **Minimum SDK:** `sentry_flutter` ≥ **9.0.0**  
> **Platforms:** **iOS and Android only** — Web, macOS, Linux, Windows not supported  
> **Frame rate:** ~**1 frame per second** (screenshot-based capture, not DOM recording)

Flutter Session Replay captures a visual record of user sessions as a compressed sequence of screenshots, combined with breadcrumbs, traces, and error context. It works differently from web replay — understanding this prevents surprises.

---

## Table of Contents

1. [How Flutter Replay Differs from Web Replay](#1-how-flutter-replay-differs-from-web-replay)
2. [Basic Setup](#2-basic-setup)
3. [Sample Rates](#3-sample-rates)
4. [Privacy and Masking](#4-privacy-and-masking)
5. [What the Replay UI Shows](#5-what-the-replay-ui-shows)
6. [Session Lifecycle](#6-session-lifecycle)
7. [Performance Overhead](#7-performance-overhead)
8. [Configuration Reference](#8-configuration-reference)
9. [Known Limitations](#9-known-limitations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. How Flutter Replay Differs from Web Replay

| Dimension | Web Session Replay | Flutter Session Replay |
|---|---|---|
| **Recording method** | DOM serialization (HTML/CSS snapshots) | **Screenshot-based** (widget tree snapshots) |
| **Frame rate** | Variable (mutation-driven) | **~1 frame per second** |
| **Text in replay** | ✅ Selectable, searchable | ❌ Pixel-only — text is in screenshots |
| **CSS inspection** | ✅ Available | ❌ Not available |
| **Privacy mechanism** | CSS-based DOM masking | **Widget-level pixel masking** |
| **Rage clicks** | ✅ Detected | ❌ Not supported |
| **Touch recording** | Full pointer events | Tap breadcrumbs only |
| **Scroll positions** | ✅ Precise | ⚠️ Approximate (from screenshots) |

---

## 2. Basic Setup

Flutter Session Replay is built into `sentry_flutter` — no separate package is needed. Wrap your root widget with `SentryWidget` (required for widget-tree privacy masking):

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_DSN';

      // Session replay sampling
      options.replay.sessionSampleRate = 0.1;   // 10% of all sessions recorded
      options.replay.onErrorSampleRate = 1.0;   // 100% when an error occurs
    },
    appRunner: () => runApp(
      SentryWidget(   // required — wraps the app for screenshot capture
        child: MyApp(),
      ),
    ),
  );
}
```

> **During development:** Use `options.replay.sessionSampleRate = 1.0` so every session is recorded. Lower it before shipping to production.

---

## 3. Sample Rates

### `replay.sessionSampleRate`

Records the **entire user session** from SDK initialization / app foreground entry.

- Range: `0.0` – `1.0`
- Captures everything from session start

### `replay.onErrorSampleRate`

Only activates when an **error occurs**. The SDK maintains a rolling pre-error buffer and captures that buffer plus everything after the error.

- Range: `0.0` – `1.0`
- Gives you context for what led up to the error

### Recommended production values

| Strategy | `sessionSampleRate` | `onErrorSampleRate` |
|---|---|---|
| Errors-only (minimal overhead) | `0` | `1.0` |
| Balanced | `0.05` | `1.0` |
| High visibility | `0.1` | `1.0` |

---

## 4. Privacy and Masking

> ⚠️ **Production warning:** Always verify your masking config before enabling in production. The SDK masks aggressively by default, but any customizations require thorough testing with your actual app UI. If you discover unmasked PII, disable Session Replay until resolved.

### Default behavior

The SDK **aggressively masks all text, images, and user input by default**:

| Widget type | Default behavior |
|-------------|-----------------|
| `Text`, `RichText`, `EditableText` | ✅ Masked by default |
| `Image` (including asset images) | ✅ Masked by default |
| `TextFormField`, `TextField` | ✅ Masked by default |

Masked areas are replaced with a filled block using a neutral color.

### Privacy configuration options

Configure masking in `SentryFlutter.init`:

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_DSN';
    options.replay.sessionSampleRate = 0.1;
    options.replay.onErrorSampleRate = 1.0;

    // Masking options — all true by default
    options.privacy.maskAllText = true;      // mask Text, RichText, EditableText
    options.privacy.maskAllImages = true;    // mask Image widgets
    options.privacy.maskAssetImages = true;  // mask asset bundle images
  },
  appRunner: () => runApp(SentryWidget(child: MyApp())),
);
```

### Mask specific widget types

```dart
// Mask all IconButton widgets (masked by the widget type)
options.privacy.mask<IconButton>();

// Unmask Image widgets (show images in replay)
options.privacy.unmask<Image>();
```

### Custom masking logic per widget instance

```dart
options.privacy.maskCallback<Text>(
  (Element element, Text widget) {
    // Mask only text containing 'secret'
    if (widget.data?.contains('secret') ?? false) {
      return SentryMaskingDecision.mask;
    }
    return SentryMaskingDecision.continueProcessing;
  },
);
```

### Disable all masking

Only do this if your app contains absolutely no sensitive data:

```dart
options.privacy.maskAllText = false;
options.privacy.maskAllImages = false;
options.privacy.maskAssetImages = false;
```

### Third-party widget masking

The SDK cannot automatically detect or mask third-party widgets. You must register them explicitly:

```dart
// Example: mask a map widget from a third-party package
options.privacy.mask<FlutterMap>();

// Example: mask a video player widget
options.privacy.mask<VideoPlayer>();
```

---

## 5. What the Replay UI Shows

| Panel | Content |
|---|---|
| **Video** | Compressed screenshot sequence at ~1 fps |
| **Breadcrumbs** | User taps, navigation events, app lifecycle transitions |
| **Timeline** | Scrubbable view with event markers |
| **Network** | HTTP requests made during the session |
| **Errors** | All errors in the session linked to Sentry issues |
| **Tags** | OS version, device specs, release, user info, custom tags |
| **Trace** | All distributed traces during the replay session |

### Touch / gesture recording

Touch interactions are recorded as **breadcrumb events** (discrete tap events), not raw gesture streams:

- ✅ Captured: Tap position, tapped widget, timestamp
- ❌ Not captured: Swipe paths, gesture velocity, multi-touch sequences

---

## 6. Session Lifecycle

| Event | Effect |
|---|---|
| SDK initializes / app enters foreground | New session starts |
| App goes to background | Session pauses |
| App returns to foreground within **30 seconds** | Same session continues |
| App returns to foreground after **30+ seconds** | New session starts |
| Session reaches **60 minutes** | Session terminates |
| App crashes / closes in background | Session terminates abnormally |

The `onErrorSampleRate` mode keeps a pre-error buffer in memory. When an error occurs, this buffer plus the subsequent recording is captured and sent.

---

## 7. Performance Overhead

Session Replay adds CPU and memory overhead from periodic screenshot capture and compression.

| Metric | With Replay | Notes |
|--------|------------|-------|
| CPU | +5–10% | During active recording |
| Memory | +15–25 MB | Screenshot buffer |
| FPS impact | -1 to -2 fps | Minimal on modern devices |
| Network bandwidth | ~7–10 KB/s | Compressed screenshot segments |

### Reducing performance impact

```dart
options.replay.sessionSampleRate = 0.05;  // lower session recording rate
options.replay.onErrorSampleRate = 1.0;   // keep error capture at 100%
```

Consider using `onErrorSampleRate` only (set `sessionSampleRate` to `0`) for the lowest overhead while retaining the most valuable replay data.

---

## 8. Configuration Reference

### `options.replay` settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `replay.sessionSampleRate` | `double` (0–1) | `0` | Fraction of all sessions to record from start |
| `replay.onErrorSampleRate` | `double` (0–1) | `0` | Fraction of error sessions to record (with pre-error buffer) |

### `options.privacy` settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `privacy.maskAllText` | `bool` | `true` | Mask Text, RichText, EditableText widgets |
| `privacy.maskAllImages` | `bool` | `true` | Mask Image widgets |
| `privacy.maskAssetImages` | `bool` | `true` | Mask asset bundle images |
| `privacy.mask<T>()` | method | — | Mask all instances of widget type T |
| `privacy.unmask<T>()` | method | — | Unmask all instances of widget type T |
| `privacy.maskCallback<T>()` | method | — | Custom masking decision per widget instance |

### Version requirements

| Feature | Min SDK |
|---------|---------|
| Session Replay (iOS + Android) | `9.0.0` |
| `options.replay.*` configuration | `9.0.0` |
| `options.privacy.*` masking | `9.0.0` |

---

## 9. Known Limitations

| Limitation | Details |
|------------|---------|
| iOS and Android only | Web, macOS, Linux, and Windows are **not supported**. Replay configuration is silently ignored on unsupported platforms. |
| ~1 fps frame rate | Not suitable for high-frequency UI debugging. Best for understanding flow and identifying the screen state during errors. |
| Text is not selectable | Screenshots capture pixels only — you cannot copy text from a replay. |
| No swipe/gesture paths | Only discrete tap events are recorded as breadcrumbs. Gesture trajectories are not captured. |
| Third-party widget masking | Must be registered manually via `options.privacy.mask<WidgetType>()` — the SDK cannot auto-detect foreign widget types. |
| Pre-error buffer is in-memory | Low-memory devices may have a shorter effective pre-error buffer. |
| No DOM inspection | Unlike web replay, you cannot inspect the widget tree state at a given frame — only the screenshot is available. |

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| Replay not recording at all | Verify `options.replay.sessionSampleRate` or `options.replay.onErrorSampleRate` is `> 0`. Confirm `SentryWidget` wraps your root widget. |
| Platform not supported | Expected — Flutter Session Replay is iOS and Android only. Check you're building for a supported platform. |
| All content masked after disabling masking | Verify you've set `options.privacy.maskAllText = false` and `options.privacy.maskAllImages = false` before `appRunner` runs. |
| Third-party widget content visible despite masking | Register the widget type: `options.privacy.mask<ThirdPartyWidget>()` |
| High memory usage with replay enabled | Lower `sessionSampleRate`; consider using `onErrorSampleRate` only (set `sessionSampleRate` to `0`) |
| Replay works in debug but not in production | Verify sample rates are non-zero in your production `SentryFlutter.init()` call; check DSN is correct for the environment |
| Pre-error buffer empty | Low memory device may have dropped the buffer. No workaround currently. |
| Replay sessions not linked to errors | Ensure both `onErrorSampleRate > 0` and the SDK is initialized before the error occurs |
| Tap events missing in replay | Confirm `SentryWidget` is wrapping the widget tree — it intercepts gesture events to record taps |
