# Sentry JavaScript SDK: v8 to v9 Migration Reference

v9 focuses on API cleanup: removing deprecated v8 APIs, package consolidation, and dropping support for older runtimes. This update contains behavioral changes not caught by type checkers.

Compatible with Sentry self-hosted 24.4.2+ (unchanged from v8).

## Version Support Changes

| Runtime | v8 | v9 |
|---|---|---|
| Node.js | 14.18+ | 18.0.0+ (ESM-only SDKs: 18.19.1+) |
| Browsers | ES2018+ | ES2020+ (Chrome 80, Edge 80, Safari 14, Firefox 74) |
| TypeScript | 4.9.3+ | 5.0.4+ |
| Deno | 1.x | 2.0.0+ |

### Framework Support Dropped

- **Remix** 1.x (minimum: 2.x)
- **TanStack Router** 1.63.0 and lower
- **SvelteKit** 1.x (minimum: 2.x)
- **Ember.js** 3.x and lower (minimum: 4.x)
- **Prisma** 5.x (default: 6.x, older via `prismaInstrumentation` option)

## Package Consolidation

| Removed Package | Replacement |
|---|---|
| `@sentry/utils` | `@sentry/core` (all exports moved) |
| `@sentry/types` | `@sentry/core` (deprecated, still published but won't be in next major) |

```diff
- import { something } from '@sentry/utils';
+ import { something } from '@sentry/core';
```

```diff
- import { SomeType } from '@sentry/types';
+ import { SomeType } from '@sentry/core';
```

## Removed APIs — All SDKs (`@sentry/core`)

### Hub Removal (Final)

`getCurrentHub()`, `Hub`, and `getCurrentHubShim()` are **fully removed** (were deprecated in v8).

| v8 (deprecated) | v9 |
|---|---|
| `getCurrentHub().captureException(e)` | `Sentry.captureException(e)` |
| `getCurrentHub().captureMessage(m)` | `Sentry.captureMessage(m)` |
| `getCurrentHub().captureEvent(e)` | `Sentry.captureEvent(e)` |
| `getCurrentHub().addBreadcrumb(b)` | `Sentry.addBreadcrumb(b)` |
| `getCurrentHub().setTag(k, v)` | `Sentry.getCurrentScope().setTag(k, v)` |
| `getCurrentHub().setExtra(k, v)` | `Sentry.getCurrentScope().setExtra(k, v)` |
| `getCurrentHub().setUser(u)` | `Sentry.setUser(u)` |
| `getCurrentHub().getClient()` | `Sentry.getClient()` |
| `getCurrentHub().getScope()` | `Sentry.getCurrentScope()` |

### Metrics API Removed

The Sentry metrics beta ended. The entire metrics API was removed from the SDK.

### `enableTracing` Option Removed

```diff
  Sentry.init({
-   enableTracing: true,
+   tracesSampleRate: 1,
  });
```

### `autoSessionTracking` Option Removed

To disable session tracking, remove `browserSessionIntegration` (browser) or configure `httpIntegration` with `trackIncomingRequestsAsSessions: false` (server).

### `transactionContext` Flattened in Samplers

```diff
  Sentry.init({
    tracesSampler: samplingContext => {
-     if (samplingContext.transactionContext.name === '/health-check') {
+     if (samplingContext.name === '/health-check') {
        return 0;
      }
      return 0.5;
    },
  });
```

Also applies to `profilesSampler`.

### Other Removed APIs

| Removed | Replacement |
|---|---|
| `addOpenTelemetryInstrumentation(inst)` | `Sentry.init({ openTelemetryInstrumentations: [inst] })` |
| `debugIntegration` | Use hook options (`beforeSend`, etc.) |
| `sessionTimingIntegration` | Use `Sentry.setContext()` |
| `generatePropagationContext()` | `generateTraceId()` |
| `IntegrationClass` type | `Integration` or `IntegrationFn` |
| `BAGGAGE_HEADER_NAME` | Use `"baggage"` string directly |
| `extractRequestData` | Manually extract request data |
| `addRequestDataToEvent` | Use `httpRequestToRequestData` |
| `DEFAULT_USER_INCLUDES` | No replacement |
| `SessionFlusher` | No replacement |

## Removed APIs — Browser (`@sentry/browser`)

| Removed | Replacement |
|---|---|
| `captureUserFeedback({ comments })` | `captureFeedback({ message })` |

```diff
- Sentry.captureUserFeedback({
-   event_id: eventId,
-   name: 'User',
-   email: 'user@example.com',
-   comments: 'Something broke',
- });
+ Sentry.captureFeedback({
+   name: 'User',
+   email: 'user@example.com',
+   message: 'Something broke',
+   associatedEventId: eventId,
+ });
```

## Removed APIs — Node (`@sentry/node`)

| Removed | Replacement |
|---|---|
| `nestIntegration` | Use `@sentry/nestjs` package |
| `setupNestErrorHandler` | Use `@sentry/nestjs` package |
| `registerEsmLoaderHooks` options | Only accepts `true \| false \| undefined` |

### Integration Renames

| v8 Name | v9 Name |
|---|---|
| `processThreadBreadcrumbIntegration` | `childProcessIntegration` |

### Behavior Changes

- `tracesSampler` no longer called for every span (only root spans).
- `requestDataIntegration` no longer auto-sets user from `request.user` in Express. Use `Sentry.setUser()` manually.
- `samplingContext.request` removed; use `samplingContext.normalizedRequest`.
- `skipOpenTelemetrySetup: true` now auto-configures `httpIntegration({ spans: false })`.

## Removed APIs — React (`@sentry/react`)

| Removed | Replacement |
|---|---|
| `wrapUseRoutes` | `wrapUseRoutesV6` or `wrapUseRoutesV7` |
| `wrapCreateBrowserRouter` | `wrapCreateBrowserRouterV6` or `wrapCreateBrowserRouterV7` |

## Removed APIs — NestJS (`@sentry/nestjs`)

| Removed | Replacement |
|---|---|
| `@WithSentry` decorator | `@SentryExceptionCaptured` |
| `SentryService` | Remove (no longer needed) |
| `SentryTracingInterceptor` | Remove (no longer needed) |
| `SentryGlobalGenericFilter` | `SentryGlobalFilter` |
| `SentryGlobalGraphQLFilter` | `SentryGlobalFilter` |

## Removed APIs — Vue (`@sentry/vue`)

Vue tracing options removed from `Sentry.init()`. Use `vueIntegration()` instead:

```diff
  Sentry.init({
-   tracingOptions: { trackComponents: true },
+   integrations: [
+     Sentry.vueIntegration({
+       tracingOptions: {
+         trackComponents: true,
+         timeout: 1000,
+         hooks: ['mount', 'update', 'unmount'],
+       },
+     }),
+   ],
  });
```

`logErrors` option removed from `vueIntegration` (error handler always propagates).

## Removed APIs — Nuxt (`@sentry/nuxt`)

- `tracingOptions` in `Sentry.init()` removed. Use `vueIntegration()`.
- `stateTransformer` in `piniaIntegration` now receives full state from all stores (top-level keys = store IDs).

## Removed APIs — Next.js (`@sentry/nextjs`)

| Removed | Notes |
|---|---|
| `hideSourceMaps` option | SDK emits hidden sourcemaps by default |
| `sentry` property in next config | Pass options to `withSentryConfig` directly |

Behavior changes:
- Client source maps auto-deleted after upload (opt out via `sourcemaps.deleteSourcemapsAfterUpload: false`).
- Next.js Build ID no longer used as release fallback. Set `release.name` manually if needed.
- Source maps auto-enabled for both client and server builds.

## Removed APIs — Other Frameworks

| Package | Removed | Replacement |
|---|---|---|
| `@sentry/remix` | `autoInstrumentRemix` option | Always behaves as `true` |
| `@sentry/sveltekit` | `fetchProxyScriptNonce` option | Use script hash in CSP or disable fetch proxy |
| `@sentry/solidstart` | `sentrySolidStartVite` | `withSentry()` wrapper |

## Behavior Changes — All SDKs

- `beforeSendSpan`: Cannot return `null` (dropping spans). Now also receives root spans.
- `startSpan` with custom `scope`: Scope is now cloned (was set directly in v8 for non-Node SDKs).
- `tracesSampleRate: undefined` now defers sampling to downstream SDKs.
- `captureConsoleIntegration` with `attachStackTrace: true`: Console messages now `handled: true`.
- Browser SDK no longer instructs backend to infer IP by default. Set `sendDefaultPii: true` to restore.

## Behavior Changes — Vue/Nuxt

- Component tracking "update" spans no longer created by default. Add `'update'` to `tracingOptions.hooks` to restore.

## Type Changes

- `Scope` usages now require `Scope` instances (not interface-compatible objects).
- `Client` usages now require `BaseClient` instances. Abstract `Client` class removed.

## Grep Patterns to Find v8 Code Needing Updates

```bash
# Package imports that need updating
grep -rn "from '@sentry/utils'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "from '@sentry/types'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Hub usage (fully removed)
grep -rn "getCurrentHub\|getCurrentHubShim\|new Hub(" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Removed options
grep -rn "enableTracing\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "autoSessionTracking\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "hideSourceMaps\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "autoInstrumentRemix\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Removed methods
grep -rn "captureUserFeedback\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "addOpenTelemetryInstrumentation\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "transactionContext\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Method renames
grep -rn "@WithSentry\b" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "SentryGlobalGenericFilter\|SentryGlobalGraphQLFilter" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "wrapUseRoutes[^V]" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "wrapCreateBrowserRouter[^V]" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
grep -rn "processThreadBreadcrumbIntegration" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Metrics API (removed)
grep -rn "Sentry\.metrics\." --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"

# Vue/Nuxt tracing options at init level
grep -rn "tracingOptions.*trackComponents\|trackComponents.*true" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"
```

## Migration Complexity Rating

| Category | Complexity | Notes |
|---|---|---|
| Package consolidation (`utils`/`types` to `core`) | Low | Mechanical import replacement |
| Hub removal | Medium | Depends on how deeply Hub was used; variable storage patterns require manual review |
| `enableTracing` removal | Low | Simple option swap |
| Method renames | Low | Mechanical find-and-replace |
| React Router wrappers | Low | Version-specific rename |
| NestJS decorator rename | Low | Simple rename |
| Vue tracing options restructure | Medium | Requires restructuring init config |
| `captureUserFeedback` to `captureFeedback` | Low | Field rename (`comments` to `message`) |
| Next.js source maps behavior | Low | Understand new defaults |
| Behavioral changes (`beforeSendSpan`, sampling) | Medium | Review existing hooks for compatibility |
