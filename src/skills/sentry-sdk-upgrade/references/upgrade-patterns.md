# Sentry SDK Upgrade — General Patterns

Version-agnostic guidance for upgrading the Sentry JavaScript SDK across any major version.

## Finding Sentry Code in a Project

### Grep for All Sentry Imports

```bash
grep -rn "from '@sentry/\|require('@sentry/" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.mjs" --include="*.cjs"
```

### Find Sentry Config Files

```bash
# Common config file patterns
find . -name "sentry.*" -o -name "*.sentry.*" -o -name "instrumentation.*" | grep -v node_modules | grep -v .next
```

### Check Current Sentry Version

```bash
# npm/yarn
cat package.json | grep -E '"@sentry/' | head -20

# Actual installed version
ls node_modules/@sentry/*/package.json 2>/dev/null | head -5 | xargs -I{} sh -c 'echo "--- {} ---" && grep "\"version\"" {}'
```

## Common Config File Locations by Framework

| Framework | Client Config | Server Config | Build Config | Other |
|---|---|---|---|---|
| **Next.js** | `instrumentation-client.ts` | `sentry.server.config.ts` | `next.config.ts` (wrapped with `withSentryConfig`) | `instrumentation.ts`, `sentry.edge.config.ts` |
| **Nuxt** | `sentry.client.config.ts` | `sentry.server.config.ts` | `nuxt.config.ts` | — |
| **SvelteKit** | `src/hooks.client.ts` | `src/hooks.server.ts` | `vite.config.ts` | — |
| **Remix** | `entry.client.tsx` | `entry.server.tsx` | — | — |
| **React (SPA)** | `src/index.tsx` or `src/main.tsx` | — | — | — |
| **Angular** | `src/main.ts` | — | — | — |
| **Vue** | `src/main.ts` | — | — | — |
| **Express/Node** | — | `app.ts` or `server.ts` | — | `instrument.ts` |
| **NestJS** | — | `main.ts` | — | `instrument.ts` |
| **Astro** | `astro.config.mjs` | — | — | — |

## Package Manager Commands for Version Bumps

### npm

```bash
# Upgrade all @sentry packages to latest
npm install @sentry/browser@latest @sentry/node@latest  # list all packages

# Or use npm-check-updates
npx npm-check-updates -f '@sentry/*' -u && npm install
```

### yarn

```bash
# Upgrade all @sentry packages
yarn add @sentry/browser@latest @sentry/node@latest  # list all packages

# Or use yarn upgrade-interactive
yarn upgrade-interactive --latest
```

### pnpm

```bash
# Upgrade all @sentry packages
pnpm update @sentry/browser@latest @sentry/node@latest  # list all packages

# Or update all Sentry packages at once
pnpm update '@sentry/*' --latest
```

## Validation Steps After Upgrade

### 1. Install Dependencies

```bash
# Remove lockfile and node_modules for clean install (if needed)
rm -rf node_modules
npm install  # or yarn / pnpm install
```

### 2. Check for Type Errors

```bash
npx tsc --noEmit
```

### 3. Run Tests

```bash
npm test  # or yarn test / pnpm test
```

### 4. Build the Project

```bash
npm run build  # or yarn build / pnpm build
```

### 5. Verify Sentry Is Working

Add a test error to verify events reach Sentry:

```js
// Temporarily add to any entry point
setTimeout(() => {
  throw new Error('Sentry SDK upgrade test - safe to delete');
}, 3000);
```

Check the Sentry dashboard for the test error, then remove it.

## Framework-Specific Upgrade Considerations

### Next.js

- Check both client and server Sentry configs
- Verify `withSentryConfig` wrapper in `next.config.ts`
- Ensure `instrumentation.ts` exists and loads Sentry server config
- Test both dev and production builds (`next dev` and `next build`)
- Check source maps upload in production build output

### Nuxt

- Sentry module config in `nuxt.config.ts` may need updating
- Check both client and server plugin files
- Verify source maps configuration

### SvelteKit

- Check `sentryHandle()` in hooks files
- Verify Vite plugin configuration
- Check `sentryHandleError()` setup

### React (SPA)

- Verify browser tracing integration
- Check React Router integration version compatibility
- Test error boundary components

### Express/Node

- Ensure Sentry is initialized before other imports (v8+)
- Verify error handler placement (`setupExpressErrorHandler`)
- Check custom middleware for Sentry scope usage

### NestJS

- Verify `@sentry/nestjs` package (moved from `@sentry/node` in v9)
- Check decorators and filters for renames
- Remove deprecated `SentryService` and `SentryTracingInterceptor`

## Multi-Hop Migrations

When upgrading across multiple major versions (e.g., v7 to v9):

1. **Upgrade one major version at a time** — apply v7→v8 changes, verify, then v8→v9
2. **Update package versions once** — bump to the final target version but apply code changes incrementally
3. **Use the version-specific grep patterns** to find code needing changes at each step
4. **Test after each logical migration step** — don't wait until all changes are made

## Common Pitfalls

| Pitfall | Solution |
|---|---|
| Forgetting to update all `@sentry/*` packages to same version | Use package manager bulk update commands |
| Missing type errors because TypeScript is too old | Check minimum TypeScript version for target SDK version |
| Build works but runtime errors | Test with actual requests/errors, not just build |
| Source maps broken after upgrade | Check `sourcemaps` config options changed between versions |
| Node SDK not capturing server errors | Verify early initialization (must be first import in v8+) |
| Next.js missing server-side errors | Verify `instrumentation.ts` file exists and is configured |
