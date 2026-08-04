# Releases — tying events to the code that produced them

A release is a version of your code running in an environment.
Once Sentry knows which release an event came from, it can tell you when an issue first
appeared, whether it came back, how many users crashed on that version, and which commit
is probably responsible.

Getting there is **two pieces of wiring that must agree on one string**:

- **The tag** — the SDK stamps every event with a `release` (and `environment`). Pure
  configuration: one or two `init` options, no CI, no integrations.
- **The release object** — CI creates a release under that same name, associates its
  commits, finalizes it, and records the deploy.

Either half alone produces nothing visible, and neither errors when the other is
missing. That silence is the defining characteristic of this setup and the reason to
diagnose before configuring.

This group is read from three directions: while setting Sentry up for the first time
(the tag belongs in any setup headed for production), while hardening an existing
install, and when someone arrives asking why a release feature is empty.
Start here, route to the file.

## First: which half is missing?

Establish both before writing anything.
Pull a recent event and read its `release` tag; then look the release object up by that
exact name — `get_release_details` via the MCP, which reports the commits and deploys
attached to it (deploys carry their environment), or the Releases page.
When the exact name is in doubt, `find_releases` lists releases with a `lastCommit` /
`lastDeploy` summary on each — a useful hint, though a null `lastCommit` isn’t proof CI
skipped that release.
Both are **catalog tools** and usually aren’t exposed directly; reach them through
`search_sentry_tools` / `execute_sentry_tool`.

These are two separate lookups.
An event search filtered by `release:` only ever tells you about the tag, never about
the object.

| What you find | What it means | Go to |
| --- | --- | --- |
| Events carry no release, or `release: unknown` | Nothing is tagging | [`tagging.md`](tagging.md) |
| Events tagged, but no release object — or one with no commits | The CI half is missing | [`ci-pipeline.md`](ci-pipeline.md) |
| A release object with commits and a deploy, but **0 events** on it | Name mismatch — the classic failure | [`troubleshooting.md`](troubleshooting.md) |
| Both halves in place, but no suspect commits | Blame wiring, not release wiring | [`suspect-commits.md`](suspect-commits.md) |
| Both halves in place, some other feature empty | Any of a dozen quiet failures | [`troubleshooting.md`](troubleshooting.md) |

Two facts worth establishing early, because they change the plan:

- **Is this project deployed by CI?** The tag can be set anywhere, but the release
  object has to be created by whatever builds and ships the code.
  A locally-run release step describes a build nobody is running.
- **Is a Sentry bundler plugin already in the build?** On JavaScript projects it very
  likely already creates the release, injects the name, and associates commits.
  Configure it rather than adding a second pipeline beside it — see
  [`ci-pipeline.md`](ci-pipeline.md).

## The files

| File | What it covers |
| --- | --- |
| [`tagging.md`](tagging.md) | Choosing the name, the naming rules, and the per-platform `release` / `environment` / `dist` options. The half that is only configuration. |
| [`ci-pipeline.md`](ci-pipeline.md) | Creating the release in CI: the bundler-plugin path, `getsentry/action-release`, raw `sentry-cli`, mobile and Flutter. Commit association, finalize, deploys. |
| [`suspect-commits.md`](suspect-commits.md) | The SCM integration, code mappings, resolve-by-commit, and auto-assignment — plus why suspect commits mostly do *not* run on release commits. |
| [`troubleshooting.md`](troubleshooting.md) | Symptom to cause, for the failures that produce no error message. |

Anything CI writes to Sentry needs an auth token:
[`../auth-token.md`](../auth-token.md).
A missing one usually skips the work **silently** rather than failing the build.

## The prerequisite this group does not own

Suspect commits work off file paths in the stack trace, so they need **readable in-app
frames** — source maps for JavaScript, debug files for native and mobile.
If frames are minified or unsymbolicated, fix that first; it is a separate procedure,
and promising suspect commits before it is done sets the user up for an empty result.

## Where the SDK-side config lives

The `release` and `environment` `init` options, the bundler-plugin block, and the Gradle
`sentry {}` options are documented per platform in that platform’s
`sdks/<slug>/index.md`, as ordinary SDK configuration.
Use it for where the options sit; use this group for what it doesn’t cover — naming, the
CI pipeline, commit association, and the failure modes.

## Confirming it works

A release setup is proven by **shipping one**: run the pipeline through CI, then confirm
a real event from that build carries a `release` tag exactly matching the created
release, and that the release has commits and a deploy.
Verifying the tag against the object is the check that catches the mismatch failure, and
it is the one people skip.
The event-arrival loop is in [`setup-verification.md`](../setup-verification.md).
