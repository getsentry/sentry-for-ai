---
name: sentry-react-native-sdk
description: Full Sentry SDK setup for React Native and Expo. Use when asked to "add Sentry to React Native", "install @sentry/react-native", "setup Sentry in Expo", or configure error monitoring, tracing, profiling, session replay, or logging for React Native applications. Supports Expo managed, Expo bare, and vanilla React Native.
license: Apache-2.0
---

# Sentry React Native SDK

Opinionated wizard that scans your React Native or Expo project and guides you through complete Sentry setup — error monitoring, tracing, profiling, session replay, logging, and more.

## Invoke This Skill When

- User asks to "add Sentry to React Native" or "set up Sentry" in an RN or Expo app
- User wants error monitoring, tracing, profiling, session replay, or logging in React Native
- User mentions `@sentry/react-native`, mobile error tracking, or Sentry for Expo
- User wants to monitor native crashes, ANRs, or app hangs on iOS/Android

> **Note:** SDK versions and APIs below reflect current Sentry docs at time of writing (`@sentry/react-native` ≥6.0.0, minimum recommended ≥8.0.0).
> Always verify against [docs.sentry.io/platforms/react-native/](https://docs.sentry.io/platforms/react-native/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making any recommendations:

```bash
# Detect project type and existing Sentry
cat package.json | grep -E '"(react-native|expo|@expo|@sentry/react-native|sentry-expo)"'

# Distinguish Expo managed vs bare vs vanilla RN
ls app.json app.config.js app.config.ts 2>/dev/null
cat app.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('Expo managed' if 'expo' in d else 'Bare/Vanilla')" 2>/dev/null

# Check Expo SDK version (important: Expo SDK 50+ required for @sentry/react-native)
cat package.json | grep '"expo"'

# Detect navigation library
grep -E '"(@react-navigation/native|react-native-navigation)"' package.json

# Detect state management (Redux → breadcrumb integration available)
grep -E '"(redux|@reduxjs/toolkit|zustand|mobx)"' package.json

# Check for existing Sentry initialization
grep -r "Sentry.init" src/ app/ App.tsx App.js _layout.tsx 2>/dev/null | head -5

# Detect Hermes (affects source map handling)
cat android/app/build.gradle 2>/dev/null | grep -i hermes
cat ios/Podfile 2>/dev/null | grep -i hermes

# Detect Expo Router
ls app/_layout.tsx app/_layout.js 2>/dev/null

# Detect backend for cross-link
ls backend/ server/ api/ 2>/dev/null
find . -maxdepth 3 \( -name "go.mod" -o -name "requirements.txt" -o -name "Gemfile" -o -name "package.json" \) 2>/dev/null | grep -v node_modules | head -10
```

**What to determine:**

| Question | Impact |
|----------|--------|
| `expo` in `package.json`? | Expo path (config plugin + `getSentryExpoConfig`) vs bare/vanilla RN path |
| Expo SDK ≥50? | `@sentry/react-native` directly; older = `sentry-expo` (legacy, do not use) |
| `app.json` has `"expo"` key? | Managed Expo — wizard is simplest; config plugin handles all native config |
| `app/_layout.tsx` present? | Expo Router project — init goes in `_layout.tsx` |
| `@sentry/react-native` already in `package.json`? | Skip install, jump to feature config |
| `@react-navigation/native` present? | Recommend `reactNavigationIntegration` for screen tracking |
| `react-native-navigation` present? | Recommend `reactNativeNavigationIntegration` (Wix) |
| Backend directory detected? | Trigger Phase 4 cross-link |

---

## Phase 2: Recommend

Present a concrete recommendation based on what you found. Don't ask open-ended questions — lead with a proposal:

**Recommended (core coverage — always set up these):**
- ✅ **Error Monitoring** — captures JS exceptions, native crashes (iOS + Android), ANRs, and app hangs
- ✅ **Tracing** — mobile performance is critical; auto-instruments navigation, app start, network requests
- ✅ **Session Replay** — mobile replay captures screenshots and touch events for debugging user issues

**Optional (enhanced observability):**
- ⚡ **Profiling** — CPU profiling on iOS (JS profiling cross-platform); low overhead in production
- ⚡ **Logging** — structured logs via `Sentry.logger.*`; links to traces for full context
- ⚡ **User Feedback** — collect user-submitted bug reports directly from your app

**Recommendation logic:**

| Feature | Recommend when... |
|---------|------------------|
| Error Monitoring | **Always** — non-negotiable baseline for any mobile app |
| Tracing | **Always for mobile** — app start, navigation, and network latency matter |
| Session Replay | User-facing production app; debug user-reported issues visually |
| Profiling | Performance-sensitive screens, startup time concerns, or production perf investigations |
| Logging | App uses structured logging, or you want log-to-trace correlation in Sentry |
| User Feedback | Beta or customer-facing app where you want user-submitted bug reports |

Propose: *"For your [Expo managed / bare RN] app, I recommend setting up Error Monitoring + Tracing + Session Replay. Want me to also add Profiling and Logging?"*

---

## Phase 3: Guide

### Determine Your Setup Path

| Project type | Recommended setup | Complexity |
|-------------|------------------|------------|
| Expo managed (SDK 50+) | Wizard CLI or manual with config plugin | Low — wizard does everything |
| Expo bare (SDK 50+) | Wizard CLI recommended | Medium — handles iOS/Android config |
| Vanilla React Native (0.69+) | Wizard CLI recommended | Medium — handles Xcode + Gradle |
| Expo SDK <50 | Use `sentry-expo` (legacy) | See [legacy docs](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) |

---

### Path A: Wizard CLI (Recommended for all project types)

Run the wizard — it walks you through login, org/project selection, and auth token setup interactively. It then handles installation, native config, source map upload, and initial `Sentry.init()`:

```bash
npx @sentry/wizard@latest -i reactNative
```

**What the wizard creates/modifies:**

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Installs `@sentry/react-native` | Core SDK |
| `metro.config.js` | Adds `@sentry/react-native/metro` serializer | Source map generation |
| `app.json` | Adds `@sentry/react-native/expo` plugin (Expo only) | Config plugin for native builds |
| `App.tsx` / `_layout.tsx` | Adds `Sentry.init()` and `Sentry.wrap()` | SDK initialization |
| `ios/sentry.properties` | Stores org/project/token | iOS source map + dSYM upload |
| `android/sentry.properties` | Stores org/project/token | Android source map upload |
| `android/app/build.gradle` | Adds Sentry Gradle plugin | Android source maps + proguard |
| `ios/[AppName].xcodeproj` | Wraps "Bundle RN" build phase + adds dSYM upload | iOS symbol upload |
| `.env.local` | `SENTRY_AUTH_TOKEN` | Auth token (add to `.gitignore`) |

After the wizard runs, skip to [Verification](#verification).

---

### Path B: Manual — Expo Managed (SDK 50+)

**Step 1 — Install**

```bash
npx expo install @sentry/react-native
```

**Step 2 — `metro.config.js`**

```javascript
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const config = getSentryExpoConfig(__dirname);
module.exports = config;
```

If `metro.config.js` doesn't exist yet:
```bash
npx expo customize metro.config.js
# Then replace contents with the above
```

**Step 3 — `app.json` — Add Expo config plugin**

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "YOUR_PROJECT_SLUG",
          "organization": "YOUR_ORG_SLUG"
        }
      ]
    ]
  }
}
```

> **Note:** Set `SENTRY_AUTH_TOKEN` as an environment variable for native builds — never commit it to version control.

**Step 4 — Initialize Sentry**

For **Expo Router** (`app/_layout.tsx`):

```typescript
import { Stack, useNavigationContainerRef } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as Sentry from "@sentry/react-native";
import React from "react";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(), // disabled in Expo Go
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "YOUR_SENTRY_DSN",
  sendDefaultPii: true,

  // Tracing
  tracesSampleRate: 1.0, // lower to 0.1–0.2 in production

  // Profiling
  profilesSampleRate: 1.0,

  // Session Replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Logging (SDK ≥7.0.0)
  enableLogs: true,

  // Navigation
  integrations: [
    navigationIntegration,
    Sentry.mobileReplayIntegration(),
  ],

  enableNativeFramesTracking: !isRunningInExpoGo(), // slow/frozen frames

  environment: __DEV__ ? "development" : "production",
});

