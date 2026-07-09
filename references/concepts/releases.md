# Releases — What & Why

A **release** is a version of your code deployed to an environment. Tying every event to its exact
version unlocks:

- **Regression detection** — when an issue first appeared and whether it came back in a later release.
- **Crash-free rates / release health** — error-free sessions and users per release (session tracking is
  on by default in most modern SDKs).
- **Suspect commits** — the specific commit(s) likely responsible for an issue, surfaced on the issue
  with a suggested assignee.
- **Resolve-in-next-release** and **`Fixes SENTRY-XXX`** — resolve an issue and let Sentry track whether
  it stays fixed in the version that ships the fix.

## While debugging

Releases let you pin the exact code that was running when an issue was produced — diff against that
revision rather than assuming `main` matches — and **suspect commits** on the issue are the fastest "what
changed." Suspect commits need the source-control integration below; without it you still get
release-scoped regression and health, just not the culprit commit.

## Setup essentials — two ingredients

1. **The `release` (and `environment`) tag on events** — set in the SDK `init` (or `SENTRY_RELEASE`).
   Without it every event is "unknown release" and regression/health features can't work.
2. **The release object + commits + deploy, created in CI** — via `sentry-cli` or the GitHub Action.
   **Associating commits is what powers suspect commits**, and that association needs a **source-control
   integration** (GitHub/GitLab) connected in Sentry's UI (an OAuth step the agent can't do). The
   **release name must match** between the SDK tag and the CI-created release, or events won't attribute.

Use a meaningful, unique version (a commit SHA or semver), set `environment` so staging noise doesn't
pollute prod health, and finalize the release + record the deploy at deploy time.

## Related

- [`monitors.md`](monitors.md) — release-health / crash-rate monitors build on this.
- [`search-query-language.md`](search-query-language.md) — `release`, `firstRelease`, `release.stage`.
