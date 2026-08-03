# Source maps — JavaScript / TypeScript

Applies to browser, Node, and every JS framework SDK. The per-framework plugin config lives in that
platform's `sdks/<slug>/index.md`; this file covers what the build has to produce, the CI-friendly
fallback, and the traps.

## Two things must both be true

1. **The build emits source maps.** No maps, nothing to upload. Bundlers disable them in production
   by default.
2. **The maps reach Sentry, tied to the built files.** Modern SDKs do this with **Debug IDs** — a
   unique id injected into both the minified file and its map, so matching doesn't depend on release
   names, paths, or URLs.

Emitting maps is a per-bundler setting (`build.sourcemap` in Vite, `devtool` in webpack,
`productionBrowserSourceMaps` / framework plugin defaults in Next.js). Prefer **hidden** maps for
browser builds — generated and uploaded, but without the `//# sourceMappingURL` comment that points
browsers at them:

```typescript
// vite.config.ts
export default defineConfig({
  build: { sourcemap: "hidden" },
});
```

## Path A — the bundler plugin (preferred)

`@sentry/vite-plugin`, `@sentry/webpack-plugin`, `@sentry/rollup-plugin`, `@sentry/esbuild-plugin`, or
the framework wrapper that embeds one (`withSentryConfig` for Next.js, the SvelteKit and Nuxt plugins).
The plugin injects Debug IDs, uploads on production builds, and can delete the maps afterward so they
don't ship to users. Read the platform's `index.md` for the exact snippet; all of them take the same
three values from the environment — `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.

Two options worth setting deliberately:

- **Delete maps after upload** — keeps `.map` files out of the deployed bundle while still uploading
  them. Do this for public web apps.
- **Widen the upload** (Next.js `widenClientFileUpload: true`) — uploads more client files, which
  fixes frames that otherwise land in framework-internal chunks.

## Path B — `sentry-cli` (CI, custom builds, plain Node)

When there's no supported bundler or the build is bespoke. Two steps, in order — inject first, then
upload:

```bash
sentry-cli sourcemaps inject ./dist
sentry-cli sourcemaps upload ./dist
```

`inject` writes the Debug IDs; `upload` sends the files. Running `upload` alone still works but falls
back to legacy release/path matching, which is far more fragile. Wire both into the build script so
they can't drift apart:

```json
{
  "scripts": {
    "build": "tsc && sentry-cli sourcemaps inject ./dist && sentry-cli sourcemaps upload ./dist"
  }
}
```

## Path C — the wizard

```
npx @sentry/wizard@latest -i sourcemaps
```

Detects the bundler, installs the right plugin, and sets up the token. It is interactive (browser
login), so the **user** runs it, not the agent. Note it configures upload only — it does not
initialize the SDK.

## Node specifics

Server-side frames need the maps for the *compiled output that runs* (`./dist`, `.next/server`), not
the TypeScript sources. If you run TypeScript directly (`tsx`, `ts-node`, Bun), frames are usually
already readable and no upload is needed — confirm that before adding a build step nobody needs.

## Traps

| Symptom | Cause | Fix |
|---|---|---|
| Nothing uploaded, build green | Maps not emitted, or token unset | Enable `sourcemap` in the bundler; see `auth-token.md` |
| Uploaded, frames still minified | Upload ran without `inject`, so no Debug IDs | Add `sourcemaps inject` before `upload` |
| Only *some* frames readable | Partial upload — a chunk or the framework's own bundle wasn't included | Widen the upload path / `widenClientFileUpload` |
| Was fine, broke after a deploy | Upload happens after deploy, or a build cache reused stale maps | Move upload into the build, before deploy |
| `.map` files served to users | Maps emitted with `sourceMappingURL` and not deleted | Use `hidden` maps + delete-after-upload |
| Frames readable but no code context | Only maps uploaded; source content missing from them | Ensure the bundler embeds `sourcesContent` (usually default) |
