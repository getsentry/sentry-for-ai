# Logging — Sentry Elixir SDK

> Minimum SDK: `sentry` v9.0.0+ for `Sentry.LoggerHandler`; v12.0.0+ for Sentry Logs Protocol

The Elixir SDK provides two independent logging mechanisms:

1. **`Sentry.LoggerHandler`** — Erlang `:logger` handler that forwards crash reports and error log messages from your app to Sentry as *error events*. This is the primary way to catch errors that weren't explicitly passed to `capture_exception/2`.

2. **Sentry Logs Protocol** (v12.0.0+) — Forwards structured log entries to Sentry's Logs product, where they appear alongside errors and traces.

---

## Sentry.LoggerHandler

### Configuration

The recommended setup uses the `:logger` key in your app's config and activates handlers in `Application.start/2`.

**Step 1: Define the handler in config**

```elixir
# config/config.exs
config :my_app, :logger, [
  {:handler, :sentry_handler, Sentry.LoggerHandler, %{
    config: %{
      metadata: [:request_id, :user_id],   # Logger metadata keys to include as extra context
      capture_log_messages: true,           # Send all :error messages, not just crash reports
      level: :error                         # Minimum log level (default: :error)
    }
  }}
]
```

**Step 2: Activate in Application.start/2**

```elixir
# lib/my_app/application.ex
def start(_type, _args) do
  Logger.add_handlers(:my_app)   # activates all handlers defined in config :my_app, :logger

  children = [
    MyAppWeb.Endpoint
    # ... other children
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

**Alternative: Add handler directly in Application.start/2**

```elixir
def start(_type, _args) do
  :logger.add_handler(:sentry_handler, Sentry.LoggerHandler, %{
    config: %{
      metadata: [:request_id],
      capture_log_messages: true,
      level: :error
    }
  })

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

### LoggerHandler Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `:level` | `Logger.level \| nil` | `:error` | Minimum log level to forward to Sentry |
| `:excluded_domains` | `[atom]` | `[:cowboy]` | Domains to skip (cowboy excluded by default to avoid double-reporting with `PlugCapture`) |
| `:metadata` | `[atom] \| :all` | `[]` | Logger metadata keys to include as extra context on the Sentry event |
| `:tags_from_metadata` | `[atom]` | `[]` | Metadata keys to promote to Sentry tags (searchable). Since v10.9.0 |
| `:capture_log_messages` | `boolean` | `false` | When `true`, all `:error`+ log messages are sent; when `false`, only crash reports (supervisor crashes, process exits) are sent |
| `:rate_limiting` | `[max_events: integer, interval: integer] \| nil` | `nil` | Rate limit; e.g., `[max_events: 10, interval: 1_000]`. Since v10.5.0 |
| `:sync_threshold` | `non_neg_integer \| nil` | `100` | Queue depth before switching to sync mode. Since v10.6.0 |
| `:discard_threshold` | `non_neg_integer \| nil` | `nil` | Queue depth above which events are dropped (cannot combine with `:sync_threshold`). Since v10.9.0 |

### Capturing specific log levels only

```elixir
config :my_app, :logger, [
  {:handler, :sentry_handler, Sentry.LoggerHandler, %{
    config: %{
      level: :warning,              # :debug | :info | :warning | :error | :critical
      capture_log_messages: true,
      metadata: :all                # include all Logger metadata
    }
  }}
]
```

### Rate limiting

Prevent log storms from flooding Sentry:

```elixir
config :my_app, :logger, [
  {:handler, :sentry_handler, Sentry.LoggerHandler, %{
    config: %{
      capture_log_messages: true,
      level: :error,
      rate_limiting: [max_events: 20, interval: 60_000]   # max 20 events per minute
    }
  }}
]
```

### Promoting metadata to Sentry tags

Tags are indexed and searchable in Sentry. Promote high-value metadata keys:

```elixir
config :my_app, :logger, [
  {:handler, :sentry_handler, Sentry.LoggerHandler, %{
    config: %{
      metadata: [:request_id, :user_id, :region],
      tags_from_metadata: [:region],        # "region" becomes a searchable Sentry tag
      capture_log_messages: true,
      level: :error
    }
  }}
]
```

