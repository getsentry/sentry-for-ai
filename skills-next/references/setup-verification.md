# Verify (confirm a signal landed)

The shared loop-closer. **Every** instrumentation task ends here. It owns the entire "prove it works"
step so no individual flow reimplements it. **Do not tell the user to "go check your dashboard" and
stop — confirm the event landed via the MCP.**

This generalizes beyond first errors: adding a signal or standing up a monitor reuses it to confirm
spans / logs / metrics / check-ins land — adjust the trigger in step 2 and the query in step 3.

## Prerequisites

- The Sentry MCP server connected and authenticated. If not, ask the user to run `/mcp` and connect
  Sentry first.
- The SDK (or the specific signal/config) was just instrumented or changed.

## Steps

### 1. Announce

> "Sentry is instrumented — now let's get a real event flowing through it so we know it works."

### 2. Produce the signal from the *real* running application

The point is to prove the **actual app's** instrumentation works end to end — not that a snippet can
reach Sentry. So exercise the real code path, not a standalone script:

- **Run the real application.** Boot it the way it actually runs — its `dev`/`start` script, the
  Makefile/`AGENTS.md`/`CLAUDE.md` run steps, the server, the worker. The error must travel through
  the SDK `init` the app really loads at startup, so we know that wiring is correct.
- **Trigger a genuine error through the app**, not a fabricated one:
  - **First error / error capture** → make the running app actually throw on a real path — hit an
    endpoint/handler/action that reaches a deliberate failure. **It is fine to add a temporary real
    trigger to the codebase** (e.g. a `/debug-sentry` route, a throw behind a one-off flag, an
    intentional bug in a handler you then exercise) and remove it after. Do **not** stand up an
    isolated script that calls `captureException` outside the app — that bypasses the very init you
    are verifying.
  - **Tracing** → drive a real traced request/operation through the app.
  - **Logging** → cause the app to emit a log at a captured level on a real path.
  - **Metrics** → exercise the code that emits the metric.
  - **Crons** → let the real job run (or invoke it) so it checks in.

**Decide who boots the app — do not assume.** If you can tell how to start it, offer to start it and
trigger the path yourself. If you can't, let the user choose: they boot it, or they tell you how and
you do it.

Keep the triggered event **identifiable** — e.g. a unique message like `Sentry test error
<timestamp>` — so you can find exactly it in the stream. Remove any temporary trigger code once
confirmed.

### 3. Confirm via the MCP

Poll for it. These are catalog tools — reach them via `search_sentry_tools` / `execute_sentry_tool`
if not directly exposed:

- `search_events` — fastest "did anything arrive in the last few minutes" check (counts/events).
- `search_issues` — did a grouped issue appear for the error?
- `get_issue_details` — drill into the captured event to confirm the stack trace / payload / your
  unique marker.

Give ingestion a moment — events usually appear within ~30s. Poll a few times before concluding.

When found, **give the user the direct URL to the issue** — surface the `permalink` (from
`get_issue_details`) before any cleanup or moving on:

> "Confirmed — your test error landed in Sentry end to end: <title>\n<issue URL>"

If you offer to resolve or delete the test issue as cleanup, share that URL first and let the user
open it before you change anything.

### 4. Verify it's *usable*

Arrival isn't the whole story. If `get_issue_details` shows **minified** frames (JavaScript) or
**unsymbolicated** frames (native/mobile), the event arrived but the stack trace isn't yet readable.
Say so plainly — readable stack traces need source maps (JS) or debug symbols (native/mobile) — and
treat it as not-yet-done rather than calling it complete.

### 5. Fallback

If nothing lands within ~2 minutes of polling:

- Double-check the DSN, that `init` runs before the error, and that the app actually executed the
  triggering code.
- Check `search_events` for *any* recent event (wrong project? different environment?).
- As a last resort, point the user at their Issues dashboard and offer troubleshooting — but treat
  this as a failure to close the loop, not success.

## What "done" looks like

The triggered signal has been observed in Sentry via the MCP, the user has the direct URL, and (for
stack traces) the frames are confirmed readable.
