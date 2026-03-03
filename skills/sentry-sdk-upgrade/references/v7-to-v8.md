# Sentry JavaScript SDK: v7 to v8 Migration Reference

This is the largest migration. v8 overhauled performance monitoring APIs, moved to OpenTelemetry, removed deprecated packages, and switched integrations from classes to functions.

Recommend upgrading to latest v7 first and removing deprecated v7 APIs before jumping to v8.

## Version Support Changes

| Runtime | v7 | v8 |
|---|---|---|
| Node.js (CJS) | 8+ | 14.18+ |
| Node.js (ESM) | 8+ | 18.19.1+ |
| Browsers | IE11+ | ES2018+ (Chrome 71, Edge 79, Safari 12.1, Firefox 65) |
| Next.js | 10+ | 13.2.0+ |
| Angular | 12+ | 14+ |
| React | 15+ | 16+ |

## Package Removals

These packages were removed entirely in v8. Update imports accordingly.

| Removed Package | Replacement | Notes |
|---|---|---|
| `@sentry/hub` | `@sentry/core` | All exports moved to `@sentry/core` |
| `@sentry/tracing` | Direct SDK imports | See browser/node sections below |
| `@sentry/integrations` | `@sentry/browser` or `@sentry/node` | Integrations are now functions, not classes |
| `@sentry/serverless` | `@sentry/aws-serverless` or `@sentry/google-cloud-serverless` | Split into two packages |
| `@sentry/replay` | `@sentry/browser` | Import `replayIntegration` from browser SDK |
| `@sentry/angular-ivy` | `@sentry/angular` | Angular package now supports Ivy by default |

### `@sentry/tracing` Removal

**Browser** - Replace `BrowserTracing` class with `browserTracingIntegration()` function:

```diff
- import { BrowserTracing } from '@sentry/tracing';
  import * as Sentry from '@sentry/browser';

  Sentry.init({
    dsn: '__DSN__',
    tracesSampleRate: 1.0,
-   integrations: [new BrowserTracing()],
+   integrations: [Sentry.browserTracingIntegration()],
  });
```

**Node** - Simply remove the `@sentry/tracing` import:

```diff
  const Sentry = require('@sentry/node');
- require('@sentry/tracing');

  Sentry.init({
    dsn: '__DSN__',
    tracesSampleRate: 1.0,
  });
```

### `@sentry/integrations` Removal

All integrations moved to `@sentry/browser` or `@sentry/node` and became functions:

| Old (v7) | New (v8) | Available In |
|---|---|---|
| `new CaptureConsole()` | `captureConsoleIntegration()` | browser + node |
| `new Debug()` | `debugIntegration()` | browser + node |
| `new ExtraErrorData()` | `extraErrorDataIntegration()` | browser + node |
| `new RewriteFrames()` | `rewriteFramesIntegration()` | browser + node |
| `new SessionTiming()` | `sessionTimingIntegration()` | browser + node |
| `new Dedupe()` | `dedupeIntegration()` | browser + node (default) |
| `new HTTPClient()` | `httpClientIntegration()` | browser |
| `new ContextLines()` | `contextLinesIntegration()` | browser |
| `new ReportingObserver()` | `reportingObserverIntegration()` | browser |

### `@sentry/serverless` Removal

```diff
- const Sentry = require('@sentry/serverless');
- Sentry.AWSLambda.init({ dsn: '__DSN__' });
+ const Sentry = require('@sentry/aws-serverless');
+ Sentry.init({ dsn: '__DSN__' });
```

```diff
- const Sentry = require('@sentry/serverless');
- Sentry.GCPFunction.init({ dsn: '__DSN__' });
+ const Sentry = require('@sentry/google-cloud-serverless');
+ Sentry.init({ dsn: '__DSN__' });
```

## Integration API Overhaul

All integrations changed from classes to functions:

```diff
- integrations: [new Sentry.Replay()]
+ integrations: [Sentry.replayIntegration()]
```

```diff
- integrations: [new Sentry.BrowserTracing()]
+ integrations: [Sentry.browserTracingIntegration()]
```

Accessing integrations changed:

```diff
- const replay = Sentry.getIntegration(Replay);
+ const replay = Sentry.getClient().getIntegrationByName('Replay');
```

## Performance Monitoring API Changes

The transaction-based API was replaced with OpenTelemetry-aligned span API:

```diff
- const transaction = Sentry.startTransaction({ name: 'my-transaction' });
- const span = transaction.startChild({ op: 'task' });
- span.finish();
- transaction.finish();
+ const result = Sentry.startSpan({ name: 'my-transaction' }, () => {
+   return Sentry.startSpan({ name: 'task', op: 'task' }, () => {
+     return doWork();
+   });
+ });
```

