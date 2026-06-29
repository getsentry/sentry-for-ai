# Releases — What & Why

## What it is

A **release** is a version of your code deployed to an environment. Telling Sentry about each
release ties every event to the exact version it came from, which unlocks:

- **Regression detection** — Sentry knows when an issue first appeared and whether it came
  back in a later release.
- **Crash-free rates / release health** — what fraction of sessions and users were error-free
  per release (session tracking is on by default in modern SDKs).
- **Suspect commits** — the specific commit(s) likely responsible for an issue, surfaced on
  the issue itself, with a suggested assignee.
- **Resolve-in-next-release** and **`Fixes SENTRY-XXX`** — resolve an issue and have Sentry
  track whether it actually stays fixed in the version that ships the fix.
- **"Which deploy introduced this?"** — answerable instead of guessed.

## When to reach for it

- You ship more than once and want to know *which* ship broke something.
- You want suspect commits, code owners, and Seer to work well — they all lean on releases +
  the source-control connection.
- You want per-release health and adoption, not just a global error count.

## The two ingredients

1. **The `release` (and `environment`) tag on events** — set in the SDK `init` (or via
   `SENTRY_RELEASE`). This is what associates events with a version. Without it, every event
   is "unknown release" and regression/health features can't work.
2. **The release object + commits + deploy, created in CI** — `sentry-cli` (or the GitHub
   Action) creates the release, associates commits, finalizes it, and records the deploy.
   Associating commits is what powers **suspect commits**.

## Prerequisites to surface

- **A source-control integration connected in Sentry** (GitHub/GitLab). Commit association
  (`--auto`) and suspect commits depend on it. The OAuth connection is done in Sentry's UI,
  not by the agent — call this out.
- An **auth token with release permissions** for the CI step.
- The **release name must match** between the SDK tag and the CI-created release, or events
  won't attribute to the release you built.

## Best practices

- **Use a meaningful, unique version** — a commit SHA or a semantic version, consistent
  across SDK and CI. Avoid reusing a release name for different builds.
- **Set `environment`** (`production`, `staging`, …) so health and regressions are scoped
  correctly.
- **Finalize the release at deploy time** and record the **deploy** so "time since deploy" and
  adoption are accurate.

## Pitfalls

- Mismatched release names between `init` and CI → events don't attribute.
- No source-control integration → no suspect commits (the most-wanted feature).
- Forgetting `environment` → staging noise pollutes production health.

## Related

- [`monitors.md`](monitors.md) — release-health / crash-rate monitors build on this.
- [`search-query-language.md`](search-query-language.md) — `release`, `firstRelease`,
  `release.stage`, `is:for_review`.
