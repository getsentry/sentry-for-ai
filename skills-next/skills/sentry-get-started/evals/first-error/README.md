# Eval: sentry-get-started — first-error (fresh Node/Express)

The end-to-end first-error flow for a brand-new user: a small Express app with
no Sentry, who wants error monitoring set up and **proven** to work.

Run it (see [`../../../../evals/README.md`](../../../../evals/README.md) for the
harness):

```bash
skills-next/evals/harness/run-docker.sh \
  skills-next/skills/sentry-get-started/evals/first-error
```

## What it grades

`tasks/new-node-express.yaml` carries the judgments. Deterministic graders first,
then LLM-judge (`prompt`) graders that continue the agent's session:

| Judgment | Grader | Notes |
|----------|--------|-------|
| SDK dependency added | `file` | `@sentry/node` in `package.json` |
| SDK initialized | `file` | `Sentry.init` in `instrument.js` |
| Did real work | `code` | `len(tool_calls) > 0` |
| Routed through `sentry-get-started` | `skill_invocation` | self-contained first-error flow |
| Stayed bounded | `behavior` | tool-call / time caps |
| Instrumented the project's code | `prompt` | backstop to the file graders |
| **Triggered a REAL error** | `prompt` | ran the app + hit `/debug` — **not** a throwaway `captureException` script |
| Verified in Sentry | `prompt` | confirmed via MCP, not "go check the dashboard" |
| Printed the error | `prompt` | surfaced title/message + issue permalink |
| Strongly recommended deploy | `prompt` | deploy to production as an explicit next step |

## Expected state today (MCP deferred)

No Sentry MCP is wired yet, so the agent can't mint a DSN or verify an event.
The MCP-dependent judgments (`verified-in-sentry`, `printed-the-error`, the DSN
half of instrumentation) will be **red** until we attach the Sentry MCP's stdio
self-mock — see the deferred block in `eval.yaml`. That first red run is the
signal to wire MCP.

## Fixture

`fixtures/node-express/` — a tiny Express service with **no Sentry** and a
`/debug` route that throws `Intentional demo failure`, giving the agent a real
error path to exercise through the running app.

## Adding a checkpoint variant (e.g. "deploy step")

Add a sibling `tasks/*.yaml` + a `fixtures/<app>/` already in the checkpoint
state, with an opening prompt that resumes there. See the pre-seeding section of
the harness README.
