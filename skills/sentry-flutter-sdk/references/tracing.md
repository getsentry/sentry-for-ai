# Tracing & Performance — Flutter SDK Reference

> **Minimum SDK version:** `sentry_flutter` ≥ 9.1.0 (routing TTID/TTFD), ≥ 6.17.0 (user interaction tracing)
> **Platforms:** Most features — all platforms. Platform-specific caveats noted per feature.

## Setup

Enable tracing by setting `tracesSampleRate` in `SentryFlutter.init()`:

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_SENTRY_DSN';

    // Option A: Uniform sample rate (use 1.0 during development)
    options.tracesSampleRate = 1.0;

    // Option B: Dynamic sampler (takes precedence over tracesSampleRate)
    options.tracesSampler = (samplingContext) {
      final name = samplingContext.transactionContext?.name ?? '';
      if (name.contains('checkout')) return 1.0; // always trace checkout
      if (name.contains('health')) return 0.0;   // never trace health checks
      return 0.1;                                 // 10% of everything else
    };
  },
  appRunner: () => runApp(SentryWidget(child: MyApp())),
);
```

**Sampling precedence** (highest to lowest):
1. Explicit `sampled: true/false` on the transaction
2. `tracesSampler` return value
3. Parent transaction sampling decision (distributed tracing)
4. `tracesSampleRate` static value

---

## Navigation Instrumentation

Add `SentryNavigatorObserver` to automatically create a transaction per screen with Time to Initial Display (TTID) spans:

### Standard MaterialApp / CupertinoApp

```dart
import 'package:sentry_flutter/sentry_flutter.dart';

MaterialApp(
  navigatorObservers: [
    SentryNavigatorObserver(
      // Auto-finish idle transactions after this duration (default: 3s)
      autoFinishAfter: const Duration(seconds: 3),
      // Routes to exclude from tracking (default: [])
      ignoreRoutes: ['/splash', '/loading'],
      // Use route name as the Sentry transaction name (default: false)
      setRouteNameAsTransaction: false,
    ),
  ],
  routes: {
    '/': (context) => HomeScreen(),
    '/profile': (context) => ProfileScreen(),
  },
)

// For anonymous routes — always provide a name:
Navigator.push(
  context,
  MaterialPageRoute(
    settings: const RouteSettings(name: 'ProductDetail'), // REQUIRED
    builder: (context) => ProductDetailScreen(),
  ),
);
```

> ⚠️ Routes **must have names** for TTID/TTFD spans and navigation breadcrumbs to be created. Unnamed routes show as `null` in Sentry.

### GoRouter

```dart
import 'package:go_router/go_router.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

