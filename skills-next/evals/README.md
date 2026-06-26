# skills-next evals

Per-skill evals for the `skills-next` skill tree, built on
[waza](https://github.com/microsoft/waza). Each eval drives one intended user
flow through a simulated user and grades the outcome, so we can tell when a
skill-content change makes the agent behave better or worse.

## Layout

Evals live **next to the skill they test**, and share one harness:

```
skills-next/
  evals/
    harness/                         # shared, skill-agnostic
      run-docker.sh                  # host: build plugin -> docker build -> docker run
      run.sh                         # in-container/local: install skills + run waza
      container-entry.sh
      Dockerfile
  skills/<skill>/evals/<eval-name>/  # one eval = one flow
      eval.yaml                      # waza config (executor, model, MCP, task glob)
      tasks/*.yaml                   # task(s): prompt + responder + graders
      fixtures/<app>/                # starting-state project copied into the workspace
      README.md
```

The first eval is `skills/sentry-get-started/evals/first-error/`.

## How a run works

`run-docker.sh <eval-dir>` is the entry point. It:

1. **Builds the shipped skill tree** with a real plugin builder
   (`plugin-src/<BUILDER>/build.sh`, default `claude`) against
   `CONTENT_ROOT=skills-next`. We build the actual artifact — references
   hydrated into each skill, the same as what ships — not raw `skills-next`.
   (Per-skill `evals/` dirs are excluded by the build, so the agent under test
   never sees its own tasks or grader prompts.)
2. **Stages a minimal Docker context** (built `skills/`, the `eval/`, the
   runner) and builds the sandbox image. The host repo is **not** mounted — the
   agent only sees what's baked in.
3. **Runs the sandbox**, passing the OpenRouter key via `-e` (never baked into
   the image). Results + session logs come back in `<eval-dir>/.docker-out/`.

Inside the container, `run.sh` installs the built skills into the Copilot
personal skills dir (`~/.copilot/skills`) and runs `waza run`. The agent must
**discover and route through** the installed skills itself (`inject_skill_body:
false`) — this tests real routing, not a single handed-in skill body.

### Executor & model

waza's only real executor is `copilot-sdk` (it bundles the GitHub Copilot CLI).
We point it at a custom OpenAI-compatible provider (**OpenRouter**) so no Copilot
subscription is needed, and run the agent under **`openai/gpt-5.5`**: GPT's
native tool-calling over the chat-completions wire is reliable, whereas Claude
over the same wire was flaky. Override with `MODEL=...`. (waza 0.37's bundled
Copilot CLI also lists native `claude-sonnet-4.6`; switching to it would raise
fidelity but needs Copilot auth — a future option.)

### Cross-harness builds

`BUILDER` selects which plugin distribution to ship into the sandbox
(`claude` | `cursor` | `codex` | `grok`). Default `claude` — the headline
target. The same eval can be run against the other builds to check a skill
behaves across harnesses.

## MCP is deferred (v1)

There is **no Sentry MCP attached yet**. The first runs will show the agent
orient, then **stall** the moment it needs to provision a project or verify an
event — that stall is the expected, designed signal that it's time to wire MCP.

The plan is to run the **real Sentry MCP in its stdio self-mock mode** rather
than maintaining a hand-rolled mock, wired via `config.mcp_servers` in
`eval.yaml`. We'll do that once a run actually hits the no-MCP wall. (waza passes
`config.mcp_servers` into the Copilot session directly.)

## Prerequisites

- Docker running.
- `waza` (only needed for local, non-Docker runs; the image installs its own).
- An OpenRouter key in `skills-next/evals/.openrouter-key` (gitignored,
  `chmod 600`) or `$OPENROUTER_API_KEY`.

## Run it

```bash
# From repo root:
skills-next/evals/harness/run-docker.sh \
  skills-next/skills/sentry-get-started/evals/first-error

# Cross-harness / different model:
BUILDER=grok MODEL=openai/gpt-5.5 skills-next/evals/harness/run-docker.sh \
  skills-next/skills/sentry-get-started/evals/first-error
```

Results: `<eval-dir>/.docker-out/results.json` + session logs.

## Pre-seeding to a checkpoint (e.g. "already set up, now deploy")

waza has no transcript injection, so we pre-seed by **world-state + opening
prompt**, not fake prior turns. To start "at the deploy step", add another task
to the eval with:

- a **fixture** whose project is already in the checkpoint state (e.g. Sentry
  already installed, initialized, and a verified error), and
- an **opening prompt** that resumes there ("Sentry's set up and I confirmed an
  error landed — what should I do next?"), plus a responder and graders specific
  to that checkpoint (e.g. only `recommended-deploy` / "knows how to deploy").

Each checkpoint is just another `tasks/*.yaml` + `fixtures/<app>/` pair — same
harness, no new infrastructure.

## Adding a new eval

1. `mkdir -p skills-next/skills/<skill>/evals/<eval-name>/{tasks,fixtures}`.
2. Write `eval.yaml` (copy `first-error/eval.yaml`), `tasks/*.yaml`, and a
   fixture app.
3. Run it with `run-docker.sh <eval-dir>`. Keep fixtures minimal.
