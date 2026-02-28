# Session Replay — Sentry React Native SDK

> **Minimum SDK:** `@sentry/react-native` ≥ **6.5.0**  
> **Status:** Generally Available on all Sentry plans  
> **Key difference from web:** Screenshot-based capture, NOT DOM recording

---

## How Mobile Replay Differs from Web Replay

Mobile Session Replay is **fundamentally different** from web replay. Understanding this distinction prevents surprises:

| Dimension | Web Session Replay | Mobile Session Replay |
|---|---|---|
| **Recording method** | DOM serialization (HTML/CSS snapshots) | **Screenshot-based** (native view hierarchy snapshots) |
| **Frame rate** | Variable (mutation-driven, often 60fps) | **~1 frame per second** (screenshot on change) |
| **Fidelity** | Pixel-perfect DOM reconstruction | Compressed video segments from screenshots |
| **Text in replay** | ✅ Selectable, searchable text | ❌ Pixel-only — text is in screenshots |
| **CSS inspection** | ✅ Available | ❌ Not available |
| **Privacy mechanism** | CSS-based DOM masking | **Native-layer pixel masking** |
| **Offline support** | ✅ Both session and error modes | ❌ **Error mode only** (`sessionSampleRate` unsupported offline) |
| **Touch recording** | Full pointer/mouse events | Tap breadcrumbs only (no gesture paths) |
| **Rage clicks** | ✅ Detected | ❌ Not supported |
| **Network bodies** | ✅ Optional capture | ❌ Not captured |
| **Scroll positions** | ✅ Precise | ⚠️ Approximate (from screenshots) |

Mobile replay captures **native view hierarchy snapshots + a screenshot** within the same frame, compresses them into video segments, and streams them to Sentry alongside trace IDs, breadcrumbs, and debug info.

---

## Minimum SDK Versions

| Platform / Feature | Minimum Version |
|---|---|
| React Native (basic replay) | **6.5.0** |
| `maskAllVectors` option | 5.36.0 / 6.3.0+ |
| `Sentry.Mask` / `Sentry.Unmask` components | **6.4.0-beta.1** |
| Manually-initialized native SDK masking | **6.15.1** (Cocoa 8.52.1+) |
| `screenshotStrategy` option (Android) | **7.5.0** |
| `includedViewClasses` / `excludedViewClasses` (iOS) | **7.9.0** |
| iOS native SDK | Cocoa 8.43.0+ |
| Android native SDK | 7.20.0+ |

---

## Installation

No separate package needed — `mobileReplayIntegration()` is bundled in `@sentry/react-native`:

```bash
npm install @sentry/react-native
# or
yarn add @sentry/react-native
```

> **Android bundle size note:** The replay module adds ~40 KB compressed / ~80 KB uncompressed. To exclude it entirely if you don't use replay:
> ```gradle
> // android/build.gradle (root level)
> subprojects {
>   configurations.all {
>     exclude group: 'io.sentry', module: 'sentry-android-replay'
>   }
> }
> ```

---

## Basic Setup

```javascript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  // Session sampling — set both for comprehensive coverage
  replaysSessionSampleRate: 0.1,   // 10% of ALL sessions recorded immediately
  replaysOnErrorSampleRate: 1.0,   // 100% of sessions where an error occurs

  integrations: [
    Sentry.mobileReplayIntegration(),
  ],
});
```

> **During development:** Use `replaysSessionSampleRate: 1.0` so every session is recorded. Lower it in production while keeping `replaysOnErrorSampleRate: 1.0`.

---

## Sample Rates

### `replaysSessionSampleRate`
- Records the **entire user session** starting from SDK initialization / app foreground entry
- Range: `0.0` – `1.0`
- **Not supported in offline mode**

### `replaysOnErrorSampleRate`
- Only activates when an **error occurs**
- SDK maintains a rolling **1-minute pre-error buffer** in memory
- Captures that buffer + everything after the error, giving you full context
- Range: `0.0` – `1.0`
- ✅ Supported in offline mode — segments stored to disk, sent on reconnect