function RootLayout() {
  const ref = useNavigationContainerRef();

  React.useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  return <Stack />;
}

export default Sentry.wrap(RootLayout);
```

For **standard Expo** (`App.tsx`):

```typescript
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { isRunningInExpoGo } from "expo";
import * as Sentry from "@sentry/react-native";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "YOUR_SENTRY_DSN",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  enableLogs: true,
  integrations: [
    navigationIntegration,
    Sentry.mobileReplayIntegration(),
  ],
  enableNativeFramesTracking: !isRunningInExpoGo(),
  environment: __DEV__ ? "development" : "production",
});

const navigationRef = createNavigationContainerRef();

function App() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        navigationIntegration.registerNavigationContainer(navigationRef);
      }}
    >
      {/* your navigation here */}
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);
```

---

### Path C: Manual — Bare React Native (0.69+)

**Step 1 — Install**

```bash
npm install @sentry/react-native --save
cd ios && pod install
```

**Step 2 — `metro.config.js`**

```javascript
const { getDefaultConfig } = require("@react-native/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");

const config = getDefaultConfig(__dirname);
module.exports = withSentryConfig(config);
```

**Step 3 — iOS: Modify Xcode build phase**

Open `ios/[AppName].xcodeproj` in Xcode. Find the **"Bundle React Native code and images"** build phase and replace the script content with:

```bash
# RN 0.81.1+
set -e
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
SENTRY_XCODE="../node_modules/@sentry/react-native/scripts/sentry-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT $SENTRY_XCODE"
```

**Step 4 — iOS: Add "Upload Debug Symbols to Sentry" build phase**

Add a new **Run Script** build phase in Xcode (after the bundle phase):

```bash
/bin/sh ../node_modules/@sentry/react-native/scripts/sentry-xcode-debug-files.sh
```

**Step 5 — iOS: `ios/sentry.properties`**

```properties
defaults.url=https://sentry.io/
defaults.org=YOUR_ORG_SLUG
defaults.project=YOUR_PROJECT_SLUG
auth.token=YOUR_ORG_AUTH_TOKEN
```

**Step 6 — Android: `android/app/build.gradle`**

Add before the `android {}` block:

```groovy
apply from: "../../node_modules/@sentry/react-native/sentry.gradle"
```

**Step 7 — Android: `android/sentry.properties`**

```properties
defaults.url=https://sentry.io/
defaults.org=YOUR_ORG_SLUG
defaults.project=YOUR_PROJECT_SLUG
auth.token=YOUR_ORG_AUTH_TOKEN
```

**Step 8 — Initialize Sentry (`App.tsx` or entry point)**

```typescript
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  enableLogs: true,
  integrations: [
    navigationIntegration,
    Sentry.mobileReplayIntegration(),
  ],
  enableNativeFramesTracking: true,
  environment: __DEV__ ? "development" : "production",
});

