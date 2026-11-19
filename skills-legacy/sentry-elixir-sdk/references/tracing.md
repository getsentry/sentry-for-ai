# Tracing — Sentry Elixir SDK

> Minimum SDK: `sentry` v11.0.0+ (beta); v12.0.0+ for distributed tracing and LiveView spans

Tracing in the Elixir SDK is implemented via **OpenTelemetry**. Sentry ships three OTel components: a `SpanProcessor`, a `Sampler`, and a `Propagator`. These integrate with the OpenTelemetry Elixir ecosystem so you can use any OTel-compatible instrumentation library (Phoenix, Ecto, Finch, etc.) and have all spans forwarded to Sentry.

## Configuration

### Dependencies

```elixir
# mix.exs
defp deps do
  [
    {:sentry, "~> 12.0"},
    {:finch, "~> 0.21"},
    # OpenTelemetry core
    {:opentelemetry, "~> 1.5"},
    {:opentelemetry_api, "~> 1.4"},
    {:opentelemetry_exporter, "~> 1.0"},
    {:opentelemetry_semantic_conventions, "~> 1.27"},
    # Optional: Phoenix and Ecto auto-instrumentation
    {:opentelemetry_phoenix, "~> 2.0"},
    {:opentelemetry_ecto, "~> 1.2"}
  ]
end
```

### Sentry config

Any non-nil value for `:traces_sample_rate` enables tracing. Start with `1.0` for development, lower for production:

```elixir
# config/config.exs
config :sentry,
  dsn: System.get_env("SENTRY_DSN"),
  traces_sample_rate: 1.0     # lower to 0.1 in high-traffic production
```

### OpenTelemetry config

Wire Sentry's SpanProcessor and Sampler into the OTel pipeline:

```elixir
# config/config.exs
config :opentelemetry,
  span_processor: {Sentry.OpenTelemetry.SpanProcessor, []},
  sampler: {Sentry.OpenTelemetry.Sampler, []}
```

### Distributed tracing (since v12.0.0)

Enable Sentry's propagator to inject and extract `sentry-trace` and `baggage` headers:

```elixir
# config/config.exs
config :opentelemetry,
  span_processor: {Sentry.OpenTelemetry.SpanProcessor, []},
  sampler: {Sentry.OpenTelemetry.Sampler, []},
  text_map_propagators: [
    :trace_context,
    :baggage,
    Sentry.OpenTelemetry.Propagator
  ]
```

> **Note:** Add `Sentry.OpenTelemetry.Propagator` **after** the standard `:trace_context` and `:baggage` propagators. It reads and writes the Sentry-specific `sentry-trace` and `baggage` headers so spans from Elixir connect to browser and backend spans from other Sentry SDKs.

## Sampling

### Uniform sample rate

```elixir
config :sentry,
  traces_sample_rate: 0.1   # 10% of all root spans
```

### Custom sampler function

Use `:traces_sampler` to apply per-operation logic. Overrides `:traces_sample_rate` when set:

```elixir
config :sentry,
  traces_sampler: fn sampling_context ->
    case sampling_context.transaction_context.op do
      "http.server" -> 0.1           # 10% of HTTP requests
      "db.query"    -> 0.01          # 1% of DB queries
      _             -> false         # drop everything else
    end
  end
```

### Drop specific transaction names

Use the built-in `drop` option of `Sentry.OpenTelemetry.Sampler`:

```elixir
config :opentelemetry,
  sampler: {Sentry.OpenTelemetry.Sampler, [drop: ["health_check", "liveness_check"]]}
```

## Phoenix Auto-Instrumentation

`opentelemetry_phoenix` automatically creates spans for each Phoenix request. Setup in `Application.start/2`:

```elixir
# lib/my_app/application.ex
def start(_type, _args) do
  Logger.add_handlers(:my_app)
  OpentelemetryPhoenix.setup()    # instruments Phoenix controllers and LiveView (requires opentelemetry_phoenix)
  OpentelemetryEcto.setup([:my_app, :repo])   # instruments Ecto queries (requires opentelemetry_ecto)

  children = [
    MyApp.Repo,
    MyAppWeb.Endpoint
  ]

  Supervisor.start_link(children, strategy: :one_for_one)
end
```