final GoRouter router = GoRouter(
  observers: [SentryNavigatorObserver()],
  routes: [
    GoRoute(
      path: '/',
      name: 'home',       // name is REQUIRED
      builder: (context, state) => const HomeScreen(),
      routes: [
        GoRoute(
          path: 'profile/:id',
          name: 'profile', // name is REQUIRED
          builder: (context, state) => ProfileScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ],
    ),
  ],
);
```

> **Known limitation:** GoRouter does not propagate navigator observers across same-level tab transitions. Bottom-tab navigation events may not be tracked.

### Auto Route (Community Pattern)

```dart
import 'package:auto_route/auto_route.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

MaterialApp.router(
  routerConfig: _router.config(
    navigatorObservers: () => [SentryNavigatorObserver()],
  ),
)
```

> **Known limitation:** Tab-based nested navigation is not captured (tracked issue getsentry/sentry-dart#2123).

---

## Time to Full Display (TTFD)

TTID (Time to Initial Display) is **always enabled** — measures to the first rendered frame. TTFD measures to when your screen is fully ready (data loaded, async work done). TTFD is **opt-in**:

```dart
// Enable in options
options.enableTimeToFullDisplayTracing = true;
```

Then report when the screen is fully ready:

```dart
// Option 1: Widget wrapper (marks TTFD when child's build() completes)
// For StatelessWidget — TTFD is auto-reported when build() returns.
// For StatefulWidget — call reportFullyDisplayed() manually in a wrapper:
Navigator.push(
  context,
  MaterialPageRoute(
    settings: const RouteSettings(name: 'ProductScreen'),
    builder: (context) => SentryDisplayWidget(child: ProductScreen()),
  ),
);

// Inside ProductScreen (StatefulWidget):
@override
void initState() {
  super.initState();
  _loadData().then((_) {
    if (mounted) {
      SentryDisplayWidget.of(context).reportFullyDisplayed();
    }
  });
}

// Option 2: Direct API call (from anywhere in the widget)
await _loadData();
SentryFlutter.currentDisplay()?.reportFullyDisplayed();
```

TTFD auto-expires at **30 seconds** with `SpanStatus.DEADLINE_EXCEEDED` if `reportFullyDisplayed()` is never called.

---

## User Interaction Tracing

Automatically creates transactions for taps, clicks, and long presses. Requires `SentryWidget` at the root:

```dart
appRunner: () => runApp(SentryWidget(child: MyApp()))
```

Widgets **must have a `Key`** to be tracked:

```dart
ElevatedButton(
  key: const Key('submit_payment_button'), // REQUIRED for tracking
  onPressed: _submitPayment,
  child: const Text('Pay Now'),
)
```

Transactions are named `ButtonWidget key[submit_payment_button]` with operation `ui.action.click`. Empty transactions (no child spans within `idleTimeout`) are silently dropped.

Configuration:

```dart
options.enableUserInteractionTracing = true;    // default: true
options.enableUserInteractionBreadcrumbs = true; // default: true
options.sendDefaultPii = false;                  // set true to include widget text as labels
options.idleTimeout = const Duration(milliseconds: 3000); // default
```

---

## HTTP Tracing

### Standard `http` package (built into `sentry_flutter`)

```dart
import 'package:sentry/sentry.dart';

// Wrap any active transaction with an HTTP client for automatic spans
final transaction = Sentry.startTransaction('api-call', 'request', bindToScope: true);

final client = SentryHttpClient(
  captureFailedRequests: true,
  failedRequestStatusCodes: [SentryStatusCode.range(400, 599)],
  failedRequestTargets: ['api.example.com'],
);

try {
  final response = await client.get(Uri.parse('https://api.example.com/users'));
} finally {
  client.close();
  await transaction.finish(status: SpanStatus.ok());
}
```

### Dio (`sentry_dio`)

`dio.addSentry()` **must be the last step** in Dio setup:

```dart
import 'package:sentry_dio/sentry_dio.dart';

final dio = Dio();
dio.interceptors.add(MyAuthInterceptor()); // your interceptors first
dio.addSentry(                             // addSentry() always last
  captureFailedRequests: true,
  failedRequestStatusCodes: [SentryStatusCode.range(400, 599)],
);

// Spans only appear if a transaction is on scope
final transaction = Sentry.startTransaction('api-work', 'request', bindToScope: true);
await dio.get('https://api.example.com/products');
await transaction.finish(status: SpanStatus.ok());
```

### Distributed Tracing

Propagate trace context to your backend (links mobile spans to server spans in the waterfall view):

```dart
options.tracePropagationTargets = ['api.myapp.com', 'localhost'];
options.propagateTraceparent = true; // also send W3C traceparent header (SDK ≥9.7.0)
```

---

## App Start Instrumentation

**Platforms: iOS and Android only.** Automatically enabled — no config needed.

Measures from earliest native process init to first Flutter frame. Creates:
- `ui.load` transaction
- `app.start.cold` or `app.start.warm` span

> ⚠️ Does not work accurately in Flutter add-to-app scenarios.

Disable if needed:

```dart
import 'package:sentry_flutter/src/integrations/native_app_start_integration.dart';

options.integrations.removeWhere((i) => i is NativeAppStartIntegration);
```

---

## Slow and Frozen Frames

**Platforms: iOS, Android, macOS.** Auto-enabled when Sentry initializes before `WidgetsFlutterBinding`.

Thresholds:
- **Slow frame:** > 16ms render time (misses 60 FPS target)
- **Frozen frame:** > 700ms render time

If you need to call `WidgetsFlutterBinding.ensureInitialized()` before Sentry (e.g., for plugin setup), use:

```dart
// Replace WidgetsFlutterBinding.ensureInitialized() with:
SentryWidgetsFlutterBinding.ensureInitialized();
```

Disable:

```dart
options.enableFramesTracking = false;
```

---

## Custom Instrumentation

### Manual Transaction

```dart
final transaction = Sentry.startTransaction(
  'processOrderBatch()',  // name
  'task',                 // operation
  bindToScope: true,      // links auto-captured errors to this transaction
);

try {
  await processOrderBatch();
  transaction.status = const SpanStatus.ok();
} catch (exception, stackTrace) {
  transaction.throwable = exception;
  transaction.status = const SpanStatus.internalError();
  await Sentry.captureException(exception, stackTrace: stackTrace);
} finally {
  await transaction.finish();
}
```

### Nested Spans

```dart
final span = Sentry.getSpan()?.startChild(
  'db.query',
  description: 'SELECT * FROM orders WHERE user_id = ?',
) ?? Sentry.startTransaction('fallback', 'task', bindToScope: true);

try {
  final orders = await db.getOrdersForUser(userId);
  span.status = const SpanStatus.ok();
  return orders;
} catch (e, st) {
  span.throwable = e;
  span.status = const SpanStatus.notFound();
  rethrow;
} finally {
  await span.finish();
}
```

### Attach Data to Spans

```dart
transaction.setData('user_id', userId);
transaction.setData('items_count', 42);
transaction.setData('currency', 'USD');
// Supported types: String, int, double, bool, List
```

### Dynamic Sampling with Context

```dart
final transaction = Sentry.startTransaction(
  'processPayment()',
  'task',
  customSamplingContext: {
    'payment.amount': amount,
    'payment.currency': currency,
    'user.tier': userTier,
  },
);

// In tracesSampler:
options.tracesSampler = (ctx) {
  final tier = ctx.customSamplingContext?['user.tier'];
  if (tier == 'enterprise') return 1.0; // always trace enterprise
  return 0.1;
};
```

---

## Database Tracing

All DB integrations require an **active transaction on scope** to generate spans.

### sqflite (`sentry_sqflite`) — Android, iOS, macOS only

```dart
import 'package:sentry_sqflite/sentry_sqflite.dart';

// Global: instruments ALL databases
databaseFactory = SentrySqfliteDatabaseFactory();

// Per-database (recommended)
final db = await openDatabaseWithSentry('my.db');
```

### Drift (`sentry_drift`) — All platforms

```dart
import 'package:sentry_drift/sentry_drift.dart';

final executor = driftDatabase(name: 'app').interceptWith(
  SentryQueryInterceptor(databaseName: 'app'),
);
final db = AppDatabase(executor);
```

### Hive (`sentry_hive`) — All platforms

```dart
import 'package:sentry_hive/sentry_hive.dart';

// Use SentryHive instead of Hive
SentryHive.init(appDir.path);
final box = await SentryHive.openBox<Person>('people');
```

### Isar (`sentry_isar`) — Android, iOS, macOS, Linux, Windows (no Web)

```dart
import 'package:sentry_isar/sentry_isar.dart';

// Use SentryIsar.open() instead of Isar.open()
final isar = await SentryIsar.open([UserSchema], directory: dir.path);
```

---

## Asset Bundle Instrumentation

Traces asset loading in your app (built into `sentry_flutter`):

```dart
runApp(
  DefaultAssetBundle(
    bundle: SentryAssetBundle(enableStructuredDataTracing: true),
    child: MyApp(),
  ),
)
```

---

## Production Configuration

```dart
final isProduction = const bool.fromEnvironment('dart.vm.product');

await SentryFlutter.init(
  (options) {
    options.dsn = const String.fromEnvironment('SENTRY_DSN');

    // 10% sampling in production, 100% in dev
    options.tracesSampleRate = isProduction ? 0.1 : 1.0;

    // Trace all checkout flows, drop health checks
    options.tracesSampler = (ctx) {
      final name = ctx.transactionContext?.name ?? '';
      if (name.contains('checkout') || name.contains('payment')) return 1.0;
      if (name.contains('health') || name.contains('ping')) return 0.0;
      return isProduction ? 0.1 : 1.0;
    };

    // Connect traces to backend
    options.tracePropagationTargets = ['api.myapp.com'];
  },
  appRunner: () => runApp(SentryWidget(child: MyApp())),
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Sentry | Confirm `tracesSampleRate > 0`; set to `1.0` to see all during debugging |
| Navigation not tracked | Add `SentryNavigatorObserver()` to `navigatorObservers`; name all routes |
| TTID/TTFD spans missing | SDK ≥ 9.1.0 required; routes must have names |
| TTFD never reports | Call `SentryFlutter.currentDisplay()?.reportFullyDisplayed()` or use `SentryDisplayWidget` |
| GoRouter tabs not tracked | Known Flutter limitation — tab transitions don't trigger standard navigator callbacks |
| User interaction transactions empty | Widget must have a `Key`; spans need child work before `idleTimeout` |
| Dio spans not appearing | Confirm `bindToScope: true` on the parent transaction; `dio.addSentry()` must be last |
| HTTP spans not appearing | Wrap requests with a scope-bound transaction; `SentryHttpClient` only creates spans in a transaction context |
| App start metrics missing | iOS/Android only; not available in add-to-app; disable with `NativeAppStartIntegration` removal |
| Slow/frozen frames not tracked | Sentry must init before `WidgetsFlutterBinding`; use `SentryWidgetsFlutterBinding.ensureInitialized()` |
| `tracesSampler` not being called | Only called once per transaction creation — check that transactions are being started |
| gRPC requests slow on Windows | Known issue (getsentry/sentry-dart#2760) — `startTransaction` overhead; avoid or use async span creation |
| Too many transactions in dashboard | Lower `tracesSampleRate` or use `tracesSampler` to drop noisy endpoints |
