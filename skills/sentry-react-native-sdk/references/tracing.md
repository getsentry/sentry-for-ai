# Tracing & Performance Monitoring — Sentry React Native SDK

> **Minimum SDK:** `@sentry/react-native` ≥ 5.20.0 for TTID/TTFD · ≥ 5.32.0 for profiling · ≥ 8.0.0 recommended
> **Mobile-first note:** React Native has unique performance capabilities web SDKs don't provide — cold/warm app start tracking, JS event loop stall detection, slow/frozen frame counting, and navigation-based transactions. All are first-class citizens in the Sentry RN SDK.

---

## Table of Contents

1. [Basic Tracing Setup](#1-basic-tracing-setup)
2. [Automatic Instrumentation Setup](#2-automatic-instrumentation-setup)
3. [App Start Tracing](#3-app-start-tracing)
4. [Navigation Instrumentation](#4-navigation-instrumentation)
5. [Screen Rendering: Time to Display](#5-screen-rendering-time-to-display)
6. [Slow & Frozen Frames](#6-slow--frozen-frames)
7. [Stall Tracking](#7-stall-tracking)
8. [Network Request Tracing](#8-network-request-tracing)
9. [Distributed Tracing](#9-distributed-tracing)
10. [User Interaction Tracing](#10-user-interaction-tracing)
11. [Custom Spans](#11-custom-spans)
12. [React Component Profiler](#12-react-component-profiler)
13. [Profiling (Native + Hermes)](#13-profiling-native--hermes)
14. [Dynamic Sampling](#14-dynamic-sampling)
15. [Configuration Reference](#15-configuration-reference)
16. [Mobile vs Web: Feature Matrix](#16-mobile-vs-web-feature-matrix)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Basic Tracing Setup

Tracing requires **no additional imports** beyond the standard Sentry import — a key difference from the web SDK.

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",

  // Option A: uniform sample rate (0.0–1.0)
  // 1.0 = 100% of transactions captured — development/testing only
  tracesSampleRate: 1.0,

  // Option B: dynamic sampler — takes precedence over tracesSampleRate when both are set
  // tracesSampler: ({ name, attributes, parentSampled }) => {
  //   if (name === "checkout") return 1.0;
  //   return 0.2;
  // },
});
```

> **Production recommendation:** Use `tracesSampleRate: 0.2` or lower, or switch to `tracesSampler` for context-aware sampling. 100% sampling causes high volume at scale.

---

## 2. Automatic Instrumentation Setup

`reactNativeTracingIntegration` must be explicitly added to enable automatic tracing features. Two required setup steps:

### Step 1 — Add the integration

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.reactNativeTracingIntegration(),
  ],
});
```

### Step 2 — Wrap your root component

Required for accurate App Start measurement (records to first component mount instead of JS initialization) and to enable User Interaction tracing:

```typescript
// App.tsx
export default Sentry.wrap(App);
```

### Opt out of automatic instrumentation

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  enableAutoPerformanceTracing: false, // disables all auto instrumentation
});
```

---

## 3. App Start Tracing

**Unique to mobile.** Tracks the duration from the earliest native process initialization to React Native root component mount.

| Metric | Measurement Key | When it fires |
|---|---|---|
| **Cold start** | `measurements.app_start_cold` | Process launched from scratch (not in memory) |
| **Warm start** | `measurements.app_start_warm` | Process was already in memory, activity recreated |

> **Hot starts and resumes are not tracked.** They're considered too fast to be meaningful for monitoring.

### Why `Sentry.wrap(App)` matters for App Start

Without `Sentry.wrap(App)`, the App Start measurement ends at JS initialization rather than at first component mount. Wrapping is essential for accurate data that represents the real user experience.

### How App Start appears in traces

When a routing integration (React Navigation, Expo Router, RNN) is present, App Start data appears as **spans inside the first navigation transaction** — not as a standalone transaction. You'll see it in the trace waterfall as a child span at the root of the first screen.

### Platform accuracy notes

Sentry follows Apple and Google's official App Start guidelines. Reported values may be slightly longer than other tools, as they're designed to most accurately represent real user experience rather than minimize measured time.

### Optimizing App Start time

Common causes of slow cold starts and how to address them:

```typescript
// ❌ Eager import — executes at bundle parse time
import { HeavyModule } from './heavy-module';

// ✅ Lazy import — deferred until actually needed
const loadHeavy = () => import('./heavy-module');

// ❌ Synchronous AsyncStorage read at startup
const theme = await AsyncStorage.getItem('theme'); // blocks JS thread

// ✅ Use a synchronous-safe default, hydrate later
const [theme, setTheme] = useState('light');
useEffect(() => {
  AsyncStorage.getItem('theme').then(setTheme);
}, []);
```

---

## 4. Navigation Instrumentation

The routing integration determines how navigation events create transactions. Each screen transition becomes a transaction, with the screen name as the transaction name.

### 4a. React Navigation (v5+)

The most common setup. Creates a transaction for every route change automatically.

```typescript
import * as Sentry from "@sentry/react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

// Step 1 — Create the integration BEFORE Sentry.init
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,             // enable TTID measurement per screen
  routeChangeTimeoutMs: 1_000,                  // discard transaction if screen doesn't mount within 1s
  ignoreEmptyBackNavigationTransactions: true,  // drop back-nav transactions with no child spans
  useDispatchedActionData: true,                // attach action data to transaction metadata
});

// Step 2 — Pass to Sentry.init
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  integrations: [navigationIntegration],
});

// Step 3 — Register the container ref in onReady
function App() {
  const containerRef = createNavigationContainerRef();

  return (
    <NavigationContainer
      ref={containerRef}
      onReady={() => {
        // Must be called inside onReady — not before the container is ready
        navigationIntegration.registerNavigationContainer(containerRef);
      }}
    >
      {/* screens */}
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);
```

### 4b. React Native Navigation (Wix/RNN)

Pass the `Navigation` object directly — no ref or container wrapping needed.

```typescript
import * as Sentry from "@sentry/react-native";
import { Navigation } from "react-native-navigation";

Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.reactNativeNavigationIntegration({
      navigation: Navigation,                        // required — the RNN Navigation object
      routeChangeTimeoutMs: 1_000,                   // discard stale transactions
      enableTabsInstrumentation: true,               // create transactions on tab changes (default: false)
      ignoreEmptyBackNavigationTransactions: true,   // drop no-span back navigations
    }),
  ],
});
```

### Customizing transaction names

Transaction names default to the route/screen name (e.g., `LoginScreen`, `HomeTab`). Modify via `beforeStartSpan`:

```typescript
Sentry.reactNativeTracingIntegration({
  beforeStartSpan: (context) => ({
    ...context,
    name: context.name.replace("Screen", ""),  // strip "Screen" suffix for cleaner names
    attributes: {
      ...context.attributes,
      "app.version": "2.1.0",
    },
  }),
}),
```

### Tab navigation

Tab navigators preload screens, so auto-instrumentation only creates a transaction for the **initial** tab visit. For subsequent tab switches, use the `TimeToInitialDisplay` and `TimeToFullDisplay` components explicitly (see §5).

---

## 5. Screen Rendering: Time to Display

Two **Mobile Vitals** that have no web equivalent:

| Metric | Abbreviation | What it measures |
|---|---|---|
| **Time to Initial Display** | TTID | From navigation event → first rendered frame visible after Screen mounts |
| **Time to Full Display** | TTFD | From navigation event → all async content loaded and ready for user interaction |

> **Requirements:** SDK ≥ `5.20.0` · Native build required (not available in Expo Go)

### Automatic TTID (React Navigation only)

Enable in the integration config. TTID spans automatically include animation completion time (except JS-driven animations on iOS, which are excluded).

```typescript
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true, // that's it
});
```

### Manual TTID override

Use when you need to control exactly when "initial display" is considered complete:

```tsx
import * as Sentry from "@sentry/react-native";
import { View } from "react-native";

function ProductListScreen() {
  return (
    <View>
      <Sentry.TimeToInitialDisplay record={true} />
      {/* content */}
    </View>
  );
}
```

### Time to Full Display (TTFD)

Mark full display when all async content is loaded. The `record` prop fires once when it transitions from `false` to `true`:

```tsx
import * as Sentry from "@sentry/react-native";
import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";

function ProductDetailScreen({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(`https://api.example.com/products/${productId}`)
      .then((res) => res.json())
      .then(setProduct);
  }, [productId]);

  return (
    <View>
      {/* Fires once when product transitions from null to loaded */}
      <Sentry.TimeToFullDisplay record={product !== null} />

      {product ? (
        <Text>{product.name}</Text>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
```

### Tab screens — explicit TTID + TTFD

Because tab screens are preloaded, auto-detection only fires on the first visit. Add both components explicitly for every tab screen:

```tsx
function HomeTabScreen({ isLoading }: { isLoading: boolean }) {
  return (
    <View>
      <Sentry.TimeToInitialDisplay record={true} />
      <Sentry.TimeToFullDisplay record={!isLoading} />
      {/* content */}
    </View>
  );
}
```

> Both `<TimeToInitialDisplay />` and `<TimeToFullDisplay />` render as `<></>` — **zero visual impact.**

---

## 6. Slow & Frozen Frames

**Mobile Vitals** — automatically captured per transaction when tracing is enabled. No configuration required.

| Frame type | Threshold | User experience |
|---|---|---|
| **Slow frame** | Takes longer than expected for the refresh rate | UI hitches, animation jank |
| **Frozen frame** | Completely unresponsive | App appears hung |

> Web Vitals (LCP, FID, CLS) are **not** reported for React Native — slow/frozen frames are the mobile equivalent.

These appear in the **Mobile Vitals** section of every transaction in Sentry's performance UI, alongside App Start time.

### Android: AndroidX dependency

Sentry uses `androidx.core` for accurate slow/frozen frame detection across all Android versions. It's included automatically. If you explicitly remove it:

```groovy
// android/app/build.gradle — removes androidx.core AND disables frame reporting
api('io.sentry:sentry-android:8.33.0') {
    exclude group: 'androidx.core', module: 'core'
}
```

> **Warning:** Removing `androidx.core` disables slow/frozen frame detection entirely.

---

## 7. Stall Tracking

**Unique to React Native.** A "stall" is when the JavaScript event loop takes longer than expected to process a tick — it directly blocks UI rendering and all JS logic.

Three metrics automatically attached to every transaction:

| Metric | Description |
|---|---|
| **Longest Stall Time** | Duration (ms) of the single longest event loop stall |
| **Total Stall Time** | Combined ms of all stalls during the transaction |
| **Stall Count** | Number of individual stalls |

No configuration needed — stall tracking is enabled automatically by `reactNativeTracingIntegration`.

### What causes stalls

```typescript
// ❌ Synchronous heavy computation on the JS thread — causes stalls
const result = items.reduce((acc, item) => {
  return acc + expensiveComputation(item); // blocks JS thread
}, 0);

// ✅ Offload to InteractionManager or requestAnimationFrame
InteractionManager.runAfterInteractions(() => {
  const result = items.reduce((acc, item) => {
    return acc + expensiveComputation(item);
  }, 0);
  setState(result);
});

// ✅ Or better — move to a native module / worklet (Reanimated)
```

---

## 8. Network Request Tracing

Every `fetch` and `XMLHttpRequest` call made while a transaction is active automatically gets a child span. No code changes needed.

Span data includes:
- HTTP method and URL
- Response status code
- Request/response size
- Duration (time-to-first-byte + total)

### Filter which requests get spans

```typescript
Sentry.reactNativeTracingIntegration({
  shouldCreateSpanForRequest: (url) => {
    // Skip analytics pings and health checks
    return !url.match(/\/(analytics|health|metrics)\/?(\?.*)?$/);
  },
}),
```

### Transaction idle and final timeouts

```typescript
Sentry.reactNativeTracingIntegration({
  idleTimeoutMs: 1_000,    // end transaction after 1s of inactivity (default: 1000)
  finalTimeoutMs: 600_000, // hard cap: 10 minutes max transaction duration (default: 600000)
}),
```

---

## 9. Distributed Tracing

Connects mobile traces to backend traces so you can see the full request lifecycle — from the user's tap to database query and back.

### How it works

When a `fetch` request fires inside a transaction, the SDK attaches two headers:

| Header | Purpose |
|---|---|
| `sentry-trace` | Carries the trace ID and span ID |
| `baggage` | Carries sampling decision and trace metadata |

Your backend Sentry SDK reads these headers and links its spans to the same trace, so you see one unified waterfall in Sentry.

### `tracePropagationTargets` — control where headers attach

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,

  // Default on mobile: [/.*/] — attaches to ALL outgoing requests
  // Restrict to your own APIs:
  tracePropagationTargets: [
    "api.myapp.com",             // string — matched against the full URL
    /^https:\/\/api\./,          // regex — matched against the full URL
    "localhost",                 // useful for local development
  ],
});
```

> **Important:** `tracePropagationTargets` matches against the **entire URL string**, not just the domain.

### CORS requirements for web APIs

If your React Native app calls web APIs that run CORS preflight checks, the backend must allow the Sentry headers:

```
Access-Control-Allow-Headers: sentry-trace, baggage
```

Without this, browsers (and React Native on web) will reject the preflight and the request will fail.

### End-to-end example: RN → Node.js API

```typescript
// React Native — starts the trace
await Sentry.startSpan({ name: "addToCart", op: "ui.action" }, async () => {
  // This fetch will carry sentry-trace + baggage headers to api.myapp.com
  const response = await fetch("https://api.myapp.com/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId: "abc-123" }),
  });
  return response.json();
});

// Node.js backend (with @sentry/node) — automatically continues the trace
// The backend span appears as a child in the same trace waterfall
```

```python
# Python backend (with sentry-sdk) — also continues the trace automatically
# No extra code needed beyond standard Sentry initialization
```

---

## 10. User Interaction Tracing

Captures transactions and breadcrumbs for touch events. Transaction names are automatically composed as `ScreenName > element_label`.

### Enable

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  enableUserInteractionTracing: true, // disabled by default
  tracesSampleRate: 1.0,
  integrations: [navigationIntegration],
});

// Wrapping is required for interaction tracing to work
export default Sentry.wrap(App);

// Or with a custom label prop name:
export default Sentry.wrap(App, {
  touchEventBoundaryProps: { labelName: "tracking-id" }, // defaults to "sentry-label"
});
```

### Label interactive elements

```tsx
// Without a label, no transaction is created — the tap is silently ignored
<Pressable
  sentry-label="add_to_cart_button"
  onPress={handleAddToCart}
>
  <Text>Add to Cart</Text>
</Pressable>

// Also works on TouchableOpacity, TouchableHighlight, etc.
<TouchableOpacity sentry-label="checkout_button" onPress={handleCheckout}>
  <Text>Checkout</Text>
</TouchableOpacity>
```

> Transactions with no child spans are automatically dropped — only meaningful interactions are recorded.

### Custom span attributes on interactions (experimental)

```tsx
<Pressable
  sentry-label="checkout"
  sentry-span-attributes={{
    "user.plan": userPlan,         // string
    "cart.item_count": itemCount,  // number
    "cart.has_coupon": hasCoupon,  // boolean
  }}
  onPress={handleCheckout}
>
  <Text>Checkout</Text>
</Pressable>
```

> `sentry-span-attributes` is **experimental** — API may change. The SDK traverses the component tree to find it, so it can be placed on a parent element.

### Gesture Handler (RNGH v2)

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { sentryTraceGesture } from "@sentry/react-native";

function ZoomableImage() {
  const pinch = Gesture.Pinch();
  const longPress = Gesture.LongPress();

  const gesture = Gesture.Race(
    sentryTraceGesture("pinch-to-zoom", pinch),       // label must be unique per screen
    sentryTraceGesture("long-press-cancel", longPress),
  );

  return (
    <GestureDetector gesture={gesture}>
      <Image source={imageSource} />
    </GestureDetector>
  );
}
```

> Only RNGH **API v2** is supported. Both transactions and breadcrumbs are created automatically.

---

## 11. Custom Spans

```typescript
import * as Sentry from "@sentry/react-native";
```

### `startSpan` — Active, auto-ending (recommended)

The span becomes the active parent for any child spans created inside the callback. Ends automatically when the callback resolves (sync or async).

```typescript
// Synchronous
const total = Sentry.startSpan({ name: "computeCartTotal", op: "function" }, () => {
  return items.reduce((sum, item) => sum + item.price, 0);
});

// Async
const data = await Sentry.startSpan(
  { name: "fetchUserProfile", op: "http.client" },
  async () => {
    const res = await fetch("https://api.example.com/profile");
    return res.json();
  }
);

// Nested — child spans automatically attach to their enclosing parent
await Sentry.startSpan({ name: "checkout", op: "function" }, async () => {
  await Sentry.startSpan({ name: "validateCart", op: "function" }, validateCart);
  await Sentry.startSpan({ name: "processPayment", op: "function" }, processPayment);
  await Sentry.startSpan({ name: "sendConfirmation", op: "http.client" }, sendEmail);
});
```

### `startSpanManual` — Active, manually ended

Use when the span lifetime doesn't map cleanly to a function scope (e.g., spans across event callbacks):

```typescript
function trackAnimationPerformance() {
  return Sentry.startSpanManual({ name: "heroAnimation", op: "ui.render" }, (span) => {
    const animation = Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true });
    animation.start(({ finished }) => {
      span.setAttribute("animation.completed", finished);
      span.end(); // must call end() manually
    });
  });
}
```

### `startInactiveSpan` — Inactive, manually ended

Inactive spans never become automatic parents for child spans. Use for fire-and-forget measurements:

```typescript
// Start a background sync span without it affecting the current active span
const syncSpan = Sentry.startInactiveSpan({ name: "backgroundSync", op: "function" });

await syncLocalDatabase();

syncSpan.end();
```

### Span options

| Option | Type | Description |
|---|---|---|
| `name` | `string` | **Required.** Display name in Sentry UI |
| `op` | `string` | Operation type — use standard values for enhanced UI (see below) |
| `attributes` | `Record<string, string \| number \| boolean \| array>` | Key/value metadata attached to the span |
| `startTime` | `number` | Custom start timestamp (Unix epoch, seconds) |
| `parentSpan` | `Span` | Explicit parent — overrides the active span |
| `onlyIfParent` | `boolean` | Skip this span if there's no active parent |
| `forceTransaction` | `boolean` | Force the span to appear as a top-level transaction in the UI |

### Standard operation types for mobile

Using well-known `op` values unlocks enhanced Sentry UI features (grouping, filtering, icons):

```typescript
Sentry.startSpan({ name: "GET /api/products",     op: "http.client"  }, fetchProducts);
Sentry.startSpan({ name: "SELECT * FROM users",   op: "db"           }, queryDatabase);
Sentry.startSpan({ name: "parseProductData",      op: "function"     }, parseData);
Sentry.startSpan({ name: "HomeScreen render",     op: "ui.render"    }, render);
Sentry.startSpan({ name: "readProductsCache",     op: "file.read"    }, readCache);
Sentry.startSpan({ name: "writeOrdersCache",      op: "file.write"   }, writeCache);
```

Full operation list: [develop.sentry.dev/sdk/performance/span-operations](https://develop.sentry.dev/sdk/performance/span-operations/#list-of-operations)

### Adding attributes

```typescript
// At creation time
await Sentry.startSpan(
  {
    name: "loadFeed",
    op: "http.client",
    attributes: {
      "feed.type": "following",
      "feed.page": 1,
      "feed.has_cache": false,
    },
  },
  loadFeed
);

// On an existing span
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("result.count", 42);
  span.setAttributes({ "filter.applied": true, "filter.type": "category" });
  span.updateName("loadFeed:following"); // rename mid-flight
}
```

### Span utilities

```typescript
// Get the currently active span
const activeSpan = Sentry.getActiveSpan();

// Get the root span (the transaction) from any span
const rootSpan = activeSpan ? Sentry.getRootSpan(activeSpan) : undefined;

// Explicitly set a span as the active parent for a block
const parent = Sentry.startInactiveSpan({ name: "parent" });
Sentry.withActiveSpan(parent, () => {
  Sentry.startSpan({ name: "child" }, () => { /* child attaches to parent */ });
});

// Create a root-level span regardless of current context
Sentry.withActiveSpan(null, () => {
  Sentry.startSpan({ name: "isolated" }, () => { /* no parent */ });
});

// Prevent a specific operation from creating spans
Sentry.suppressTracing(() => {
  fetch("https://analytics.internal/ping"); // no span created for this request
});
```

### Span hierarchy: flat vs. nested

By default (mobile and browser environments), all spans are flat children of the root transaction to avoid async parent misattribution:

```typescript
// Default behavior — both fetches become siblings under the root, not children of their span
await Sentry.startSpan({ name: "span1" }, async () => {
  await fetch("https://api.example.com/a"); // child of root transaction
});
await Sentry.startSpan({ name: "span2" }, async () => {
  await fetch("https://api.example.com/b"); // child of root transaction
});

// Opt into full nesting (may cause incorrect parent attribution with async/await)
Sentry.init({ parentSpanIsAlwaysRootSpan: false });
```

---

## 12. React Component Profiler

Track individual React component lifecycle (mount, update, unmount) as child spans within the current route transaction. Useful for identifying slow renders and unnecessary re-renders.

```typescript
import * as Sentry from "@sentry/react-native";

// Wrap any component with withProfiler
const ProductCard = Sentry.withProfiler(({ product }) => {
  return <View>{/* component content */}</View>;
});

// Or wrap the export
export default Sentry.withProfiler(HeavyListScreen);
```

Profiler spans show up in the transaction waterfall under `ui.react.render` and `ui.react.update` operations.

> **Production builds warning:** React Native minifies class/function names in production. Configure the Sentry Gradle/Xcode plugin + source maps to preserve component names in production profiler data. See the SDK [source maps guide](https://docs.sentry.io/platforms/react-native/sourcemaps/).

---

## 13. Profiling (Native + Hermes)

Profiling samples the call stack at regular intervals to surface hot code paths. Requires tracing to be enabled first — only traced transactions are profiled.

**Minimum SDK version:** `5.32.0`

### Basic setup

`profilesSampleRate` is **relative to `tracesSampleRate`** — a transaction must first be sampled for tracing before profiling applies:

```typescript
Sentry.init({
  dsn: "YOUR_DSN",

  tracesSampleRate: 1.0,    // 100% traced
  profilesSampleRate: 1.0,  // 100% of traced → 100% profiled (dev/testing only)

  // Production example:
  // tracesSampleRate: 0.2,    // 20% traced
  // profilesSampleRate: 0.5,  // 50% of those → 10% of all transactions profiled
});
```

### Hermes + native platform profilers

By default both layers are profiled simultaneously:

1. **Hermes profiler** — JavaScript code executing in the Hermes engine
2. **Platform profilers** — native code (Swift/ObjC on iOS, Kotlin/Java on Android)

Control with `hermesProfilingIntegration`:

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    Sentry.hermesProfilingIntegration({
      platformProfilers: true,  // default: true — profile native code alongside JS
      // Set false to profile ONLY JS (Hermes) without native code (SDK ≥ 5.33.0)
    }),
  ],
});
```

### UI Profiling (experimental)

Continuous profiling tied to the app lifecycle rather than individual transactions. Useful for catching performance issues that span multiple transactions.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,

  _experiments: {
    profilingOptions: {
      profileSessionSampleRate: 1.0,  // fraction of app sessions to profile
      lifecycle: "trace",             // "trace" = profile only during active transactions
      startOnAppStart: true,          // begin profiling from the very first frame
    },
  },
});
```

> `androidProfilingOptions` is **deprecated** — use `profilingOptions` inside `_experiments` instead.

### Profiling version requirements

| Feature | Min SDK | Platforms |
|---|---|---|
| `profilesSampleRate` (basic) | `5.32.0` | iOS, Android |
| `platformProfilers: false` | `5.33.0` | iOS, Android |
| UI Profiling (experimental) | `7.9.0` (Android) · `7.12.0` (iOS) | iOS, Android |

---

## 14. Dynamic Sampling

`tracesSampler` gives you full control over sampling based on transaction properties at the time the trace starts.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",

  tracesSampler: ({ name, attributes, parentSampled }) => {
    // Always sample critical user flows
    if (name === "checkout" || name === "PaymentScreen") {
      return 1.0;
    }

    // Never sample health checks
    if (name.includes("HealthCheck")) {
      return 0;
    }

    // Respect parent sampling decision for distributed traces
    // (keeps frontend + backend in the same trace or both dropped)
    if (parentSampled !== undefined) {
      return parentSampled ? 1.0 : 0;
    }

    // Default: sample 10%
    return 0.1;
  },
});
```

### Head-based vs. tail-based sampling

| Approach | How | Tradeoff |
|---|---|---|
| **Head-based** (`tracesSampleRate` / `tracesSampler`) | Decision made at trace start | Low overhead, but can't sample based on outcome |
| **Tail-based** (Sentry Dynamic Sampling rules) | Decision made server-side after trace completes | Can prioritize errors/slow traces, requires Sentry Business plan |

For most React Native apps, head-based sampling with a `tracesSampler` is sufficient.

---

## 15. Configuration Reference

### `Sentry.init` options

| Option | Type | Default | Description |
|---|---|---|---|
| `tracesSampleRate` | `number` (0–1) | `undefined` | Uniform transaction sample rate |
| `tracesSampler` | `function` | `undefined` | Dynamic sampler — overrides `tracesSampleRate` when set |
| `profilesSampleRate` | `number` (0–1) | `undefined` | Profile sample rate, relative to traced transactions |
| `tracePropagationTargets` | `(string \| RegExp)[]` | `[/.*/]` on mobile | URLs/patterns that receive `sentry-trace` + `baggage` headers |
| `enableUserInteractionTracing` | `boolean` | `false` | Capture touch interaction transactions |
| `enableAutoPerformanceTracing` | `boolean` | `true` | Master switch for all automatic instrumentation |
| `parentSpanIsAlwaysRootSpan` | `boolean` | `true` | Flat span hierarchy — safe for async/await contexts |

### `reactNativeTracingIntegration` options

| Option | Type | Default | Description |
|---|---|---|---|
| `beforeStartSpan` | `(context) => context` | — | Mutate span context before each navigation/pageload span |
| `shouldCreateSpanForRequest` | `(url) => boolean` | — | Filter which outgoing requests get a span |
| `idleTimeoutMs` | `number` | `1_000` | Ms of inactivity before ending the current transaction |
| `finalTimeoutMs` | `number` | `600_000` | Hard maximum duration for any single transaction |

### `reactNavigationIntegration` options

| Option | Type | Default | Description |
|---|---|---|---|
| `enableTimeToInitialDisplay` | `boolean` | `false` | Auto-measure TTID per screen |
| `routeChangeTimeoutMs` | `number` | `1_000` | Discard transaction if screen doesn't mount within this time |
| `ignoreEmptyBackNavigationTransactions` | `boolean` | `true` | Drop back-nav transactions with no child spans |
| `useDispatchedActionData` | `boolean` | `false` | Include navigation action data in transaction metadata |

### `reactNativeNavigationIntegration` options (Wix RNN)

| Option | Type | Default | Description |
|---|---|---|---|
| `navigation` | `Navigation` | **required** | The RNN Navigation object |
| `routeChangeTimeoutMs` | `number` | `1_000` | Discard stale transactions |
| `enableTabsInstrumentation` | `boolean` | `false` | Create transactions on tab switches |
| `ignoreEmptyBackNavigationTransactions` | `boolean` | `true` | Drop no-span back navigations |

### `hermesProfilingIntegration` options

| Option | Type | Default | Description |
|---|---|---|---|
| `platformProfilers` | `boolean` | `true` | Profile native (Swift/ObjC/Kotlin/Java) alongside Hermes JS |

---

## 16. Mobile vs Web: Feature Matrix

| Capability | Web SDK | React Native SDK |
|---|---|---|
| App cold start tracking | ❌ | ✅ `measurements.app_start_cold` |
| App warm start tracking | ❌ | ✅ `measurements.app_start_warm` |
| Slow frames (Mobile Vital) | ❌ | ✅ Auto (requires `reactNativeTracingIntegration`) |
| Frozen frames (Mobile Vital) | ❌ | ✅ Auto (requires `reactNativeTracingIntegration`) |
| JS event loop stall tracking | ❌ | ✅ Auto (3 metrics: count, longest, total) |
| Time to Initial Display (TTID) | ❌ | ✅ `enableTimeToInitialDisplay: true` |
| Time to Full Display (TTFD) | ❌ | ✅ `<Sentry.TimeToFullDisplay record={...} />` |
| Touch interaction tracing | ❌ | ✅ `enableUserInteractionTracing: true` |
| Gesture tracing (RNGH v2) | ❌ | ✅ `sentryTraceGesture()` |
| Hermes JS profiling | ❌ | ✅ `profilesSampleRate` + `hermesProfilingIntegration` |
| Native platform profiling | ❌ | ✅ `platformProfilers: true` |
| Navigation transactions | ✅ (SPA routers) | ✅ React Navigation · Expo Router · RNN |
| Network span tracing | ✅ | ✅ fetch + XHR auto-instrumented |
| Distributed tracing | ✅ | ✅ `tracePropagationTargets` |
| Web Vitals (LCP, FID, CLS) | ✅ | ❌ (replaced by Mobile Vitals) |

---

## 17. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| No transactions in Sentry | Tracing not enabled | Add `tracesSampleRate` > 0 and `reactNativeTracingIntegration()` to `integrations` |
| App Start span missing | `Sentry.wrap(App)` not used | Wrap root component: `export default Sentry.wrap(App)` |
| App Start time seems too long | Sentry follows platform vendor guidelines | Expected — Sentry measures the full user-perceptible start time, not internal JS init |
| Navigation transactions not created | Integration not registered | Call `navigationIntegration.registerNavigationContainer(ref)` inside `onReady`, not before |
| TTID/TTFD not appearing | Feature not enabled or wrong SDK version | Requires `enableTimeToInitialDisplay: true` and SDK ≥ 5.20.0, native build required |
| TTID not firing on tab screens | Tab screens are preloaded | Add `<Sentry.TimeToInitialDisplay record={true} />` explicitly to each tab screen |
| No interaction transactions | Missing `sentry-label` prop | Add `sentry-label="my_button"` to every interactive element you want to track |
| `sentry-trace` header missing from requests | `tracePropagationTargets` doesn't match URL | Check the full URL against your patterns — it matches against the entire URL string |
| Backend receives header but trace not linked | Backend SDK not initialized | Ensure your backend uses a Sentry SDK with distributed tracing support |
| Slow/frozen frames missing on Android | Missing `androidx.core` | Don't exclude `androidx.core` from the Sentry Android dependency |
| Profiling data not appearing | Profiling sample rate is 0 or traces not sampled | `profilesSampleRate` is relative to `tracesSampleRate` — both must be > 0 |
| Component names minified in profiler | Production bundle minification | Configure Sentry Gradle/Xcode plugins and upload source maps |
| Gesture spans not appearing | Wrong RNGH version | Only RNGH API v2 is supported — upgrade `react-native-gesture-handler` |
| Stall metrics missing | `reactNativeTracingIntegration` not added | Stall tracking requires the integration — add it to `integrations: []` |
| Transactions never finish | No idle timeout / long background spans | Adjust `idleTimeoutMs` in `reactNativeTracingIntegration` options |