const navigationRef = createNavigationContainerRef();

function App() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        navigationIntegration.registerNavigationContainer(navigationRef);
      }}
    >
      {/* your navigation here */}
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);
```

---

### Quick Reference: Full-Featured `Sentry.init()`

This is the recommended starting configuration with all features enabled:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  sendDefaultPii: true,

  // Tracing — lower to 0.1–0.2 in high-traffic production
  tracesSampleRate: 1.0,

  // Profiling — runs on a subset of traced transactions
  profilesSampleRate: 1.0,

  // Session Replay — always capture on error, sample 10% of all sessions
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Logging — enable Sentry.logger.* API
  enableLogs: true,

  // Integrations — mobile replay is opt-in
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: true,   // masks text by default for privacy
      maskAllImages: true,
    }),
  ],

  // Native frames tracking (disable in Expo Go)
  enableNativeFramesTracking: true,

  // Environment
  environment: __DEV__ ? "development" : "production",

  // Release — set from CI or build system
  // release: "my-app@1.0.0+1",
  // dist: "1",
});

// REQUIRED: Wrap root component to capture React render errors
export default Sentry.wrap(App);
```

---

### Navigation Setup — React Navigation (v5+)

```typescript
import { reactNavigationIntegration } from "@sentry/react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";

const navigationIntegration = reactNavigationIntegration({
  enableTimeToInitialDisplay: true,   // track TTID per screen
  routeChangeTimeoutMs: 1_000,        // max wait for route change to settle
  ignoreEmptyBackNavigationTransactions: true,
});

// Add to Sentry.init integrations array
Sentry.init({
  integrations: [navigationIntegration],
  // ...
});

// In your component:
const navigationRef = createNavigationContainerRef();

<NavigationContainer
  ref={navigationRef}
  onReady={() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }}
>
```

