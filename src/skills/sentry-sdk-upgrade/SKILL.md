---
name: sentry-sdk-upgrade
description: Upgrade the Sentry JavaScript SDK across major versions. Use when asked to upgrade Sentry, migrate to a newer version, fix deprecated Sentry APIs, or resolve breaking changes after a Sentry version bump.
license: Apache-2.0
---

# Sentry JavaScript SDK Upgrade

Upgrade the Sentry JavaScript SDK across major versions with AI-guided migration.

## Phase 1: Detect

Identify the current Sentry SDK version, target version, and framework.

### 1.1 Read package.json

```bash
cat package.json | grep -E '"@sentry/' | head -20
```

Extract:
- All `@sentry/*` packages and their current versions
- The current major version (e.g., `7.x`, `8.x`, `9.x`)

### 1.2 Detect Framework

Check `package.json` dependencies for framework indicators:

| Dependency | Framework | Sentry Package |
|---|---|---|
| `next` | Next.js | `@sentry/nextjs` |
| `nuxt` or `@nuxt/kit` | Nuxt | `@sentry/nuxt` |
| `@sveltejs/kit` | SvelteKit | `@sentry/sveltekit` |
| `@remix-run/node` | Remix | `@sentry/remix` |
| `react` (no Next/Remix) | React SPA | `@sentry/react` |
| `@angular/core` | Angular | `@sentry/angular` |
| `vue` (no Nuxt) | Vue | `@sentry/vue` |
| `express` | Express | `@sentry/node` |
| `@nestjs/core` | NestJS | `@sentry/nestjs` |
| `@solidjs/start` | SolidStart | `@sentry/solidstart` |
| `astro` | Astro | `@sentry/astro` |
| `bun` types or runtime | Bun | `@sentry/bun` |
| `@cloudflare/workers-types` | Cloudflare | `@sentry/cloudflare` |
| None of above (Node.js) | Node.js | `@sentry/node` |

### 1.3 Find Sentry Config Files

```bash
grep -rn "from '@sentry/\|require('@sentry/" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" --include="*.cjs" -l
```

```bash
find . -name "sentry.*" -o -name "*.sentry.*" -o -name "instrumentation.*" | grep -v node_modules | grep -v .next | grep -v .nuxt
```

### 1.4 Detect Deprecated Patterns

Scan for patterns that indicate which migration steps are needed:

```bash
# v7 patterns (need v7→v8 migration)
grep -rn "from '@sentry/hub'\|from '@sentry/tracing'\|from '@sentry/integrations'\|from '@sentry/serverless'\|from '@sentry/replay'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -l
grep -rn "new BrowserTracing\|new Replay\|startTransaction\|configureScope\|Handlers\.requestHandler\|Handlers\.errorHandler" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -l

# v8 patterns (need v8→v9 migration)
grep -rn "from '@sentry/utils'\|from '@sentry/types'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -l
grep -rn "getCurrentHub\|enableTracing\|captureUserFeedback\|@WithSentry\|autoSessionTracking" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -l

# v9 patterns (need v9→v10 migration)
grep -rn "from '@sentry/types'" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -l
grep -rn "logger\.\(info\|log\|warn\|error\)" --include="*.ts" --include="*.js" -l   # internal @sentry/core logger, now `debug`
```

### 1.5 Determine Target Version

If the user has already bumped package versions but has broken code, detect the target from `package.json`.

