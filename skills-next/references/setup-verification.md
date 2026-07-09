# Verify (confirm a signal landed)

The shared loop-closer. **Every** instrumentation task ends here. It owns the entire "prove it works"
step so no individual flow reimplements it. **Do not tell the user to "go check your dashboard" and
stop — confirm the event landed via the MCP.**

This generalizes beyond first errors: adding a signal or standing up a monitor reuses it to confirm
spans / logs / metrics / cron check-ins land — adjust the trigger in step 2 and the query in step 3.

## Prerequisites

- The Sentry MCP server connected and authenticated. If not, use your knowledge of the harness you're
  running in to suggest the appropriate way to authenticate the Sentry MCP first.
- The SDK (or the specific signal/config) was just instrumented or changed.

## Steps

### 1. Announce

> "Sentry is instrumented — now let's get real instrumentation data flowing through it so we know it works."

### 2. Produce the signal from the *real* running application

The point is to prove the **actual app's** instrumentation works end to end — not that a snippet can
reach Sentry. So exercise the real code path, not a standalone script:

- **Run the real application.** Boot it the way it actually runs — however the project is normally
  started (its dev/start script, the server, the worker). The error must travel through the SDK
  `init` the app really loads at startup, so we know that wiring is correct.
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
  - **Crons** → find a way to invoke the job so the cron instrumentation triggers (its check-in fires).

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

When found, **show the user what Sentry actually captured** — don't just hand over a link. Pull
from `get_issue_details` the issue **title**, the **error message / value** (the exception message
the SDK sent), and the `permalink`, and surface all three together before any cleanup or moving on.
Seeing the real title and message it captured — not just a URL — is what makes it click ("ah,
that's the test error the agent drove to create"):

> "Confirmed — your test error landed in Sentry end to end:
> <title>
> <error message / value>
> <issue URL>"

Offer to open the issue in the user's browser. Then **offer to resolve the test issue as
cleanup** — share the URL and let the user open it before you change anything.

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
- **Keep debugging until you find why the data didn't reach Sentry.** Don't stop at pointing the user
  at their Issues dashboard and calling it done — work the DSN, `init` ordering, environment, and
  network path until the loop actually closes.

## What "done" looks like

The triggered signal has been observed in Sentry via the MCP, the user has been shown its title,
error message, and direct URL, and (for stack traces) the frames are confirmed readable.