### Navigation Setup — Wix React Native Navigation

```typescript
import * as Sentry from "@sentry/react-native";
import { Navigation } from "react-native-navigation";

Sentry.init({
  integrations: [Sentry.reactNativeNavigationIntegration({ navigation: Navigation })],
  // ...
});
```

---

### Wrap Your Root Component

Always wrap your root component — this enables React error boundaries and ensures crashes at the component tree level are captured:

```typescript
export default Sentry.wrap(App);
```

---

### For Each Agreed Feature

Walk through features one at a time. Load the reference file for each, follow its steps, then verify before moving on:

| Feature | Reference | Load when... |
|---------|-----------|-------------|
| Error Monitoring | `${SKILL_ROOT}/references/error-monitoring.md` | Always (baseline) |
| Tracing & Performance | `${SKILL_ROOT}/references/tracing.md` | Always for mobile (app start, navigation, network) |
| Profiling | `${SKILL_ROOT}/references/profiling.md` | Performance-sensitive production apps |
| Session Replay | `${SKILL_ROOT}/references/session-replay.md` | User-facing apps |
| Logging | `${SKILL_ROOT}/references/logging.md` | Structured logging / log-to-trace correlation |
| User Feedback | `${SKILL_ROOT}/references/user-feedback.md` | Collecting user-submitted reports |

For each feature: `Read ${SKILL_ROOT}/references/<feature>.md`, follow steps exactly, verify it works.

---

## Configuration Reference

### Core `Sentry.init()` Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `dsn` | `string` | — | **Required.** Project DSN; SDK disabled if empty. Env: `SENTRY_DSN` |
| `environment` | `string` | — | e.g., `"production"`, `"staging"`. Env: `SENTRY_ENVIRONMENT` |
| `release` | `string` | — | App version, e.g., `"my-app@1.0.0+42"`. Env: `SENTRY_RELEASE` |
| `dist` | `string` | — | Build number / variant identifier (max 64 chars) |
| `sendDefaultPii` | `boolean` | `false` | Include PII: IP address, cookies, user data |
| `sampleRate` | `number` | `1.0` | Error event sampling (0.0–1.0) |
| `maxBreadcrumbs` | `number` | `100` | Max breadcrumbs per event |
| `attachStacktrace` | `boolean` | `true` | Auto-attach stack traces to messages |
| `attachScreenshot` | `boolean` | `false` | Capture screenshot on error (SDK ≥4.11.0) |
| `attachViewHierarchy` | `boolean` | `false` | Attach JSON view hierarchy as attachment |
| `debug` | `boolean` | `false` | Verbose SDK output. **Never use in production** |
| `enabled` | `boolean` | `true` | Disable SDK entirely (e.g., for testing) |
| `ignoreErrors` | `string[] \| RegExp[]` | — | Drop errors matching these patterns |
| `ignoreTransactions` | `string[] \| RegExp[]` | — | Drop transactions matching these patterns |
| `maxCacheItems` | `number` | `30` | Max offline-cached envelopes |
| `defaultIntegrations` | `boolean` | `true` | Set `false` to disable all default integrations |
| `integrations` | `array \| function` | — | Add or filter integrations |

### Tracing Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `tracesSampleRate` | `number` | `0` | Transaction sample rate (0–1). Use `1.0` in dev |
| `tracesSampler` | `function` | — | Per-transaction sampling; overrides `tracesSampleRate` |
| `tracePropagationTargets` | `(string \| RegExp)[]` | `[/.*/]` | Which API URLs receive distributed tracing headers |
| `profilesSampleRate` | `number` | `0` | Profiling sample rate (applied to traced transactions) |