### Recommended Production Values

| Strategy | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|---|---|---|
| Errors-only (minimal overhead) | `0` | `1.0` |
| Balanced | `0.05` | `1.0` |
| High visibility | `0.1` | `1.0` |

### Per-Error Filtering with `beforeErrorSampling`

```javascript
Sentry.mobileReplayIntegration({
  beforeErrorSampling: (event, hint) => {
    // Only capture replays for UNHANDLED errors
    const isHandled = event.exception?.values?.some(
      (exception) => exception.mechanism?.handled === true,
    );
    return !isHandled; // returning false skips replay capture for this error
  },
})
```

---

## All Configuration Options

### `mobileReplayIntegration()` Options

| Option | Type | Default | Min SDK | Description |
|---|---|---|---|---|
| `maskAllText` | `boolean` | `true` | — | Masks all text in screenshots |
| `maskAllImages` | `boolean` | `true` | — | Masks all images |
| `maskAllVectors` | `boolean` | `true` | 5.36.0 / 6.3.0+ | Masks vector graphics |
| `screenshotStrategy` | `'pixelCopy'` \| `'canvas'` | `'pixelCopy'` | 7.5.0 (Android) | Screenshot capture method |
| `includedViewClasses` | `string[]` | — | 7.9.0 (iOS) | Allowlist of native class names to traverse |
| `excludedViewClasses` | `string[]` | — | 7.9.0 (iOS) | Blocklist; takes precedence over `includedViewClasses` |
| `beforeErrorSampling` | `(event, hint) => boolean` | — | — | Return `false` to skip replay for a specific error |

### Top-Level `Sentry.init()` Options

| Option | Type | Default | Description |
|---|---|---|---|
| `replaysSessionSampleRate` | `number` (0–1) | — | Fraction of all sessions to record |
| `replaysOnErrorSampleRate` | `number` (0–1) | — | Fraction of error sessions to record |
| `replaysSessionQuality` | `'low'` \| `'medium'` \| `'high'` | `'medium'` | Screenshot quality — affects CPU, memory, bandwidth |

---

## Privacy & Masking

> ⚠️ **Production warning:** Always verify your masking config before enabling in production. Default settings aggressively mask everything, but any modifications require thorough testing with your actual app UI. If you discover unmasked PII, open a GitHub issue and disable Session Replay until resolved.

### Default Behavior

The SDK masks **all text, images, vectors, webviews, and user input** by default. Masked areas are replaced with a filled block using the most predominant color of the masked element.

### Disable All Masking

Use only if your app contains absolutely no sensitive data:

```javascript
Sentry.mobileReplayIntegration({
  maskAllText: false,
  maskAllImages: false,
  maskAllVectors: false,
})
```

> Requires SDK **5.36.0** / **6.3.0+**. If using manually initialized native SDKs, requires **6.15.1+** (Cocoa **8.52.1+**).

### `Sentry.Mask` and `Sentry.Unmask` Components

Requires SDK **6.4.0-beta.1+**. These are React Native components for fine-grained, per-screen masking control:

```jsx
import * as Sentry from "@sentry/react-native";

const ProfileScreen = () => (
  <View>
    {/* Unmask non-sensitive sections to see them clearly in replay */}
    <Sentry.Unmask>
      <Text>Welcome back!</Text>             {/* ✅ visible in replay */}
      <Text>Public username: johndoe</Text>  {/* ✅ visible in replay */}
    </Sentry.Unmask>

    {/* Mask sensitive sections regardless of global config */}
    <Sentry.Mask>
      <Text>Credit card: 4111-****-****-1111</Text>  {/* 🔒 masked */}
      <TextInput value={ssn} />                       {/* 🔒 masked */}
    </Sentry.Mask>
  </View>
);
```

### Masking Rules & Priority

