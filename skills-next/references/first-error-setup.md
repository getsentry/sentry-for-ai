# First-error setup (one real error, end to end)

The shared spine for getting a brand-new project capturing errors in Sentry — detect the platform,
provision a project, install error-only `init`, and confirm a real error lands. Any flow that starts
from zero runs this; it exists so the sequence lives in exactly one place.

This file owns the **order**, not the details. Each step hands off to the reference that owns it —
follow that reference, then come back. Don't re-derive what those files already cover.

## Step 1 — Detect the platform

Read [`sdks/index.md`](sdks/index.md) for the catalog and detection rules. Identify the platform from
project files (`package.json`, `go.mod`, `requirements.txt`, `Gemfile`, `*.csproj`, `build.gradle`,
`pubspec.yaml`, …), **tell the user what you found and confirm** — don't assume from files alone —
then open that platform's [`sdks/<slug>/index.md`](sdks/index.md) and
`sdks/<slug>/error-monitoring.md`.

## Step 2 — Provision a project + DSN

Follow [`new-project.md`](new-project.md). Determine via the MCP whether a fitting project already
exists; select it and read its DSN, or create one (propose `create_project` and create on a yes,
never silently). Either way you come back with the public DSN to use in `init`.

## Step 3 — Install minimal error capture

Following the platform references, install the SDK and write `init({ dsn })` scoped to **error
monitoring only**, using the DSN from Step 2. Defer tracing, logging, profiling, replay, everything
else — installing more than errors here is the most common mistake. Stop at error capture.

## Step 4 — Verify end to end

Close the loop with [`setup-verification.md`](setup-verification.md): run the **real** application,
make it throw a genuine error through its actual init/code path (a temporary real trigger in the app
is fine — never a standalone script that bypasses init), poll the MCP until the error appears,
**surface the direct issue URL to the user**, and confirm it's verified end to end. Not done until
the real error is seen in Sentry.

## Step 5 — Push to get it into production — this is the point

A verified local error only proves the wiring works; the value is capturing errors from *real users*.
Don't end on "it works locally." Push hard:

- **If you already have context on how this project deploys** — a CI/CD config, a deploy script, a
  Dockerfile/Procfile, a hosting platform (Vercel, Fly, Render, Heroku, …), or a deploy section in
  `AGENTS.md`/`CLAUDE.md` — use it. Walk the user through (or offer to make) the changes to ship the
  Sentry-instrumented build, making sure the DSN and the `release`/`environment` values are set in
  the production environment, not just locally.
- **Otherwise**, advocate plainly and ask: getting Sentry into production is the most important next
  step because real user errors are where the payoff is — how do you deploy this, and can I help wire
  it in?

## Step 6 — Make sure production stack traces will be readable

Local frames often look fine while production builds mangle them — minified JavaScript, stripped
native symbols — so an issue from a real user can be unreadable even though the verified test error
wasn't. This is per-platform: the platform's [`sdks/<slug>/index.md`](sdks/index.md) ("Platform
considerations") names what *this* stack needs — e.g. **source maps** for JavaScript/TypeScript,
**debug symbols** (dSYM, ProGuard/R8) for native/mobile. Frame it proactively, tied to the platform
you detected:

> "Now that this is heading to production — since you're on <platform>, we'll want
> <source maps / debug symbols / …> so real-user stack traces stay readable. Here's what that takes."

Also **scrutinize the verified issue**: pull it with `get_issue_details` and check the frames show
actual source (file, line, function), not minified or unsymbolicated noise. Degraded frames even
locally are a strong signal production will be worse.

## What "done" looks like

The SDK is installed with error-only `init`, a **real error produced by the running app** has been
confirmed in Sentry via the MCP (issue URL surfaced), **the user has been pushed to ship to
production**, and **production stack-trace quality has been addressed** (the per-platform source maps
/ debug symbols flagged, and the produced issue's frames scrutinized). A local-only setup isn't the
finish line.
