---
name: sentry-elixir-sdk
description: Full Sentry SDK setup for Elixir. Use when asked to "add Sentry to Elixir", "install sentry for Elixir", or configure error monitoring, tracing, logging, or crons for Elixir, Phoenix, or Plug applications. Supports Phoenix, Plug, LiveView, Oban, and Quantum.
license: Apache-2.0
category: sdk-setup
parent: sentry-sdk-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [SDK Setup](../sentry-sdk-setup/SKILL.md) > Elixir SDK

# Sentry Elixir SDK

Opinionated wizard that scans your Elixir project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to Elixir" or "set up Sentry" in an Elixir or Phoenix app
- User wants error monitoring, tracing, logging, or crons in Elixir or Phoenix
- User mentions `sentry` hex package, `getsentry/sentry-elixir`, or Elixir Sentry SDK
- User wants to monitor exceptions, Plug errors, LiveView errors, or scheduled jobs

> **Note:** SDK versions and APIs below reflect Sentry docs at time of writing (sentry v12.0.2, requires Elixir ~> 1.13).
> Always verify against [docs.sentry.io/platforms/elixir/](https://docs.sentry.io/platforms/elixir/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making any recommendations:

```bash
# Check existing Sentry dependency
grep -i sentry mix.exs 2>/dev/null

# Detect Elixir version
cat .tool-versions 2>/dev/null | grep elixir
grep "elixir:" mix.exs 2>/dev/null

# Detect Phoenix or Plug
grep -E '"phoenix"|"plug"' mix.exs 2>/dev/null

# Detect Phoenix LiveView
grep "phoenix_live_view" mix.exs 2>/dev/null

# Detect Oban (job queue / crons)
grep "oban" mix.exs 2>/dev/null

# Detect Quantum (cron scheduler)
grep "quantum" mix.exs 2>/dev/null

# Detect OpenTelemetry usage
grep "opentelemetry" mix.exs 2>/dev/null

# Check for companion frontend
ls assets/ frontend/ web/ client/ 2>/dev/null
```

**What to note:**

| Signal | Impact |
|--------|--------|
| `sentry` already in `mix.exs`? | Skip install; go to Phase 2 (configure features) |
| Phoenix detected? | Add `Sentry.PlugCapture`, `Sentry.PlugContext`, optionally `Sentry.LiveViewHook` |
| LiveView detected? | Add `Sentry.LiveViewHook` to the `live_view` macro in `my_app_web.ex` |
| Oban detected? | Recommend Crons + error capture via Oban integration |
| Quantum detected? | Recommend Crons via Quantum integration |
| OpenTelemetry already present? | Tracing setup only needs `Sentry.OpenTelemetry.*` config |
| Frontend directory found? | Trigger Phase 4 cross-link suggestion |

---

## Phase 2: Recommend

Based on what you found, present a concrete recommendation. Don't ask open-ended questions — lead with a proposal:

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; captures exceptions and crash reports
- ✅ **Logging** — `Sentry.LoggerHandler` forwards crash reports and error logs to Sentry
- ✅ **Tracing** — if Phoenix, Plug, or Ecto detected (via OpenTelemetry)

**Optional (enhanced observability):**
- ⚡ **Crons** — detect silent failures in scheduled jobs (Oban, Quantum, or manual GenServer)
- ⚡ **Sentry Logs** — forward structured logs to Sentry Logs Protocol (sentry v12.0.0+)

**Recommendation logic:**

| Feature | Recommend when... |
|---------|------------------|
| Error Monitoring | **Always** — non-negotiable baseline |
| Logging | **Always** — `LoggerHandler` captures crashes that aren't explicit `capture_exception` calls |
| Tracing | Phoenix, Plug, Ecto, or OpenTelemetry imports detected |
| Crons | Oban, Quantum, or periodic `GenServer`/`Task` patterns detected |
| Sentry Logs | sentry v12.0.0+ in use and structured log search is needed |

Propose: *"I recommend setting up Error Monitoring + Logging [+ Tracing if Phoenix/Ecto detected]. Want me to also add Crons or Sentry Logs?"*

---

## Phase 3: Guide

### Option 1: Igniter Installer (Recommended)

> **You need to run this yourself** — the Igniter installer requires interactive terminal input that the agent can't handle. Copy-paste into your terminal:
>
> ```bash
> mix igniter.install sentry
> ```
>
> Available since sentry v11.0.0. It auto-configures `config/config.exs`, `config/prod.exs`, `config/runtime.exs`, and `lib/my_app/application.ex`.
>
> **Once it finishes, come back and skip to [Verification](#verification).**

If the user skips the Igniter installer, proceed with Option 2 (Manual Setup) below.

---

### Option 2: Manual Setup

#### Install

Add to `mix.exs` dependencies:

```elixir
# mix.exs
defp deps do
  [
    {:sentry, "~> 12.0"},
    {:finch, "~> 0.21"}
    # Add jason if using Elixir < 1.18:
    # {:jason, "~> 1.4"},
  ]
end
```

```bash
mix deps.get
```

#### Configure

```elixir
# config/config.exs
config :sentry,
  dsn: System.get_env("SENTRY_DSN"),
  environment_name: config_env(),
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()],
  in_app_otp_apps: [:my_app]
```

For runtime configuration (recommended for DSN and release):

```elixir
# config/runtime.exs
import Config

config :sentry,
  dsn: System.fetch_env!("SENTRY_DSN"),
  release: System.get_env("SENTRY_RELEASE", "my-app@#{Application.spec(:my_app, :vsn)}")
```

#### Quick Start — Recommended Init Config

This config enables the most features with sensible defaults:

```elixir
# config/config.exs
config :sentry,
  dsn: System.get_env("SENTRY_DSN"),
  environment_name: config_env(),
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()],
  in_app_otp_apps: [:my_app],
  # Logger handler config — captures crash reports
  logger: [
    {:handler, :sentry_handler, Sentry.LoggerHandler, %{
      config: %{
        metadata: [:request_id],
        capture_log_messages: true,
        level: :error
      }
    }}
  ]
```

#### Activate Logger Handler

Add `Logger.add_handlers/1` in `Application.start/2`:

```elixir
# lib/my_app/application.ex
def start(_type, _args) do
  Logger.add_handlers(:my_app)   # activates the :sentry_handler configured above

  children = [
    MyAppWeb.Endpoint
    # ... other children
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

#### Phoenix Integration

**`lib/my_app_web/endpoint.ex`**

```elixir
defmodule MyAppWeb.Endpoint do
  use Sentry.PlugCapture          # Add ABOVE use Phoenix.Endpoint (Cowboy adapter only)
  use Phoenix.Endpoint, otp_app: :my_app

  # ...

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Sentry.PlugContext          # Add BELOW Plug.Parsers
  # ...
end
```

> **Note:** `Sentry.PlugCapture` is only needed for the **Cowboy** adapter. Phoenix 1.7+ defaults to **Bandit**, where `PlugCapture` is harmless but unnecessary. `Sentry.PlugContext` is always recommended — it enriches events with HTTP request data.

**LiveView errors — `lib/my_app_web.ex`**

```elixir
def live_view do
  quote do
    use Phoenix.LiveView

    on_mount Sentry.LiveViewHook   # captures errors in mount/handle_event/handle_info
  end
end
```

#### Plain Plug Application

```elixir
defmodule MyApp.Router do
  use Plug.Router
  use Sentry.PlugCapture          # Cowboy only

  plug Plug.Parsers, parsers: [:urlencoded, :multipart]
  plug Sentry.PlugContext
  # ...
end
```

### For Each Agreed Feature

Walk through features one at a time. Load the reference file for each, follow its steps, and verify before moving to the next:

| Feature | Reference file | Load when... |
|---------|---------------|-------------|
| Error Monitoring | `${SKILL_ROOT}/references/error-monitoring.md` | Always (baseline) |
| Tracing | `${SKILL_ROOT}/references/tracing.md` | Phoenix / Ecto / OpenTelemetry detected |
| Logging | `${SKILL_ROOT}/references/logging.md` | `LoggerHandler` or Sentry Logs setup |
| Crons | `${SKILL_ROOT}/references/crons.md` | Oban, Quantum, or periodic jobs detected |

For each feature: `Read ${SKILL_ROOT}/references/<feature>.md`, follow steps exactly, verify it works.

---

## Configuration Reference

### Key Config Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `:dsn` | `string \| nil` | `nil` | SDK disabled if nil; env: `SENTRY_DSN` |
| `:environment_name` | `atom \| string` | `"production"` | e.g., `:prod`; env: `SENTRY_ENVIRONMENT` |
| `:release` | `string \| nil` | `nil` | e.g., `"my-app@1.0.0"`; env: `SENTRY_RELEASE` |
| `:sample_rate` | `float` | `1.0` | Error event sample rate (0.0–1.0) |
| `:enable_source_code_context` | `boolean` | `false` | Include source lines around errors |
| `:root_source_code_paths` | `[path]` | `[]` | Required when source context is enabled |
| `:in_app_otp_apps` | `[atom]` | `[]` | OTP apps whose modules are "in-app" in stacktraces |
| `:before_send` | `(event -> event \| nil) \| {m, f}` | `nil` | Hook to mutate or drop error events |
| `:after_send_event` | `(event, result -> any) \| {m, f}` | `nil` | Hook called after event is sent |
| `:filter` | `module` | `Sentry.DefaultEventFilter` | Module implementing `Sentry.EventFilter` |
| `:max_breadcrumbs` | `integer` | `100` | Max breadcrumbs per process |
| `:dedup_events` | `boolean` | `true` | Deduplicate identical events within ~30 seconds |
| `:tags` | `map` | `%{}` | Global tags sent with every event |
| `:traces_sample_rate` | `float \| nil` | `nil` | Non-nil enables tracing (requires OTel setup) |
| `:traces_sampler` | `fn \| {m, f} \| nil` | `nil` | Custom per-transaction sampling |
| `:enable_logs` | `boolean` | `false` | Enable Sentry Logs Protocol (v12.0.0+) |
| `:test_mode` | `boolean` | `false` | Capture events in-memory for testing |

### Environment Variables

| Variable | Maps to | Purpose |
|----------|---------|---------|
| `SENTRY_DSN` | `:dsn` | Data Source Name |
| `SENTRY_RELEASE` | `:release` | App version (e.g., `my-app@1.0.0`) |
| `SENTRY_ENVIRONMENT` | `:environment_name` | Deployment environment |

---

## Verification

Test that Sentry is receiving events:

```bash
# Send a test event from your project
MIX_ENV=dev mix sentry.send_test_event
```

Or add a temporary call in a controller action:

```elixir
# Temporary test — remove after confirming
def index(conn, _params) do
  Sentry.capture_message("Sentry Elixir SDK test event")
  text(conn, "sent")
end
```

Check the Sentry dashboard within a few seconds. If nothing appears:
1. Set `config :sentry, log_level: :debug` for verbose SDK output
2. Verify `SENTRY_DSN` is set and the project exists
3. Confirm `:environment_name` is not set to a value Sentry filters in your alert rules

---

## Phase 4: Cross-Link

After completing Elixir setup, check for a companion frontend missing Sentry coverage:

```bash
ls assets/ frontend/ web/ client/ ui/ 2>/dev/null
cat assets/package.json frontend/package.json 2>/dev/null | grep -E '"react"|"svelte"|"vue"|"next"'
```

If a frontend directory exists without Sentry configured, suggest the matching skill:

| Frontend detected | Suggest skill |
|-------------------|--------------|
| React / Next.js | `sentry-react-sdk` or `sentry-nextjs-sdk` |
| Svelte / SvelteKit | `sentry-svelte-sdk` |
| Vue | See [docs.sentry.io/platforms/javascript/guides/vue/](https://docs.sentry.io/platforms/javascript/guides/vue/) |
| Other JS/TS | `sentry-browser-sdk` |

Connecting Phoenix backend and JavaScript frontend with linked Sentry projects enables **distributed tracing** — stack traces that span the browser, Phoenix HTTP server, and downstream services in a single trace view.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Verify `SENTRY_DSN` is set; run `mix sentry.send_test_event`; set `log_level: :debug` |
| Missing stack traces on captured exceptions | Pass `stacktrace: __STACKTRACE__` in the `rescue` block: `Sentry.capture_exception(e, stacktrace: __STACKTRACE__)` |
| `PlugCapture` not working on Bandit | `Sentry.PlugCapture` is Cowboy-only; with Bandit errors surface via `LoggerHandler` |
| Source code context missing in production | Run `mix sentry.package_source_code` before building your OTP release |
| Context not appearing on async events | `Sentry.Context.*` is process-scoped; pass values explicitly or propagate Logger metadata across processes |
| Oban integration not reporting crons | Requires Oban v2.17.6+ or Oban Pro; cron jobs must have `"cron" => true` in job meta |
| Duplicate events from Cowboy crashes | Set `excluded_domains: [:cowboy]` in `LoggerHandler` config (this is the default) |
| `finch` not starting | Ensure `{:finch, "~> 0.21"}` is in deps; Finch is the default HTTP client since v12.0.0 |
| JSON encoding error | Add `{:jason, "~> 1.4"}` and set `json_library: Jason` for Elixir < 1.18 |