**`Sentry.Unmask` only unmasks direct children:**

```jsx
<Sentry.Unmask>
  <Text>
    Unmasked line                {/* ✅ direct child — visible */}
    <Text>Nested text</Text>     {/* 🔒 indirect child — still masked */}
  </Text>
  <Text>Also unmasked</Text>    {/* ✅ direct child — visible */}
</Sentry.Unmask>
```

**`Sentry.Mask` masks ALL descendants:**

```jsx
<Sentry.Mask>
  <Text>
    Masked                      {/* 🔒 */}
    <Text>Also masked</Text>    {/* 🔒 */}
  </Text>
</Sentry.Mask>
```

**`Mask` always wins — `Unmask` cannot override it:**

```jsx
{/* Unmask inside Mask — Mask still wins */}
<Sentry.Mask>
  <Sentry.Unmask>
    <Text>Still masked</Text>   {/* 🔒 Unmask has no effect inside Mask */}
  </Sentry.Unmask>
</Sentry.Mask>

{/* Mask inside Unmask — Mask still takes effect */}
<Sentry.Unmask>
  <Sentry.Mask>
    <Text>Masked</Text>         {/* 🔒 */}
  </Sentry.Mask>
</Sentry.Unmask>
```

### Implementation Notes

- `Mask` and `Unmask` are **native components** on both iOS and Android
- Compatible with both **New Architecture** and **Legacy Architecture**
- They behave as standard React Native `View` components (passthrough layout)

---

## React Native View Flattening — Critical Privacy Gotcha

React Native's [View Flattening](https://reactnative.dev/architecture/view-flattening) optimization removes "Layout Only" views from the native hierarchy — and this **includes your `Mask`/`Unmask` wrappers**.

> ⚠️ **View Flattening may cause `Mask`/`Unmask` to not work as expected, accidentally exposing sensitive data.** Always test masking thoroughly on physical devices before shipping.

**Diagnosis:** If `Sentry.Unmask` isn't unmasking content more than one level deep, check whether the wrapper appears in the actual native view hierarchy (use the React Native Inspector or Xcode View Hierarchy Debugger). If the wrapper is absent, it's been flattened away.

**Mitigation:** Add `collapsable={false}` to prevent flattening of critical mask wrappers:

```jsx
<Sentry.Mask collapsable={false}>
  <Text>Sensitive content</Text>
</Sentry.Mask>
```

---

## Android: Screenshot Strategies

Requires SDK **7.5.0+**. Configured via `screenshotStrategy`:

| | `'pixelCopy'` (default) | `'canvas'` (experimental) |
|---|---|---|
| **API** | Android PixelCopy API | Custom Canvas redraw |
| **Performance** | Lower overhead | Higher overhead |
| **Masking accuracy** | Can have pixel misalignments | Reliable, always correct |
| **Mask options respected** | ✅ Yes | ❌ **No — ignores all options; always masks everything** |
| **When to use** | Default; works for most apps | When masking misalignment is a concern |

```javascript
Sentry.mobileReplayIntegration({
  screenshotStrategy: "canvas",   // or "pixelCopy" (default)
})
```

> **Canvas caveat:** When `screenshotStrategy: "canvas"` is set, `maskAllText`, `maskAllImages`, `maskAllVectors`, and `Sentry.Unmask` are all **ignored**. Everything is always fully masked — no selective unmasking is possible.

---

## iOS: View Hierarchy Traversal

On iOS, the SDK traverses the native view hierarchy to capture screenshots. Some custom or third-party view classes can cause crashes or artifacts during traversal. Use these options (SDK **7.9.0+**) to control which classes are included:

```javascript
Sentry.mobileReplayIntegration({
  // Only traverse these specific native classes
  includedViewClasses: ["UILabel", "UIView", "MyCustomView"],

  // Never traverse these (even if listed in includedViewClasses)
  excludedViewClasses: ["WKWebView", "UIWebView", "ThirdPartyVideoView"],
})
```