### Native / Mobile Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `enableNative` | `boolean` | `true` | Set `false` for JS-only (no native SDK) |
| `enableNativeCrashHandling` | `boolean` | `true` | Capture native hard crashes (iOS/Android) |
| `enableNativeFramesTracking` | `boolean` | — | Slow/frozen frames tracking. **Disable in Expo Go** |
| `enableWatchdogTerminationTracking` | `boolean` | `true` | OOM kill detection (iOS) |
| `enableAppHangTracking` | `boolean` | `true` | App hang detection (iOS, tvOS, macOS) |
| `appHangTimeoutInterval` | `number` | `2` | Seconds before classifying as app hang (iOS) |
| `enableAutoPerformanceTracing` | `boolean` | `true` | Auto performance instrumentation |
| `enableNdkScopeSync` | `boolean` | `true` | Java→NDK scope sync (Android) |
| `attachThreads` | `boolean` | `false` | Auto-attach all threads on crash (Android) |
| `autoInitializeNativeSdk` | `boolean` | `true` | Set `false` for manual native init |
| `onReady` | `function` | — | Callback after native SDKs initialize |

### Session & Release Health Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `autoSessionTracking` | `boolean` | `true` | Session tracking (crash-free users/sessions) |
| `sessionTrackingIntervalMillis` | `number` | `30000` | ms of background before session ends |

### Replay Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `replaysSessionSampleRate` | `number` | `0` | Fraction of all sessions recorded |
| `replaysOnErrorSampleRate` | `number` | `0` | Fraction of error sessions recorded |

### Logging Options (SDK ≥7.0.0)

| Option | Type | Purpose |
|--------|------|---------|
| `enableLogs` | `boolean` | Enable `Sentry.logger.*` API |
| `beforeSendLog` | `function` | Filter/modify logs before sending |
| `logsOrigin` | `'native' \| 'js' \| 'all'` | Filter log source (SDK ≥7.7.0) |

### Hook Options

| Option | Type | Purpose |
|--------|------|---------|
| `beforeSend` | `(event, hint) => event \| null` | Modify/drop JS error events. ⚠️ Does NOT apply to native crashes |
| `beforeSendTransaction` | `(event) => event \| null` | Modify/drop transaction events |
| `beforeBreadcrumb` | `(breadcrumb, hint) => breadcrumb \| null` | Process breadcrumbs before storage |

---

## Environment Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `SENTRY_DSN` | Data Source Name | Falls back from `dsn` option |
| `SENTRY_AUTH_TOKEN` | Upload source maps and dSYMs | **Never commit — use CI secrets** |
| `SENTRY_ORG` | Organization slug | Used by wizard and build plugins |
| `SENTRY_PROJECT` | Project slug | Used by wizard and build plugins |
| `SENTRY_RELEASE` | Release identifier | Falls back from `release` option |
| `SENTRY_ENVIRONMENT` | Environment name | Falls back from `environment` option |
| `SENTRY_DISABLE_AUTO_UPLOAD` | Skip source map upload | Set `true` during local builds |
| `EXPO_PUBLIC_SENTRY_DSN` | Expo public env var for DSN | Safe to embed in client bundle |

---

## Source Maps & Debug Symbols

Source maps and debug symbols are what transform minified stack traces into readable ones. When set up correctly, Sentry shows you the exact line of your source code that threw.

### How Uploads Work

| Platform | What's uploaded | When |
|----------|----------------|------|
| **iOS** (JS) | Source maps (`.map` files) | During Xcode build |
| **iOS** (Native) | dSYM bundles | During Xcode archive / Xcode Cloud |
| **Android** (JS) | Source maps + Hermes `.hbc.map` | During Gradle build |
| **Android** (Native) | Proguard mapping + NDK `.so` files | During Gradle build |

### Expo: Automatic Upload

The `@sentry/react-native/expo` config plugin automatically sets up upload hooks for native builds. Source maps are uploaded during `eas build` and `expo run:ios/android` (release).

```bash
SENTRY_AUTH_TOKEN=sntrys_... npx expo run:ios --configuration Release
```

### Manual Upload (bare RN)

If you need to manually upload source maps:

```bash
npx sentry-cli sourcemaps upload \
  --org YOUR_ORG \
  --project YOUR_PROJECT \
  --release "my-app@1.0.0+1" \
  ./dist
```