## How Spans Map to Sentry

| OTel span type | Sentry object |
|----------------|---------------|
| Root span (no local parent) | `Transaction` |
| Child span (has local parent) | `Span` within that transaction |
| Distributed span (remote parent, HTTP server or LiveView) | New `Transaction` root (linked via trace ID) |

Root spans are created when:
- An HTTP request arrives with no `sentry-trace` parent (or sampling says yes)
- A LiveView mounts (since v12.0.0)
- You manually start a root-level OTel span

## Custom Spans

Use the standard OpenTelemetry API for custom instrumentation:

```elixir
require OpenTelemetry.Tracer, as: Tracer

def process_order(order_id) do
  Tracer.with_span "process_order", %{attributes: [{"order.id", order_id}]} do
    # All work done inside this block is a child span
    validate_order(order_id)
    charge_payment(order_id)
    send_confirmation(order_id)
  end
end

def validate_order(order_id) do
  Tracer.with_span "validate_order", %{kind: :internal} do
    # Nested child span
    # ...
  end
end
```

### Setting span attributes

```elixir
Tracer.with_span "db.query" do
  Tracer.set_attributes([
    {"db.system", "postgresql"},
    {"db.statement", "SELECT * FROM orders WHERE id = $1"},
    {"db.rows_affected", 1}
  ])
  # run query
end
```

### Propagating context through async code

OTel context must be explicitly propagated when crossing process boundaries:

```elixir
# Capture current context before spawning
ctx = OpenTelemetry.Ctx.get_current()

Task.start(fn ->
  # Attach parent context in the new process
  OpenTelemetry.Ctx.attach(ctx)

  Tracer.with_span "async.work" do
    perform_work()
  end
end)
```

## OpenTelemetry Components Reference

| Module | OTel behaviour | Purpose |
|--------|----------------|---------|
| `Sentry.OpenTelemetry.SpanProcessor` | `:otel_span_processor` | Converts finished OTel spans into Sentry transactions/spans |
| `Sentry.OpenTelemetry.Sampler` | `:otel_sampler` | Applies `traces_sample_rate` / `traces_sampler` to root spans |
| `Sentry.OpenTelemetry.Propagator` | `:otel_propagator_text_map` | Injects/extracts `sentry-trace` and `baggage` headers |

## Best Practices

- Set `traces_sample_rate: 1.0` in development and `0.1–0.2` in production; adjust per route with `traces_sampler`
- Use the `drop:` option in `Sentry.OpenTelemetry.Sampler` to exclude health check endpoints from tracing
- Always call `OpentelemetryPhoenix.setup()` and `OpentelemetryEcto.setup/1` in `Application.start/2` before the supervision tree starts
- Propagate OTel context explicitly when spawning tasks or sending messages to other processes
- Add `Sentry.OpenTelemetry.Propagator` for distributed tracing across services — without it, backend traces won't link to browser Sentry events

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Sentry | Verify `traces_sample_rate` is set (non-nil); confirm `span_processor` is configured in `:opentelemetry` config |
| Phoenix spans missing | Call `OpentelemetryPhoenix.setup()` in `Application.start/2` before the supervision tree |
| Ecto query spans missing | Call `OpentelemetryEcto.setup([:my_app, :repo])` in `Application.start/2` |
| Distributed trace not linking | Add `Sentry.OpenTelemetry.Propagator` to `text_map_propagators`; requires v12.0.0+ |
| LiveView spans not appearing | Requires v12.0.0+ and `opentelemetry_phoenix ~> 2.0` |
| Context lost in async `Task` | Capture `OpenTelemetry.Ctx.get_current()` before spawning; call `OpenTelemetry.Ctx.attach(ctx)` inside the task |
| Too many DB spans | Use `traces_sampler` to lower sample rate for `"db.query"` operations |