**Priority:** `excludedViewClasses` always wins over `includedViewClasses`. Use `excludedViewClasses` to exclude problematic classes one at a time rather than rebuilding a full allowlist.

---

## iOS 26.0 / Liquid Glass — Critical Warning

> 🚨 **Potential PII leak on iOS 26.0+**
>
> Apple's **Liquid Glass** rendering in iOS 26.0 introduces masking vulnerabilities — masked areas may be rendered through the glass effect, potentially revealing content that should be hidden. **Thoroughly test Session Replay on iOS 26+ before enabling in production.** Track the fix at [sentry-cocoa #6390](https://github.com/getsentry/sentry-cocoa/issues/6390).

---

## Touch / Gesture Recording

Touch interactions are recorded as **breadcrumb events** (discrete tap events), not raw gesture streams. The replay UI overlays touch indicators at tap locations.

- **What's captured:** Tap position, tapped view, timestamp
- **What's NOT captured:** Swipe paths, gesture velocity, multi-touch sequences, pressure
- **Display:** Touch indicators overlaid on the replay video at breadcrumb timestamps

---

## Network Request Capture

Network requests are **automatically captured** and displayed in the replay Network panel — no extra configuration needed.

| What's captured | What's NOT captured |
|---|---|
| URL, HTTP method | Request bodies |
| Status code | Response bodies |
| Request duration | Response headers |
| Failed requests (highlighted red) | |

Network capture works via existing Sentry network instrumentation, not replay-specific config. Unlike web replay, there is no way to opt in to body capture for mobile.

---

## What the Replay UI Shows

| Panel | Content |
|---|---|
| **Video** | Compressed screenshot sequence at ~1 fps |
| **Breadcrumbs** | User taps, navigation events, foreground/background transitions, battery/orientation/connectivity changes |
| **Timeline** | Scrubbable view with event markers and zoom |
| **Network** | All network requests; failed ones highlighted in red |
| **Console** | Custom logs, Logcat output (Android), Timber logs |
| **Errors** | All errors in the session linked to Sentry issues |
| **Tags** | OS version, device specs, release, user info, custom tags |
| **Trace** | All distributed traces occurring during the replay |

---

## Performance Overhead

Performance benchmarks on real production apps (Pocket Casts, release builds, 10 iterations).

### iOS (iPhone 14 Pro)

| Metric | SDK Only | SDK + Replay | Delta |
|---|---|---|---|
| FPS | 55 | 53 | **-2 fps** |
| Memory | 102 MB | 121 MB | **+19 MB** |
| CPU | 4% | 13% | **+9%** |
| Cold Startup | 1264.80 ms | 1265 ms | Negligible |
| Network Bandwidth | — | ~10 KB/s | — |

### Android (Pixel 2XL)

| Metric | SDK Only | SDK + Replay | Delta |
|---|---|---|---|
| FPS | 55 | 54 | **-1 fps** |
| Memory | 255 MB | 265 MB | **+10 MB** |
| CPU | 36% | 42% | **+6%** |
| Cold Startup | 1533.35 ms | 1539.55 ms | Negligible |
| Network Bandwidth | — | ~7 KB/s | — |

> ⚠️ **Older devices (iPhone 8 and earlier):** Replay can cause **visible scrolling stutter and dropped frames** during UI animations. Test on your minimum supported device before enabling.

### Reducing Performance Impact

```javascript
Sentry.init({
  replaysSessionSampleRate: 0.05,   // Lower session recording rate
  replaysSessionQuality: "low",     // ← Key setting for performance
  replaysOnErrorSampleRate: 1.0,    // Keep error capture at 100%
  integrations: [Sentry.mobileReplayIntegration()],
});
```

`replaysSessionQuality` options:
- `'low'` — Lower CPU, memory, and bandwidth; reduced screenshot fidelity
- `'medium'` (default) — Balanced
- `'high'` — Best fidelity; highest resource usage

