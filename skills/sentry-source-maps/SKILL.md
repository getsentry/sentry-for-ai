---
name: sentry-source-maps
description: Make stack traces readable by uploading source maps (JavaScript) or debug files (mobile/native). Use when Sentry stack traces show minified or unsymbolicated code instead of your original source.
license: Apache-2.0
category: improve-setup
parent: sentry-improve-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Improve My Setup](../sentry-improve-setup/SKILL.md) > Source Maps

# Readable Stack Traces

> **Stub — flesh out.** Symptom-driven entry: "my Sentry stack traces are unreadable."

## What this fixes

Minified JavaScript or unsymbolicated native/mobile frames in Sentry → mapped back to your
original source.

## Approach

- **JavaScript (recommended):** the bundler plugin (`@sentry/webpack-plugin` / `vite-plugin` /
  `rollup-plugin` / `esbuild-plugin`), which auto-creates the release, injects Debug IDs, and
  uploads maps on production builds. Run `npx @sentry/wizard@latest -i sourcemaps` or wire the
  plugin manually. Needs source maps enabled in the build and a Sentry **auth token**.
- **JS fallback / CI:** `sentry-cli sourcemaps inject` then `sourcemaps upload`.
- **Mobile/native:** upload debug files (dSYM, ProGuard/R8 mappings) — platform-specific; defer to
  the platform SDK skill.

## Prerequisites to surface

- A Sentry **auth token** (org/personal) with project + release permissions — the user provides
  this; it's a secret (unlike the DSN).

## Verify

Trigger an error and confirm the frames are now de-minified in the event detail
([`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md)).
