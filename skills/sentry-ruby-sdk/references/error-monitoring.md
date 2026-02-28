# Error Monitoring — Sentry Ruby SDK

> Minimum SDK: `sentry-ruby` gem 5.0.0+

## Contents

- [Configuration](#configuration)
- [Code Examples](#code-examples)
- [Scope API Reference](#scope-api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Configuration

Key `Sentry.init` options for error monitoring:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `send_default_pii` | `Boolean` | `false` | Include request headers, IP addresses |
| `sample_rate` | `Float` | `1.0` | Error event sample rate (0.0–1.0) |
| `excluded_exceptions` | `Array` | common 4xx | Exception classes to ignore |
| `include_local_variables` | `Boolean` | `false` | Capture local variables from exception frames |
| `max_breadcrumbs` | `Integer` | `100` | Max breadcrumbs per event |
| `before_send` | `Lambda` | `nil` | Mutate or drop error events before sending |
| `before_breadcrumb` | `Lambda` | `nil` | Mutate or drop breadcrumbs |

## Code Examples

### Automatic capture

**Rails** (`sentry-rails`): exceptions in controllers, background jobs, and mailers are captured automatically — no extra code needed.

**Rack / Sinatra**: register the middleware once and all unhandled exceptions are captured:

```ruby
use Sentry::Rack::CaptureExceptions
```

### Manual capture

```ruby
# Capture any exception
begin
  risky_operation
rescue => e
  Sentry.capture_exception(e)
  raise  # re-raise if you want normal error handling to continue
end

# Capture a plain message (no exception)
Sentry.capture_message("payment gateway unreachable", level: :warning)
```

### User identification

```ruby
# Set user context — call in a Rails before_action or Rack middleware
Sentry.set_user(
  id: current_user.id,
  email: current_user.email,
  username: current_user.username
)

# Clear the user (e.g., on sign-out)
Sentry.set_user({})
```

### Tags, context, and extras

```ruby
# Tags — indexed, filterable in Sentry search
Sentry.set_tags(region: "us-east-1", plan: "enterprise")

# Context — structured data attached to events (not indexed)
Sentry.set_context("order", { id: order.id, total: order.total, currency: "USD" })

# Extras — deprecated; prefer set_context for structured data
Sentry.set_extras(raw_payload: payload.inspect)
```

### Isolated scope with `with_scope`

Changes inside `with_scope` are discarded after the block — ideal for one-off enrichment without polluting subsequent events:

```ruby
Sentry.with_scope do |scope|
  scope.set_tags(component: "checkout", payment_provider: "stripe")
  scope.set_user(id: order.user_id)
  Sentry.capture_exception(e)
end
# ← scope changes above do NOT affect subsequent events
```

### Persistent scope with `configure_scope`

```ruby
Sentry.configure_scope do |scope|
  scope.set_tags(app_version: APP_VERSION)
  scope.set_user(id: current_user.id)
end
# These values apply to all subsequent events in this request/fiber
```

### Rails: per-request context via `before_action`

```ruby
class ApplicationController < ActionController::Base
  before_action :set_sentry_context

  private

  def set_sentry_context
    return unless current_user
    Sentry.set_user(id: current_user.id, email: current_user.email)
    Sentry.set_tags(tenant: current_user.account.slug)
  end
end
```

### Breadcrumbs

```ruby
crumb = Sentry::Breadcrumb.new(
  category: "auth",
  message: "User #{user.email} authenticated",
  level: "info"
)
Sentry.add_breadcrumb(crumb)
```

Automatic breadcrumbs are recorded when `breadcrumbs_logger` is configured:

```ruby
config.breadcrumbs_logger = [:active_support_logger, :http_logger, :redis_logger]
```

| Logger | Captures |
|--------|----------|
| `:active_support_logger` | Rails controller actions, SQL queries, mailer events |
| `:http_logger` | Outbound Net::HTTP requests |
| `:redis_logger` | Redis commands |
| `:sentry_logger` | Ruby `Logger` writes |

### `before_send` hook

```ruby
Sentry.init do |config|
  config.before_send = lambda do |event, hint|
    # Drop ZeroDivisionError
    if hint[:exception].is_a?(ZeroDivisionError)
      next nil  # return nil to discard the event
    end

    # Custom fingerprint for database errors
    if hint[:exception].is_a?(ActiveRecord::StatementInvalid)
      event.fingerprint = ["database-error", hint[:exception].message.split("\n").first]
    end

    # Scrub sensitive fields from the request body
    event.request&.data&.delete("credit_card_number")

    event
  end
end
```

### Exception filters

```ruby
config.excluded_exceptions += [
  "ActionController::RoutingError",
  "ActiveRecord::RecordNotFound",
  "Rack::QueryParser::InvalidParameterError"
]
```

### Local variable capture

```ruby
config.include_local_variables = true
```

Captures local variables from the frames in the exception backtrace. Useful for debugging hard-to-reproduce errors. Evaluate privacy implications before enabling in production.

### Custom fingerprinting

```ruby
# One-off — override grouping for a specific capture
Sentry.with_scope do |scope|
  scope.set_fingerprint(["database-connection-error"])
  Sentry.capture_exception(e)
end

# Extend default grouping in before_send
config.before_send = lambda do |event, hint|
  if hint[:exception].is_a?(MyWorker::JobError)
    event.fingerprint = ["{{ default }}", hint[:exception].job_class]
  end
  event
end
```

## Scope API Reference

```ruby
# Shorthand module methods (operate on current scope)
Sentry.set_user(id:, email:, username:, ip_address:)
Sentry.set_tags(key: "value")
Sentry.set_context("key", { field: "value" })
Sentry.set_extras(key: "value")  # deprecated — prefer set_context

# Scope instance methods (inside with_scope / configure_scope blocks)
scope.set_tags(key: "value")
scope.set_user(id: "42", email: "user@example.com")
scope.set_context("key", { field: "value" })
scope.set_level(:error)            # :debug | :info | :warning | :error | :fatal
scope.set_fingerprint(["my-group"])
scope.clear
```

## Best Practices

- Call `Sentry.init` in `config/initializers/sentry.rb` (Rails) or at the top of `config.ru` before any middleware
- Use `Sentry.with_scope` for one-off context; use `configure_scope` for persistent request context
- Set user in a Rails `before_action` so every exception in that request includes user info
- Use `excluded_exceptions` to filter out expected 4xx errors and keep signal-to-noise high
- Enable `include_local_variables` in development/staging; evaluate privacy implications for production

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `config.debug = true`; check DSN; ensure `Sentry.init` is called before exceptions occur |
| Rails exceptions missing | Use `sentry-rails` gem — `sentry-ruby` alone does not hook Rails error handlers |
| Missing request context | Set `config.send_default_pii = true` |
| `before_send` not called for transactions | Use `before_send_transaction` for performance events |
| Error captured but wrong user | Ensure `set_user` runs in a `before_action` before the exception is raised |
| Noise from routing errors | Add `"ActionController::RoutingError"` to `excluded_exceptions` |
