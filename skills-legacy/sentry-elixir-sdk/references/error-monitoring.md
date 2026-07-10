# Error Monitoring — Sentry Elixir SDK

> Minimum SDK: `sentry` v8.0.0+

## Configuration

Key config options for error monitoring:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `:dsn` | `string \| nil` | `nil` | SDK disabled if nil |
| `:sample_rate` | `float` | `1.0` | Error event sample rate (0.0–1.0) |
| `:before_send` | `(event -> event \| nil \| false) \| {m, f}` | `nil` | Mutate or drop error events before sending |
| `:after_send_event` | `(event, result -> any) \| {m, f}` | `nil` | Called after sending; return value ignored |
| `:filter` | `module` | `Sentry.DefaultEventFilter` | Module implementing `Sentry.EventFilter` |
| `:max_breadcrumbs` | `integer` | `100` | Max breadcrumbs stored per process |
| `:dedup_events` | `boolean` | `true` | Deduplicate identical events within ~30 seconds |
| `:tags` | `map` | `%{}` | Global tags sent with every event |
| `:enable_source_code_context` | `boolean` | `false` | Include source lines around errors |
| `:root_source_code_paths` | `[path]` | `[]` | Required when source context is enabled |
| `:in_app_otp_apps` | `[atom]` | `[]` | OTP apps whose modules appear as "in-app" in stacktraces |

## Code Examples

### Basic setup

```elixir
# config/config.exs
config :sentry,
  dsn: System.get_env("SENTRY_DSN"),
  environment_name: config_env(),
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()],
  in_app_otp_apps: [:my_app]
```

### Capturing exceptions

Always pass `stacktrace: __STACKTRACE__` in rescue blocks — Elixir only populates `__STACKTRACE__` inside a `rescue` or `catch` clause:

```elixir
try do
  perform_risky_operation()
rescue
  exception ->
    Sentry.capture_exception(exception, stacktrace: __STACKTRACE__)
    reraise exception, __STACKTRACE__
end
```

With extra context:

```elixir
try do
  process_order(order_id)
rescue
  exception ->
    Sentry.capture_exception(exception,
      stacktrace: __STACKTRACE__,
      extra: %{order_id: order_id},
      tags: %{region: "us-east-1"},
      level: :error
    )
end
```

### Capturing messages

```elixir
# Simple message
Sentry.capture_message("Payment gateway timeout")

# With context
Sentry.capture_message("Queue depth exceeded threshold",
  extra: %{depth: 5000, limit: 1000},
  tags: %{queue: "payments"},
  level: :warning
)

# With interpolation (since v10.1.0)
Sentry.capture_message("Failed to process user %s after %d attempts",
  interpolation_parameters: [user_id, attempt_count]
)
```

### Context enrichment with `Sentry.Context`

Context is stored per-process (in Logger metadata). Set it early in request handling — in a Plug, LiveView mount, or GenServer handler:

```elixir
# Set user identity
Sentry.Context.set_user_context(%{
  id: current_user.id,
  username: current_user.username,
  email: current_user.email,
  ip_address: "{{auto}}"   # Sentry infers from request headers
})

# Set tags (searchable in Sentry)
Sentry.Context.set_tags_context(%{
  subscription_tier: "pro",
  region: "us-east-1"
})

# Set extra context (not searchable — use tags for filtering)
Sentry.Context.set_extra_context(%{
  order_id: "abc-123",
  items_count: 5
})

# Set request context (URL, method, headers)
Sentry.Context.set_request_context(%{
  url: conn.request_path,
  method: conn.method,
  headers: Enum.into(conn.req_headers, %{})
})

# Add a breadcrumb
Sentry.Context.add_breadcrumb(%{
  category: "auth",
  message: "User authenticated",
  level: :info,
  data: %{method: "oauth2", provider: "github"}
})
```

> **Important:** `Sentry.Context` data is scoped to the current process only. It is NOT automatically propagated to spawned `Task` or `GenServer` processes. For async work, pass context values explicitly.

### Context in a Phoenix controller (via Plug)

```elixir
defmodule MyAppWeb.Plugs.SentryContext do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    if user = conn.assigns[:current_user] do
      Sentry.Context.set_user_context(%{
        id: user.id,
        username: user.username,
        email: user.email
      })
    end

    Sentry.Context.set_request_context(%{
      url: Phoenix.Controller.current_url(conn),
      method: conn.method,
      headers: Enum.into(conn.req_headers, %{})
    })

    conn
  end
end

# In your router pipeline:
pipeline :browser do
  plug :accepts, ["html"]
  plug :fetch_session
  plug :put_secure_browser_headers
  plug MyAppWeb.Plugs.SentryContext
end
```

### Breadcrumbs

```elixir
Sentry.Context.add_breadcrumb(%{
  type: "http",
  category: "http",
  message: "GET https://api.stripe.com/v1/charges",
  level: :info,
  data: %{
    url: "https://api.stripe.com/v1/charges",
    method: "GET",
    status_code: 200
  }
})

Sentry.Context.add_breadcrumb(%{
  category: "db.query",
  message: "SELECT * FROM orders WHERE id = ?",
  level: :debug,
  data: %{duration_ms: 42}
})
```