New span APIs:
- `Sentry.startSpan()` - Active span with callback (recommended)
- `Sentry.startInactiveSpan()` - Inactive span without callback
- `Sentry.startSpanManual()` - Manual span end control

Removed: `startTransaction`, `span.startChild`, `scope.getSpan`, `scope.setSpan`, `getActiveTransaction`

## Scope API Changes

| Removed (v7) | Replacement (v8) |
|---|---|
| `Sentry.configureScope(cb)` | `Sentry.getCurrentScope().setTag(...)` directly |
| `addGlobalEventProcessor(fn)` | `Sentry.getGlobalScope().addEventProcessor(fn)` |
| `runWithAsyncContext(fn)` | `Sentry.withIsolationScope(fn)` |
| `makeMain(hub)` | Removed, use new init patterns |
| `pushScope()` / `popScope()` | `Sentry.withScope(fn)` |

## Hub Deprecation

In v8, `Hub` and `getCurrentHub()` still exist but are deprecated (fully removed in v9):

```diff
- const hub = Sentry.getCurrentHub();
- hub.captureException(error);
+ Sentry.captureException(error);
```

## Config Option Changes

| Removed Option | Replacement |
|---|---|
| `tracingOrigins` | `tracePropagationTargets` (moved to `Sentry.init()`) |
| `interactionsSampleRate` | Use `tracesSampler` to filter by `sentry.op` |
| `Severity` enum | `SeverityLevel` type (use string literals) |
| `metricsAggregator` experiment | Metrics now work without configuration |

## Node.js SDK Initialization Changes

v8 Node SDK uses OpenTelemetry, requiring early initialization. SDK must be initialized before other imports:

```js
// Must be the first import
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: '__DSN__',
  tracesSampleRate: 1.0,
});

// Other imports after Sentry.init()
import express from 'express';
```

## Express/Connect Handler Changes

```diff
- Sentry.Handlers.requestHandler()
- Sentry.Handlers.tracingHandler()
- Sentry.Handlers.errorHandler()
+ Sentry.setupExpressErrorHandler(app)  // Only error handler needed
```

```diff
- Sentry.Handlers.trpcMiddleware()
+ Sentry.trpcMiddleware()
```

## Next.js Specific Changes

- `withSentryConfig` now takes 2 args (not 3). Plugin options and SDK options merged into second arg.
- `sentry` property in `next.config.js` removed. Use `withSentryConfig` second arg.
- New `instrumentation.ts` file required for server-side initialization.
- `transpileClientSDK` option removed (IE11 no longer supported).
- Removed: `nextRouterInstrumentation`, `withSentryApi`, `withSentryGetServerSideProps`, etc.

## SvelteKit Specific Changes

- `@sentry/vite-plugin` upgraded from 0.x to 2.x
- `sourceMapsUploadOptions` restructured (release/sourcemaps nested objects)

## Other Removed APIs

| Removed | Replacement |
|---|---|
| `spanStatusfromHttpCode` | `getSpanStatusFromHttpCode` |
| `Span` class export | No longer exported (internal `SentrySpan`) |
| `enableAnrDetection` / `Anr` class | Use `anrIntegration()` |
| `deepReadDirSync` | No replacement |
| `Apollo` integration | Automatic via `graphqlIntegration` |
| `Offline` integration | Use offline transport wrapper |
| `makeXHRTransport` | Use `makeFetchTransport` |
| `wrap` method | No replacement |

## Grep Patterns to Find v7 Code

```bash
# Package imports that need updating
grep -rn "from '@sentry/hub'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/tracing'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/integrations'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/serverless'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/replay'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/angular-ivy'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Deprecated API usage
grep -rn "new BrowserTracing\|new Replay\|new Integrations\." --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "startTransaction\|\.startChild\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "configureScope\|getCurrentHub\|addGlobalEventProcessor" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "Handlers\.requestHandler\|Handlers\.tracingHandler\|Handlers\.errorHandler" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "tracingOrigins" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "Severity\." --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
```

## Migration Complexity Rating

| Category | Complexity | Notes |
|---|---|---|
| Package renames | Low | Mechanical find-and-replace |
| Integration class → function | Low | Mechanical pattern change |
| Performance API overhaul | High | Requires understanding new span model |
| Hub → Scope API | Medium | Pattern-dependent complexity |
| Node.js early init | Medium | Requires restructuring imports |
| Next.js changes | Medium | Config restructuring + instrumentation file |
| Express handler changes | Low | Simplified API |