---

## Default Integrations (Auto-Enabled)

These integrations are enabled automatically — no config needed:

| Integration | What it does |
|-------------|-------------|
| `ReactNativeErrorHandlers` | Catches unhandled JS exceptions and promise rejections |
| `Release` | Attaches release/dist to all events |
| `Breadcrumbs` | Records console logs, HTTP requests, user gestures as breadcrumbs |
| `HttpClient` | Adds HTTP request/response breadcrumbs |
| `DeviceContext` | Attaches device/OS/battery info to events |
| `AppContext` | Attaches app version, bundle ID, and memory info |
| `CultureContext` | Attaches locale and timezone |
| `Screenshot` | Captures screenshot on error (when `attachScreenshot: true`) |
| `ViewHierarchy` | Attaches view hierarchy (when `attachViewHierarchy: true`) |
| `NativeLinkedErrors` | Links JS errors to their native crash counterparts |

### Opt-In Integrations

| Integration | How to enable |
|-------------|--------------|
| `mobileReplayIntegration()` | Add to `integrations` array |
| `reactNavigationIntegration()` | Add to `integrations` array |
| `reactNativeNavigationIntegration()` | Add to `integrations` array (Wix only) |
| `feedbackIntegration()` | Add to `integrations` array (user feedback widget) |

---

## Expo Config Plugin Reference

Configure the plugin in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "my-project",
          "organization": "my-org",
          "note": "Set SENTRY_AUTH_TOKEN env var for native builds"
        }
      ]
    ]
  }
}
```

Or in `app.config.js` (allows env var interpolation):

```javascript
export default {
  expo: {
    plugins: [
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: process.env.SENTRY_PROJECT,
          organization: process.env.SENTRY_ORG,
        },
      ],
    ],
  },
};
```

---

## Production Settings

Lower sample rates and harden config before shipping to production:

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",

  // Trace 10–20% of transactions in high-traffic production
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,

  // Profile 100% of traced transactions (profiling is always a subset of tracing)
  profilesSampleRate: 1.0,

  // Replay all error sessions, sample 5% of normal sessions
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: __DEV__ ? 1.0 : 0.05,

  // Set release and dist for accurate source map lookup
  release: "my-app@" + Application.nativeApplicationVersion,
  dist: String(Application.nativeBuildVersion),

  // Disable debug logging in production
  debug: __DEV__,
});
```

---

## Verification

After setup, test that Sentry is receiving events:

```typescript
// Quick test — throws and Sentry.wrap(App) catches it
<Button
  title="Test Sentry Error"
  onPress={() => {
    throw new Error("My first Sentry error!");
  }}
/>

// Or capture manually
<Button
  title="Test Sentry Message"
  onPress={() => {
    Sentry.captureMessage("Sentry test message", "info");
  }}
/>
```

**Check the Sentry dashboard:**
- **Issues** → your test error should appear within seconds
- **Traces** → look for a "main" transaction with child spans
- **Replays** → session recording visible after app interaction (native build only — not Expo Go)
- **Logs** → structured log entries if `enableLogs: true`

> ⚠️ **Expo Go limitation:** Native crashes, session replay, slow/frozen frames, TTID, and TTFD only work in native builds (`eas build` or `expo run`). Expo Go runs in a JS-only mode. Set `enableNativeFramesTracking: !isRunningInExpoGo()` to avoid warnings.

If nothing appears:
1. Set `debug: true` — SDK logs to Metro console
2. Verify DSN is correct and the Sentry project exists
3. Ensure `Sentry.wrap(App)` is applied to the root component
4. For native crashes, build a release build (crashes in debug mode may not forward)

---

## Phase 4: Cross-Link

After completing React Native setup, check for a backend or web frontend missing Sentry coverage:

```bash
# Adjacent backend directories
ls ../backend ../server ../api 2>/dev/null
cat ../go.mod 2>/dev/null | head -3
cat ../requirements.txt ../pyproject.toml 2>/dev/null | head -3
cat ../Gemfile 2>/dev/null | head -3
ls ../backend/package.json ../server/package.json 2>/dev/null

# Web frontend in same or sibling repo
ls ../web ../frontend ../dashboard 2>/dev/null
cat ../web/package.json ../frontend/package.json 2>/dev/null | grep -E '"react"|"svelte"|"next"'

# Check for OpenTelemetry (for distributed tracing interop)
grep -r "opentelemetry" ../backend/go.mod ../server/requirements.txt 2>/dev/null
```