### LoggerBackend (legacy)

`Sentry.LoggerBackend` is the older Elixir `Logger` backend. Prefer `LoggerHandler` for new projects. `LoggerBackend` will eventually be deprecated.

```elixir
# lib/my_app/application.ex
def start(_type, _args) do
  Logger.add_backend(Sentry.LoggerBackend)
  # ...
end

# config/config.exs
config :logger, Sentry.LoggerBackend,
  level: :warning,
  excluded_domains: [],
  metadata: [:foo_bar],
  capture_log_messages: true
```

---

## Sentry Logs Protocol (since v12.0.0)

The Sentry Logs feature sends structured log entries to Sentry's Logs product — separate from error events. This enables log search, log-to-trace correlation, and dashboards alongside your error data.

### Enable

```elixir
# config/config.exs
config :sentry,
  enable_logs: true,   # auto-attaches a TelemetryProcessor-backed LoggerHandler
  logs: [
    level: :info,                              # minimum log level (default: :info)
    metadata: [:request_id, :user_id],         # metadata keys to include as log attributes
    excluded_domains: [:cowboy, :ecto_sql]     # domains to skip
  ]
```

`enable_logs: true` automatically wires up a Logger handler that captures log entries and forwards them to the Sentry Logs Protocol endpoint via the `TelemetryProcessor`.

### Filter logs before sending

```elixir
config :sentry,
  enable_logs: true,
  before_send_log: fn log_event ->
    # Return nil to drop the log; return log_event to send it
    if log_event.level == :debug, do: nil, else: log_event
  end
```

### Route all categories through TelemetryProcessor

By default only logs use the `TelemetryProcessor` ring buffer. You can route errors, check-ins, and transactions through it too:

```elixir
config :sentry,
  enable_logs: true,
  telemetry_processor_categories: [:log, :error, :check_in, :transaction]
```

---

## How the Two Systems Interact

| What | LoggerHandler | Sentry Logs Protocol |
|------|---------------|---------------------|
| Appears in Sentry | Issues (errors) | Logs product |
| Use for | Crash reports, unhandled errors | Structured log search, log-to-trace correlation |
| Min SDK version | v9.0.0 | v12.0.0 |
| Config key | `:logger` in app config | `:enable_logs` in sentry config |

You can run both simultaneously. A common setup: `LoggerHandler` at `:error` level for issues, and Sentry Logs at `:info` for structured log search.

---

## Best Practices

- Prefer `Sentry.LoggerHandler` over `Sentry.LoggerBackend` for new projects — `LoggerHandler` is the Erlang `:logger` handler and runs in the calling process, which is more efficient
- Set `excluded_domains: [:cowboy]` (the default) to avoid duplicate events when using `Sentry.PlugCapture` with Cowboy
- Enable `capture_log_messages: true` to catch error-level log messages that are not explicit `capture_exception` calls
- Use `tags_from_metadata` to promote high-cardinality identifiers (user ID, region, request ID) to searchable Sentry tags
- Apply `rate_limiting` in high-throughput services to prevent log storms from overwhelming your Sentry quota

## Troubleshooting

| Issue | Solution |
|-------|----------|
| LoggerHandler not capturing anything | Verify `Logger.add_handlers(:my_app)` is called in `Application.start/2` |
| Duplicate events from Cowboy crashes | `excluded_domains: [:cowboy]` is the default; check if it was removed from config |
| No Sentry Logs entries appearing | Ensure `enable_logs: true` is set and sentry v12.0.0+ is in use |
| Log metadata not appearing in Sentry | List keys explicitly in `metadata:` option; or use `metadata: :all` |
| Too many log events hitting quota | Add `rate_limiting: [max_events: N, interval: ms]` to `LoggerHandler` config |
| `LoggerBackend` warnings in logs | Migrate to `Sentry.LoggerHandler`; `LoggerBackend` will be deprecated |
