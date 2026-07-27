# Sentry JavaScript SDK: v9 to v10 Migration Reference

> **This reference is incomplete.** It was written before v10 shipped and still
> only covers the v9 deprecations below. v10 has since been released — the SDK
> references in this repo document `@sentry/node` 10.61+ — so its full set of
> breaking changes is not captured here.
>
> **When migrating to v10, work from the official guide** at
> https://docs.sentry.io/platforms/javascript/migration/ and the
> [changelog](https://github.com/getsentry/sentry-javascript/blob/develop/CHANGELOG.md),
> and treat what follows as a starting checklist rather than the whole migration.

## Known v9 Deprecations (removed in or after v10)

These were deprecated in v9 and will likely be removed in v10:

| Deprecated | Replacement |
|---|---|
| `logger` export from `@sentry/core` (internal SDK logger) | `debug` export (`debug.log`, `debug.warn`, `debug.error`) |
| `@sentry/types` package | `@sentry/core` (all types available there) |

```diff
- import { logger } from '@sentry/core';
- logger.info('message');
+ import { debug } from '@sentry/core';
+ debug.log('message');
```

Rename only the binding imported from `@sentry/core` and its call sites in that
file. `Sentry.logger.*` — the public structured logging API added in v9 — keeps
its name, and so does any application logger that happens to be called `logger`.

## Preparation

Before the hop:
1. Upgrade to latest v9
2. Fix all deprecation warnings
3. Replace `@sentry/types` imports with `@sentry/core`
4. Replace internal `logger` usage with `debug`

## Populating this reference

Bring it in line with the shipped v10 by recording, from the official migration
guide and changelog: version support changes, removed APIs, behavioral changes,
package changes, and grep patterns that detect each one — then drop the warning
at the top.