If a backend or web frontend exists without Sentry, suggest the matching skill:

| Detected | Suggest skill |
|----------|--------------|
| Go backend (`go.mod`) | `sentry-go-sdk` |
| Python backend (`requirements.txt`, `pyproject.toml`) | `sentry-python-sdk` |
| Ruby backend (`Gemfile`) | `sentry-ruby-sdk` |
| Node.js backend (Express, Fastify, etc.) | `@sentry/node` — see [docs.sentry.io/platforms/javascript/guides/express/](https://docs.sentry.io/platforms/javascript/guides/express/) |
| React / Next.js web | `sentry-react-sdk` |
| Svelte / SvelteKit web | `sentry-svelte-sdk` |

**Distributed tracing setup** — if the backend skill is added, configure `tracePropagationTargets` in React Native to propagate trace context to your API:

```typescript
Sentry.init({
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yourapp\.com/,
  ],
  // ...
});
```

This links mobile transactions to backend traces in the Sentry waterfall view.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing in Sentry | Set `debug: true`, check Metro/Xcode console for SDK errors; verify DSN is correct |
| `pod install` fails | Run `cd ios && pod install --repo-update`; check CocoaPods version |
| iOS build fails with Sentry script | Verify the "Bundle React Native code and images" script was replaced (not appended to) |
| Android build fails after adding `sentry.gradle` | Ensure `apply from` line is before the `android {}` block in `build.gradle` |
| Android Gradle 8+ compatibility issue | Use `sentry-android-gradle-plugin` ≥4.0.0; check `sentry.gradle` version in your SDK |
| Source maps not uploading | Verify `sentry.properties` has a valid `auth.token`; check build logs for `sentry-cli` output |
| Source maps not resolving in Sentry | Confirm `release` and `dist` in `Sentry.init()` match the uploaded bundle metadata |
| Hermes source maps not working | Hermes emits `.hbc.map` — the Gradle plugin handles this automatically; verify `sentry.gradle` is applied |
| Session replay not recording | Must use a native build (not Expo Go); confirm `mobileReplayIntegration()` is in `integrations` |
| Replay shows blank/black screens | Check that `maskAllText`/`maskAllImages` settings match your privacy requirements |
| Slow/frozen frames not tracked | Set `enableNativeFramesTracking: true` and confirm you're on a native build (not Expo Go) |
| TTID / TTFD not appearing | Requires `enableTimeToInitialDisplay: true` in `reactNavigationIntegration()` on a native build |
| App crashes on startup after adding Sentry | Likely a native initialization error — check Xcode/Logcat logs; try `enableNative: false` to isolate |
| Expo SDK 49 or older | Use `sentry-expo` (legacy package); `@sentry/react-native` requires Expo SDK 50+ |
| `isRunningInExpoGo` import error | Import from `expo` package: `import { isRunningInExpoGo } from "expo"` |
| Node not found during Xcode build | Add `export NODE_BINARY=$(which node)` to the Xcode build phase, or symlink: `ln -s $(which node) /usr/local/bin/node` |
| Expo Go warning about native features | Use `isRunningInExpoGo()` guard: `enableNativeFramesTracking: !isRunningInExpoGo()` |
| `beforeSend` not firing for native crashes | Expected — `beforeSend` only intercepts JS-layer errors; native crashes bypass it |
| Android 15+ (16KB page size) crash | Upgrade to `@sentry/react-native` ≥6.3.0 |
| Too many transactions in dashboard | Lower `tracesSampleRate` to `0.1` or use `tracesSampler` to drop health checks |
| `SENTRY_AUTH_TOKEN` exposed in app bundle | `SENTRY_AUTH_TOKEN` is for build-time upload only — never pass it to `Sentry.init()` |
| EAS Build: Sentry auth token missing | Set `SENTRY_AUTH_TOKEN` as an EAS secret: `eas secret:create --name SENTRY_AUTH_TOKEN` |