If they didn't name a target, **find the current latest major before recommending one** — don't assume the newest version this skill happens to describe. Check the [Sentry JavaScript changelog](https://github.com/getsentry/sentry-javascript/blob/develop/CHANGELOG.md) or `npm view @sentry/core version`, then confirm the recommendation with the user.

## Phase 2: Recommend

Present a migration summary based on detected state.

### 2.1 Calculate Migration Path

- **Single hop**: e.g., v8 to v9
- **Multi-hop**: e.g., v7 to v9 (apply v7→v8 changes first, then v8→v9)

For multi-hop migrations, apply code changes incrementally but update package versions once to the final target.

### 2.2 Present Breaking Changes Summary

Load the reference for each hop in the path:
- v7→v8: [references/v7-to-v8.md](references/v7-to-v8.md)
- v8→v9: [references/v8-to-v9.md](references/v8-to-v9.md)
- v9→v10: [references/v9-to-v10.md](references/v9-to-v10.md)

**A reference can lag the SDK.** If the hop's reference says the target major isn't released yet, or covers less than the packages in `package.json` clearly need, treat it as incomplete: fetch the official migration guide at `https://docs.sentry.io/platforms/javascript/migration/` for that hop and work from it, telling the user which source you're using. Never present a hop as change-free just because its reference is thin.

Present a concrete summary of changes needed, categorized by complexity:

**Auto-fixable** (apply directly):
- Package import renames (e.g., `@sentry/utils` to `@sentry/core`)
- Simple method renames (e.g., `@WithSentry` to `@SentryExceptionCaptured`)
- Config option swaps (e.g., `enableTracing` to `tracesSampleRate`)

**AI-assisted** (explain and propose):
- Hub removal with variable storage patterns
- Performance API migration (transactions to spans)
- Complex config restructuring (Vue tracing options, Next.js config merging)
- Sampler `transactionContext` flattening

**Manual review** (flag for user):
- Removed APIs with no equivalent
- Behavioral changes (sampling, source maps defaults)
- Custom transport modifications

### 2.3 Confirm Scope

Ask the user:
- Confirm the migration path (e.g., "v8 to v9")
- Confirm whether to proceed with all changes or specific categories
- Note: `npx @sentry/wizard -i upgrade` exists as a CLI alternative for v8→v9 but may not handle all patterns

## Phase 3: Guide

Step through changes file by file.

### 3.1 Process Each File with Sentry Imports

For each file identified in Phase 1.3:

1. **Read the file** to understand current Sentry usage
2. **Apply auto-fixable changes** directly:
   - Package import renames
   - Method/function renames
   - Simple config option swaps
3. **For AI-assisted changes**, explain what needs to change and why, then propose the specific edit
4. **For uncertain changes**, show the code and ask the user to confirm

### 3.2 Apply Changes by Category

Work through changes in this order:

#### Step 1: Package Import Updates
Replace removed/renamed package imports. Reference the version-specific migration file for the complete mapping.

#### Step 2: API Renames
Apply mechanical method and function renames.

#### Step 3: Config Changes
Update `Sentry.init()` options and build configuration.

#### Step 4: Complex Pattern Migration
Handle patterns requiring understanding of context:
- Hub usage stored in variables
- Transaction-based performance code
- Custom integration classes
- Framework-specific wrappers

#### Step 5: Update package.json Versions

Update all `@sentry/*` packages to the target version. All packages must be on the same major version.

```bash
# Detect package manager
if [ -f "yarn.lock" ]; then
  echo "yarn"
elif [ -f "pnpm-lock.yaml" ]; then
  echo "pnpm"
else
  echo "npm"
fi
```

Install updated dependencies using the detected package manager.

#### Step 6: Verify Build

```bash
# Check for type errors
npx tsc --noEmit 2>&1 | head -50

# Run build
npm run build 2>&1 | tail -20
```

Fix any remaining type errors or build failures.

### 3.3 Framework-Specific Steps

Consult [references/upgrade-patterns.md](references/upgrade-patterns.md) for framework-specific config file locations and validation steps.

**Next.js**: Check `instrumentation.ts`, `next.config.ts` wrapper, both client and server configs.
**Nuxt**: Check Nuxt module config and both plugin files.
**SvelteKit**: Check hooks files and Vite config.
**Express/Node**: Verify early initialization order.
**NestJS**: Check for decorator and filter renames.

## Phase 4: Cross-Link

### 4.1 Verify

- [ ] All `@sentry/*` packages on same version
- [ ] No import errors from removed packages
- [ ] TypeScript compilation passes
- [ ] Build succeeds
- [ ] Tests pass (if they exist)

Suggest adding a test error:

```js
// Add temporarily to verify Sentry is working after upgrade
setTimeout(() => {
  throw new Error('Sentry upgrade verification - safe to delete');
}, 3000);
```

### 4.2 New Features in Target Version

Mention features available in the new version that the user might want to enable:

**v8 new features**: OpenTelemetry-based Node tracing, automatic database/HTTP instrumentation, functional integrations, new span APIs

**v9 new features**: Structured logging (`Sentry.logger.*`), improved source maps handling, simplified configuration

For a target this list doesn't cover, read the release notes for that major rather than leaving it out — the changelog link below is the source.

### 4.3 Related Resources

- [Migration guides, all hops](https://docs.sentry.io/platforms/javascript/migration/)
- [Sentry JavaScript SDK Changelog](https://github.com/getsentry/sentry-javascript/blob/develop/CHANGELOG.md)

## What "done" looks like

Every `@sentry/*` package is on the target major, the build and type-check pass, and Sentry has been confirmed still capturing after the upgrade — a test error from the running app **seen in Sentry**, not just a clean build. Any API removed with no equivalent has been named for the user rather than silently dropped.

If the user has other Sentry SDKs (Python, Ruby, Go, etc.) that also need upgrading, note that this skill covers JavaScript SDK only.