### Before-send hook

Use `:before_send` to mutate or drop events before they are sent:

```elixir
defmodule MyApp.SentryHooks do
  def before_send(event) do
    # Drop events from test/health endpoints
    if get_in(event, [:request, :url]) |> String.contains?("/health") do
      nil   # return nil or false to drop the event
    else
      # Scrub PII from request headers
      event = put_in(event, [:request, :headers, "authorization"], "[FILTERED]")
      # Enrich with deployment metadata
      put_in(event, [:extra, :deploy_sha], System.get_env("GIT_SHA"))
    end
  end
end

# config/config.exs
config :sentry,
  before_send: {MyApp.SentryHooks, :before_send}
```

### Custom event filter

`Sentry.EventFilter` is called before `before_send` and before sampling. Returning `true` from `exclude_exception?/2` silently drops the event:

```elixir
defmodule MyApp.SentryFilter do
  @behaviour Sentry.EventFilter

  @impl Sentry.EventFilter
  def exclude_exception?(%MyApp.NotFoundError{}, _source), do: true
  def exclude_exception?(%MyApp.ValidationError{}, _source), do: true
  def exclude_exception?(exception, source) do
    # Delegate other exceptions to the default filter
    Sentry.DefaultEventFilter.exclude_exception?(exception, source)
  end
end

# config/config.exs
config :sentry, filter: MyApp.SentryFilter
```

`Sentry.DefaultEventFilter` already excludes common Phoenix/Plug noise:
- `Ecto.NoResultsError`
- `Phoenix.Router.NoRouteError`
- `Plug.Parsers.BadEncodingError`, `ParseError`, `RequestTooLargeError`, `UnsupportedMediaTypeError`

### Fingerprinting and custom grouping

Override Sentry's default grouping algorithm via `before_send`:

```elixir
def before_send(%{exception: [%{type: "MyApp.DatabaseError"} | _]} = event) do
  %{event | fingerprint: ["database-connection", event.extra[:db_host]]}
end

def before_send(event) do
  # Extend default grouping with additional discriminators
  if event.exception != [] do
    %{event | fingerprint: ["{{ default }}", System.get_env("RELEASE_NODE")]}
  else
    event
  end
end
```

### Attachments (since v10.1.0)

```elixir
Sentry.Context.add_attachment(%Sentry.Attachment{
  filename: "debug.log",
  data: File.read!("debug.log")
})

# Then capture the exception as usual
Sentry.capture_exception(exception, stacktrace: __STACKTRACE__)
```

### Flush pending events

```elixir
# Default 5-second timeout
Sentry.flush()

# Custom timeout
Sentry.flush(timeout: 10_000)
```

## Source Code Context in Production

Without packaging, production releases strip source code — Sentry cannot show the lines around an error. Package your source before building:

```bash
# Run before mix release
mix sentry.package_source_code
```

OTP 28 compatibility — use string patterns instead of compiled regexps:

```elixir
# config/config.exs
config :sentry,
  source_code_exclude_patterns: ["/_build/", "/deps/", "/priv/", "/test/"]
```

## `send_result` Types

| Value | Description |
|-------|-------------|
| `{:ok, event_id}` | Event sent successfully (`:send_result: :sync` only) |
| `:ignored` | Not sent (no DSN, filtered, sampled out) |
| `:excluded` | Dropped by `EventFilter` |
| `{:error, ClientError.t()}` | HTTP-level send error |

## Best Practices

- Always pass `stacktrace: __STACKTRACE__` in rescue blocks — stacktraces are not automatically captured in Elixir
- Set `in_app_otp_apps: [:my_app]` to distinguish your code from library code in Sentry's issue grouping
- Use `Sentry.Context.set_user_context/1` early in the request lifecycle (e.g., in a Plug) so every event from that process includes user identity
- Use `Sentry.EventFilter` for structural filtering (known non-errors), and `before_send` for event mutation or conditional dropping
- Run `mix sentry.package_source_code` as part of your release build process so production stacktraces show source lines

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No stack trace on captured exception | Add `stacktrace: __STACKTRACE__` to `capture_exception/2` inside the rescue block |
| Events not appearing | Set `log_level: :debug`; check DSN; call `Sentry.flush/1` before process exit |
| All events showing "in-app: false" | Set `in_app_otp_apps: [:my_app]` in config to mark your app's modules as in-app |
| Context missing from async events | `Sentry.Context` is process-scoped — pass data explicitly to spawned tasks/GenServers |
| `before_send` not dropping events | Ensure function returns `nil` or `false` (not an empty map) to drop the event |
| Duplicate events (Cowboy + LoggerHandler) | Set `excluded_domains: [:cowboy]` in `LoggerHandler` config (default behavior) |
