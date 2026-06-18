---
name: sentry-releases
description: Set up Sentry releases with suspect commits and deploy tracking. Use when a user wants per-release health, regression detection, "Fixes SENTRY-XXX", or to know which deploy introduced an issue.
license: Apache-2.0
category: improve-setup
parent: sentry-improve-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Improve My Setup](../sentry-improve-setup/SKILL.md) > Releases

# Releases, Suspect Commits & Deploys

> **Stub — flesh out.**

## What this gives you

Tie each deployed version to Sentry so you get crash-free rates, regression detection, per-release
issues, **suspect commits** (the culprit commit on an issue), and resolve-via-commit.

## Steps (outline)

1. **Set `release` + `environment`** in the SDK `init` (or via `SENTRY_RELEASE`). Session tracking
   is on by default in modern SDKs.
2. **Create the release in CI** with `sentry-cli`: `releases new` → `set-commits --auto` →
   `finalize` → `deploys ... new -e <env>`. Or use `getsentry/action-release` (GitHub Actions).
3. **Associate commits** — `--auto` needs a connected source-control integration (GitHub/GitLab).
   Surface this; the OAuth connection is done in Sentry, not by the agent.

## Prerequisites to surface

- Auth token (release permissions).
- Source-control integration connected in Sentry for suspect commits.

## Verify

Confirm the release appears and an event is attributed to it
([`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md)).
