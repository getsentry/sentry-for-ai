# Evals

Evals run each skill against a realistic fixture project with real Claude API calls, then assert on the files it produces.  Built on [vitest-evals](https://vitest-evals.sentry.dev/).

## How it works

1. **Fixture** — a minimal but realistic project directory (e.g., a Rails app with a Gemfile and config structure)
2. **Scenario JSON** — defines the prompt, expected file contents, and soft assertions
3. **Eval test** — runs the agent against the fixture and checks the result

The runner copies the fixture to a temp directory, gives the agent sandboxed file tools (read, write, list, search, delete — no shell, no network), and snapshots the filesystem before and after. Deterministic assertions (`expect().toContain()`) verify file contents. An LLM judge evaluates soft criteria that substring checks can't capture (e.g., "did it detect Rails and choose sentry-rails").

```
scenarios/ruby-sdk/rails-basic.json    →  what to test
fixtures/ruby-sdk/rails-basic/         →  the input project
src/ruby-sdk.eval.ts                   →  runs the agent, checks results
```

## Running evals

```bash
cd evals
npm install

# Run all evals (requires API key)
ANTHROPIC_API_KEY=sk-... npm run evals

# Run a single scenario by name
ANTHROPIC_API_KEY=sk-... npm run evals -- -t "rails-basic"

# Verbose mode — shows agent tool calls
EVAL_VERBOSE=true ANTHROPIC_API_KEY=sk-... npm run evals
```

Each scenario makes real Claude API calls 💸.

### Non-determinism

Claude may produce slightly different output each run; different comments, different ordering, different phrasing. Assertions must be resilient to valid variations:

- Use substring checks (`contains`), not exact file matches
- Check for config keys (`traces_sample_rate`), not exact values (`traces_sample_rate = 1.0`)
- Use `excludes` for things that should never appear, not for things that are merely optional
- Reserve `soft_assertions` for semantic criteria that substring checks can't capture

If a scenario is flaky, the assertion is probably too specific. Loosen it or move the check to a soft assertion.

## When to run evals

- **While iterating on a skill** — change the skill, run the eval, see if it still works. This is the TDD loop.
- **Before shipping a skill change** — add the `run-evals` label to your PR, or push changes to `evals/` or `skills/` (CI triggers automatically).
- **Not on every PR** — evals cost real money and only matter when skill or eval code changes.

## Adding a new scenario

Scenarios are auto-discovered: the eval file reads every `.json` in the scenario directory. No code changes needed.

**1. Create the fixture** — a minimal project that triggers the behavior you want to test:

```
fixtures/ruby-sdk/rails-sidekiq/
  Gemfile                              # must include sidekiq gem
  config/application.rb
  app/workers/report_worker.rb         # enough for the skill to detect Sidekiq
```

Keep fixtures small — just enough files for the skill's detection phase to work. Don't build a full app.

**2. Create the scenario JSON:**

```
scenarios/ruby-sdk/rails-sidekiq.json
```

```json
{
  "name": "rails-sidekiq",
  "given": "A Rails 7.1 app with Sidekiq for background jobs",
  "prompt": "Set up Sentry for this Rails application with full monitoring.",
  "fixture": "rails-sidekiq",
  "files": [
    {
      "path": "Gemfile",
      "contains": ["sentry-ruby", "sentry-rails", "sentry-sidekiq"],
      "excludes": []
    },
    {
      "path": "config/initializers/sentry.rb",
      "contains": ["Sentry.init", "enable_logs"],
      "excludes": []
    }
  ],
  "should_not_exist": [],
  "soft_assertions": [
    { "criterion": "The agent detected Sidekiq and recommended sentry-sidekiq" }
  ],
  "negative_assertions": []
}
```

**3. Run it:**

```bash
ANTHROPIC_API_KEY=sk-... npm run evals -- -t "rails-sidekiq"
```

### Scenario format reference

| Field | Description |
|-------|-------------|
| `name` | Scenario name (used in test output and `-t` filter) |
| `given` | BDD-style description of the project |
| `prompt` | The user message sent to the agent |
| `fixture` | Directory name under `fixtures/<skill>/` |
| `files` | File assertions: `path`, `contains` (must appear), `excludes` (must not appear) |
| `should_not_exist` | Paths that must NOT be created |
| `soft_assertions` | LLM-judged criteria (e.g., "detected the framework correctly") |
| `negative_assertions` | Things that must NOT be true (judged by LLM) |

## Validating assertions with a real app

Before trusting your scenario assertions, verify that the "golden answer" actually sends telemetry. Use a file-writing transport to capture envelopes without needing a real DSN:

1. Generate a real app matching the fixture (e.g., `rails new` with the same gems)
2. Apply the expected Sentry setup — the Gemfile changes and initializer the agent should produce
3. Add a file-writing transport to the initializer:

```ruby
class FileTransport < Sentry::HTTPTransport
  def send_data(data)
    dir = Rails.root.join("tmp", "sentry_envelopes")
    FileUtils.mkdir_p(dir)
    File.write(dir.join("#{Time.now.to_f}.envelope"), data)
  end
end

Sentry.init do |config|
  config.dsn = "https://fake@o0.ingest.sentry.io/0"
  # ... rest of config ...
  config.transport.transport_class = FileTransport
end
```

4. Boot the app, trigger a request, check `tmp/sentry_envelopes/` for envelope files
5. Verify you see the expected types: `event` (errors), `transaction` (traces), `log` (structured logs)
6. Update the scenario's `contains`/`excludes` based on what config was actually needed

This is a one-time manual step per scenario. Remove the custom transport from the initializer afterward — the eval fixture doesn't need it. Other ways to verify telemetry flow:

- [Spotlight](https://spotlightjs.com/) — local dev UI, no DSN needed (`config.spotlight = true`)
- [`sentry local`](https://cli.sentry.dev/commands/local/) — streams captured envelopes in your terminal, `--verify` flag exits after first event
- [Sentry Relay](https://docs.sentry.io/product/relay/) — run a local Relay instance to inspect envelope forwarding

## Adding a new skill

1. Create `fixtures/<skill>/` and `scenarios/<skill>/` directories
2. Create a new `src/<skill>.eval.ts` — copy `ruby-sdk.eval.ts` and change the skill name and paths
3. Add scenarios and fixtures following the pattern above

## Limitations

The runner currently only supports Claude (Anthropic API). Skills are designed to work across Claude Code, Cursor, Codex, and Grok, but evals only verify the Claude path. Multi-provider support (following [Warden's runtime abstraction](https://github.com/getsentry/warden)) is planned but not yet implemented.

## Architecture

```
src/
  runner.ts      Copies fixture to temp dir, runs Claude with sandboxed file
                 tools, snapshots before/after filesystem state.
  harness.ts     Adapts the runner to vitest-evals' createHarness() interface.
  judge.ts       LLM judge for soft assertions only. Deterministic checks are
                 expect() calls in the eval file.
  types.ts       Zod schemas for scenario JSON validation.
  setup.ts       Loads .env files before tests run.
  *.eval.ts      Test suites — one per skill.
```
