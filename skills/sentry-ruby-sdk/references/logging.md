# Logging — Sentry Ruby SDK

> Minimum SDK: `sentry-ruby` v5.27.0+
> Logs are sent as independent events to Sentry Logs — separate from breadcrumbs and error events.

## Contents

- [Configuration](#configuration)
- [Logging Methods](#logging-methods)
- [Filtering Logs](#filtering-logs)
- [Breadcrumb Loggers](#breadcrumb-loggers)
- [Ruby stdlib Logger integration](#ruby-stdlib-logger-integration)
- [Rails Logger](#rails-logger)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Configuration

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `enable_logs` | Boolean | `false` | Enable Sentry structured Logs — must be `true` |
| `before_send_log` | Lambda | `nil` | Mutate or drop log events before sending |
| `breadcrumbs_logger` | Array | `[]` | Loggers for automatic breadcrumbs (separate from Sentry Logs) |

```ruby
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.enable_logs = true  # required — disabled by default
end
```

## Logging Methods

`Sentry.logger` provides six levels:

```ruby
Sentry.logger.trace("entering payment flow")
Sentry.logger.debug("cache miss for key: %{key}", key: cache_key)
Sentry.logger.info("User %{name} logged in", name: user.email)
Sentry.logger.warn("Retry %{attempt} of %{max}", attempt: 3, max: 5)
Sentry.logger.error("Payment failed: %{message}", message: e.message)
Sentry.logger.fatal("Database unreachable — shutting down")
```

### Parameterized messages

Use `%{key}` named parameters. Parameters are sent as structured attributes, enabling filtering and aggregation in Sentry:

```ruby
# Named parameters (preferred)
Sentry.logger.info(
  "Order %{order_id} placed for %{amount}",
  order_id: order.id,
  amount: order.total
)

# Positional parameters
Sentry.logger.info("Order %s placed", [order.id])
```

### Extra attributes

Pass keyword arguments beyond the message to attach searchable data:

```ruby
Sentry.logger.error(
  "Failed to process payment for order %{order_id}",
  order_id: order.id,
  amount: order.total,
  payment_provider: "stripe",
  error_code: stripe_error.code
)
```

## Filtering Logs

```ruby
config.before_send_log = lambda do |log|
  # Drop debug-level logs in production
  return nil if log.level == :debug

  # Scrub sensitive content
  log.message = log.message.gsub(/token=\S+/, "token=[FILTERED]")

  log
end
```

### `before_send_log` parameter

The `log` argument passed to the callback exposes:

| Property | Type | Description |
|----------|------|-------------|
| `level` | Symbol | `:trace`, `:debug`, `:info`, `:warn`, `:error`, `:fatal` |
| `message` | String | The formatted log message |
| `body` | String | Raw template string (e.g., `"Order %{order_id} placed"`) |
| `attributes` | Hash | Structured parameters passed as keyword arguments |

## Breadcrumb Loggers

Breadcrumbs are different from Sentry Logs — they are attached to the next error event, not sent independently. See `error-monitoring.md` for the full logger table and configuration options.

```ruby
config.breadcrumbs_logger = [:active_support_logger, :http_logger, :redis_logger, :sentry_logger]
```

### Filtering breadcrumbs

```ruby
config.before_breadcrumb = lambda do |breadcrumb, hint|
  # Drop Redis noise in high-traffic environments
  return nil if breadcrumb.category == "redis"
  breadcrumb
end
```

## Ruby stdlib Logger integration

Capture writes from existing Ruby `Logger` instances as Sentry breadcrumbs. This requires enabling the `:logger` patch first — without it `std_lib_logger_filter` is never called:

```ruby
config.breadcrumbs_logger = [:sentry_logger]
config.enabled_patches << :logger   # required — activates the Logger patch

# Optional: filter by severity
config.std_lib_logger_filter = proc do |logger, message, severity|
  [:error, :fatal].include?(severity)
end
```

## Rails Logger

In Rails, `Rails.logger` writes automatically appear as breadcrumbs when `:active_support_logger` is enabled — no extra configuration needed.

To also send key Rails log lines as Sentry Logs (not just breadcrumbs), call `Sentry.logger` explicitly alongside your existing logging:

```ruby
Rails.logger.error("Payment failed: #{e.message}")
Sentry.logger.error("Payment failed: %{message}", message: e.message)
```

## Best Practices

- Always use parameterized messages (`%{key}` syntax) rather than string interpolation — this enables structured log aggregation and search in Sentry
- Use `Sentry.logger` for observability-grade messages (errors, key business events); let high-volume debug logging stay local
- Set `before_send_log` to drop `:trace` and `:debug` levels in production
- Combine `Sentry.logger.error(...)` with `Sentry.capture_exception(e)` for errors — the log provides context, the exception provides the stack trace

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Set `config.enable_logs = true`; verify `sentry-ruby` ≥ 5.27.0 |
| Breadcrumbs not attached to events | Check `breadcrumbs_logger` includes the right symbol for your stack |
| `Sentry.logger` call crashes | Ensure `Sentry.init` was called before `Sentry.logger` is accessed |
| High log volume | Use `before_send_log` to filter by level; set `:debug` and `:trace` to drop in production |