---

## Session Lifecycle

| Event | Effect |
|---|---|
| SDK initializes / app enters foreground | New session starts |
| App goes to background | Session pauses |
| App returns to foreground within **30 seconds** | Same session continues (same `replay_id`) |
| App returns to foreground after **30+ seconds** | New session starts |
| Session reaches **60 minutes** | Session terminates |
| App crashes / closes in background | Session terminates abnormally |

---

## Offline Support

| Mode | Offline Support |
|---|---|
| `replaysOnErrorSampleRate` | ✅ Segments stored to disk, sent on reconnect |
| `replaysSessionSampleRate` | ❌ Not supported — session replays require network |

---

## Error Coverage

Session Replay links replays to all error types:
- ✅ Handled exceptions
- ✅ Unhandled exceptions
- ✅ ANRs (App Not Responding) / App Hangs
- ✅ Native (NDK) crashes

---

## Expo Compatibility

`mobileReplayIntegration()` uses native modules for screenshot capture and the `Mask`/`Unmask` components.

| Environment | Replay Support |
|---|---|
| **Expo Go** | ❌ Native modules not supported — replay will not work |
| **Expo with `expo-dev-client`** | ✅ Supported — development builds include native modules |
| **EAS Build** | ✅ Fully supported |
| **Expo bare workflow** | ✅ Fully supported |

For managed Expo workflow, use `expo-dev-client` or EAS Build — not Expo Go.

---

## Metro Config — Component Names in Replay UI

Enable human-readable React component names in the replay UI (shows `<ProfileCard>` instead of `<View>`):

```js
// metro.config.js
const { getDefaultConfig } = require("@react-native/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");

module.exports = withSentryConfig(getDefaultConfig(__dirname), {
  annotateReactComponents: true,
});
```

This works with Hermes builds. The annotation happens at the native layer, not the JS thread.

---

## Known Limitations vs. Web Replay

| Capability | Web Replay | Mobile Replay |
|---|---|---|
| Recording fidelity | DOM-exact reproduction | Screenshot video (~1 fps) |
| Text in replay | ✅ Selectable, searchable | ❌ Pixel-only |
| CSS inspection | ✅ | ❌ |
| Rage click detection | ✅ | ❌ (taps only) |
| Scroll positions | ✅ Precise | ⚠️ Approximate |
| Offline session recording | ✅ | ❌ (error mode only) |
| Canvas / WebGL | ✅ | ⚠️ Captured as screenshot |
| Network request bodies | ✅ Optional | ❌ Not available |
| Unmask → nested children | ✅ All descendants | ⚠️ Direct children only |
| View Flattening interference | N/A | ⚠️ Can remove Mask/Unmask wrappers |
| iOS 26.0 Liquid Glass | N/A | ⚠️ Potential PII leak (unfixed) |
| Android canvas strategy | N/A | ⚠️ Forces all-masked (experimental) |
| Lazy loading | ✅ `Sentry.addIntegration()` | ❌ Must be in `Sentry.init()` |
| DOM mutation tracking | ✅ | ❌ Screenshot-based only |

---

## Production-Ready Setup Example

```javascript
// App entry point (App.tsx / _layout.tsx)
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  // Replay sampling
  replaysSessionSampleRate: 0.05,     // 5% of all sessions
  replaysOnErrorSampleRate: 1.0,      // 100% of error sessions
  replaysSessionQuality: "medium",    // 'low' | 'medium' | 'high'

  integrations: [
    Sentry.mobileReplayIntegration({
      // Privacy — defaults shown explicitly for clarity
      maskAllText: true,
      maskAllImages: true,
      maskAllVectors: true,

      // Android screenshot strategy (SDK 7.5.0+)
      screenshotStrategy: "pixelCopy",  // or 'canvas' (experimental, always masks)

      // iOS view traversal safety (SDK 7.9.0+)
      excludedViewClasses: ["WKWebView", "UIWebView"],

      // Selective replay — only for unhandled errors
      beforeErrorSampling: (event, hint) => {
        const isHandled = event.exception?.values?.some(
          (exc) => exc.mechanism?.handled === true,
        );
        return !isHandled;
      },
    }),
  ],
});
```

```jsx
// Fine-grained masking in screens
import * as Sentry from "@sentry/react-native";

const PaymentScreen = () => (
  <View>
    {/* Unmask non-sensitive summary info */}
    <Sentry.Unmask>
      <Text>Order Summary</Text>
      <Text>Total: $42.00</Text>
    </Sentry.Unmask>

    {/* Always mask payment details */}
    <Sentry.Mask>
      <TextInput placeholder="Card number" />
      <TextInput placeholder="CVV" />
      <Text>Billing address...</Text>
    </Sentry.Mask>
  </View>
);
```

```js
// metro.config.js — human-readable component names in replay UI
const { getDefaultConfig } = require("@react-native/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");

module.exports = withSentryConfig(getDefaultConfig(__dirname), {
  annotateReactComponents: true,
});
```

---

## Quick Reference

```
Minimum RN SDK:        6.5.0
Recording method:      Screenshots (~1 fps), NOT DOM recording
Pre-error buffer:      60 seconds
Session timeout:       30s background / 60 min max
Offline support:       Error mode only
Default masking:       ALL text, images, vectors, webviews — fully masked
Unmask scope:          Direct children only (not descendants)
Mask priority:         Always wins — Unmask cannot override
View flattening:       Can silently remove Mask/Unmask — test thoroughly!
Android strategies:    pixelCopy (default) | canvas (experimental, always-masks)
iOS view safety:       excludedViewClasses / includedViewClasses (SDK 7.9.0+)
iOS 26 warning:        Liquid Glass masking bug — test before production!
Component names:       metro.config.js → annotateReactComponents: true
Quality setting:       low | medium (default) | high
Expo Go:               ❌ Not supported — use expo-dev-client or EAS Build
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Replay not recording at all | Verify `mobileReplayIntegration()` is in the `integrations` array in `Sentry.init()` and sample rates are > 0 |
| All content masked even after setting `maskAllText: false` | Check SDK version ≥ 5.36.0 / 6.3.0+. If using manually initialized native SDK, requires 6.15.1+ (Cocoa 8.52.1+) |
| `Sentry.Mask` / `Sentry.Unmask` not working | Requires SDK 6.4.0-beta.1+. Also check for React Native View Flattening — add `collapsable={false}` to wrapper |
| Sensitive data visible despite masking | View Flattening may have removed `Mask` wrappers. Verify wrapper appears in native view hierarchy. Use `collapsable={false}` |
| Replay works in debug but not production | Confirm sample rates in production config; check DSN is correct for environment |
| Expo Go — replay not working | Expected — native modules not supported in Expo Go. Use `expo-dev-client` or EAS Build |
| Android: masking visually misaligned | Try `screenshotStrategy: "canvas"` — more accurate but everything becomes masked |
| iOS: crash during replay capture | A native class is causing traversal issues. Add it to `excludedViewClasses` (SDK 7.9.0+) |
| High CPU / memory on older devices | Set `replaysSessionQuality: "low"` and lower `replaysSessionSampleRate`. Disable on affected device models if needed |
| Pre-error buffer not appearing | Check available memory — the rolling 60-second buffer is held in RAM. Low-memory devices may truncate it |
| iOS 26: masked content visible through UI | Known Liquid Glass bug — disable Session Replay on iOS 26+ until [sentry-cocoa #6390](https://github.com/getsentry/sentry-cocoa/issues/6390) is resolved |
| Error replay count differs from issue count | Expected — rate limiting, manual deletions, or network failures can cause discrepancies |
| `beforeErrorSampling` not being called | Confirm `replaysOnErrorSampleRate` > 0; the callback only fires when error sampling is active |
