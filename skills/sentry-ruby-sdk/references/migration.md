# Migrating to Sentry — Ruby SDK

> Minimum SDK: `sentry-ruby` v5.0.0+ (Rails: also add `sentry-rails`)
> Covers migrations from: AppSignal, Honeybadger, Bugsnag, Rollbar, Airbrake

## Contents

- [Step 1: Detect What's in the Codebase](#step-1-detect-whats-in-the-codebase)
- [AppSignal → Sentry](#appsignal--sentry)
- [Honeybadger → Sentry](#honeybadger--sentry)
- [Bugsnag → Sentry](#bugsnag--sentry)
- [Rollbar → Sentry](#rollbar--sentry)
- [Airbrake → Sentry](#airbrake--sentry)
- [Universal Migration Checklist](#universal-migration-checklist)
- [Troubleshooting](#troubleshooting)

## Step 1: Detect What's in the Codebase

```bash
# Find competitor gems
grep -iE '\bappsignal\b|\bhoneybadger\b|\bbugsnag\b|\brollbar\b|\bairbrake\b' Gemfile Gemfile.lock 2>/dev/null

# Find call sites across the app
grep -rn "Appsignal\.\|Honeybadger\.\|Bugsnag\.\|Rollbar\.\|Airbrake\." \
  app/ lib/ config/ --include="*.rb" | grep -v "_spec\|_test"

# Find config files to remove after migration
ls config/appsignal.yml \
   config/honeybadger.yml .honeybadger.yml \
   config/initializers/bugsnag.rb \
   config/initializers/rollbar.rb \
   config/initializers/airbrake.rb 2>/dev/null
```

---

## AppSignal → Sentry

**Gemfile:**
```ruby
# Remove:
gem "appsignal"

# Add:
gem "sentry-ruby"
gem "sentry-rails"     # if Rails
gem "sentry-sidekiq"   # if Sidekiq
```

**Delete:** `config/appsignal.yml`, `config/initializers/appsignal.rb`

### API mapping

| AppSignal | Sentry |
|-----------|--------|
| `Appsignal.report_error(e)` | `Sentry.capture_exception(e)` |
| `Appsignal.send_error(e)` | `Sentry.capture_exception(e)` |
| `Appsignal.set_error(e)` | `Sentry.capture_exception(e)` |
| `Appsignal.listen_for_error { }` | `begin … rescue => e; Sentry.capture_exception(e); raise; end` |
| `Appsignal.tag_request(key: val)` | `Sentry.set_tags(key: val)` |
| `Appsignal.add_tags(key: val)` | `Sentry.set_tags(key: val)` |
| `Appsignal.add_custom_data(hash)` | `Sentry.set_context("custom", hash)` |
| `Appsignal.set_action("name")` | `Sentry.get_current_scope.set_transaction_name("name")` |
| `Appsignal.add_breadcrumb(cat, action, msg)` | `Sentry.add_breadcrumb(Sentry::Breadcrumb.new(category: cat, message: msg))` |
| `Appsignal.instrument("name") { }` | `Sentry.with_child_span(op: "name") { }` |
| `Appsignal.set_gauge("m", val, tags)` | `Sentry.metrics.gauge("m", val, attributes: tags)` |
| `Appsignal.increment_counter("m", val, tags)` | `Sentry.metrics.count("m", value: val, attributes: tags)` |

### Find call sites

```bash
grep -rn "Appsignal\.\(report_error\|send_error\|set_error\|listen_for_error\|tag_request\|add_tags\|add_custom_data\|instrument\|set_gauge\|increment_counter\)" \
  app/ lib/ --include="*.rb"
```

### Initializer

```ruby
# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  config.send_default_pii = true
  config.traces_sample_rate = 1.0
  config.enable_logs = true
end
```

---

## Honeybadger → Sentry

**Gemfile:**
```ruby
# Remove:
gem "honeybadger"

# Add:
gem "sentry-ruby"
gem "sentry-rails"
```

**Delete:** `config/honeybadger.yml`, `.honeybadger.yml`, `config/initializers/honeybadger.rb`

### API mapping

| Honeybadger | Sentry |
|-------------|--------|
| `Honeybadger.notify(e)` | `Sentry.capture_exception(e)` |
| `Honeybadger.notify("message")` | `Sentry.capture_message("message")` |
| `Honeybadger.notify(e, context: hash)` | `Sentry.with_scope { \|s\| s.set_context("ctx", hash); Sentry.capture_exception(e) }` |
| `Honeybadger.context(key: val)` | `Sentry.set_tags(key: val)` |
| `Honeybadger.context { \|c\| c[:key] = val }` | `Sentry.configure_scope { \|s\| s.set_context("app", {key: val}) }` |
| `Honeybadger.context.clear!` | `Sentry.get_current_scope.clear` |
| `Honeybadger.add_breadcrumb(msg, metadata: h)` | `Sentry.add_breadcrumb(Sentry::Breadcrumb.new(message: msg, data: h))` |
| `Honeybadger.exception_filter { \|n\| n.halt! if … }` | `config.before_send = lambda { \|e, _h\| nil if … }` |

### Find call sites

```bash
grep -rn "Honeybadger\.\(notify\|context\|add_breadcrumb\|exception_filter\)" \
  app/ lib/ --include="*.rb"
```

---

## Bugsnag → Sentry

**Gemfile:**
```ruby
# Remove:
gem "bugsnag"

# Add:
gem "sentry-ruby"
gem "sentry-rails"     # if Rails
gem "sentry-sidekiq"   # if Sidekiq
```

**Delete:** `config/initializers/bugsnag.rb`

### API mapping

| Bugsnag | Sentry |
|---------|--------|
| `Bugsnag.notify(e)` | `Sentry.capture_exception(e)` |
| `Bugsnag.notify(e) { \|event\| event.severity = "warning" }` | `Sentry.capture_exception(e, level: :warning)` |
| `Bugsnag.notify(e) { \|event\| event.add_metadata(:ctx, hash) }` | `Sentry.with_scope { \|s\| s.set_context("ctx", hash); Sentry.capture_exception(e) }` |
| `Bugsnag.notify(e) { \|event\| event.set_user(id, email, name) }` | `Sentry.set_user(id: id, email: email, username: name)` |
| `Bugsnag.leave_breadcrumb(name, meta, type)` | `Sentry.add_breadcrumb(Sentry::Breadcrumb.new(message: name, data: meta, category: type))` |
| `Bugsnag.add_metadata(:section, hash)` | `Sentry.set_context("section", hash)` |
| `Bugsnag.configure { \|c\| c.discard_classes << "MyError" }` | `config.before_send = lambda { \|e, h\| h[:exception].is_a?(MyError) ? nil : e }` |
| `event.ignore!` (in on_error callback) | Return `nil` from `config.before_send` |

### Find call sites

```bash
grep -rn "Bugsnag\.\(notify\|leave_breadcrumb\|add_metadata\|clear_metadata\|start_session\)" \
  app/ lib/ --include="*.rb"
```

---

## Rollbar → Sentry

**Gemfile:**
```ruby
# Remove:
gem "rollbar"

# Add:
gem "sentry-ruby"
gem "sentry-rails"     # if Rails
gem "sentry-sidekiq"   # if Sidekiq
```

**Delete:** `config/initializers/rollbar.rb`

### API mapping

| Rollbar | Sentry |
|---------|--------|
| `Rollbar.error(e)` | `Sentry.capture_exception(e)` |
| `Rollbar.warning(msg)` | `Sentry.capture_message(msg, level: :warning)` |
| `Rollbar.info(msg, extra)` | `Sentry.with_scope { \|s\| s.set_context("extra", extra); Sentry.capture_message(msg, level: :info) }` |
| `Rollbar.critical(e)` | `Sentry.capture_exception(e, level: :fatal)` |
| `Rollbar.debug(msg)` | `Sentry.capture_message(msg, level: :debug)` |
| `Rollbar.log(level, e)` | `Sentry.capture_exception(e, level: { "critical" => :fatal }.fetch(level, level.to_sym))` |
| `Rollbar.scoped(person: p) { }` | `Sentry.with_scope { \|s\| s.set_user(p); ... }` |
| `Rollbar.scope!(person: p)` | `Sentry.set_user(p)` |
| `Rollbar.silenced { }` | `# remove — no Sentry equivalent needed` |

Rollbar uses `'warning'` level; Sentry uses `:warning`. Rollbar uses `'critical'`; map to Sentry's `:fatal`.

### Find call sites

```bash
grep -rn "Rollbar\.\(error\|warning\|warn\|info\|debug\|critical\|log\|scoped\|scope\)" \
  app/ lib/ --include="*.rb"
```

---

## Airbrake → Sentry

**Gemfile:**
```ruby
# Remove:
gem "airbrake"
gem "airbrake-ruby"    # if present separately

# Add:
gem "sentry-ruby"
gem "sentry-rails"     # if Rails
gem "sentry-sidekiq"   # if Sidekiq
```

**Delete:** `config/initializers/airbrake.rb`

Also check for and remove: `require 'airbrake/capistrano'` in `Capfile`, `require 'airbrake/rake'` in `Rakefile`, and any Sidekiq/DelayedJob/Resque middleware references.

### API mapping

| Airbrake | Sentry |
|----------|--------|
| `Airbrake.notify(e)` | `Sentry.capture_exception(e)` |
| `Airbrake.notify(e, params)` | `Sentry.with_scope { \|s\| s.set_context("params", params); Sentry.capture_exception(e) }` |
| `Airbrake.notify_sync(e)` | `Sentry.capture_exception(e)` (Sentry handles delivery asynchronously) |
| `Airbrake.notify("message")` | `Sentry.capture_message("message")` |
| `Airbrake.merge_context(hash)` | `Sentry.set_context("app", hash)` |
| `Airbrake.add_filter { \|n\| n.ignore! if ... }` | `config.before_send = lambda { \|e, _h\| ... ? nil : e }` |
| `Airbrake.add_filter(MyFilter)` | `config.before_send = lambda { \|e, _h\| ... }` |
| `notice[:context][:user_id] = id` | `Sentry.set_user(id: id)` |
| `Airbrake.notify_deploy(info)` | Use Sentry release tracking via `SENTRY_RELEASE` env var |
| `Airbrake.notify_request(...)` | Automatic via `sentry-rails` tracing |
| `Airbrake.notify_query(...)` | Automatic via `sentry-rails` ActiveRecord spans |

### Find call sites

```bash
grep -rn "Airbrake\.\(notify\|notify_sync\|merge_context\|add_filter\|notify_request\|notify_query\)" \
  app/ lib/ --include="*.rb"
```

---

## Universal Migration Checklist

Works for any tool not covered above:

```bash
# Error capture
grep -rn "\.\(notify\|report_error\|send_error\|notice_error\)" \
  app/ lib/ --include="*.rb" | grep -v "_spec\|_test"

# Context / tagging
grep -rn "\.\(context\|tag_request\|add_tags\|add_custom_attributes\)" \
  app/ lib/ --include="*.rb" | grep -v "_spec\|_test"

# Custom spans / instrumentation
grep -rn "\.\(instrument\|monitor\|in_transaction\)" \
  app/ lib/ --include="*.rb" | grep -v "_spec\|_test"

# Metric calls
grep -rn "\.\(set_gauge\|increment_counter\|record_metric\|gauge\|histogram\|timing\)" \
  app/ lib/ --include="*.rb" | grep -v "_spec\|_test"

# Environment variables to update
grep -rn "APPSIGNAL\|HONEYBADGER\|BUGSNAG\|ROLLBAR\|AIRBRAKE" \
  .env .env.* config/ --include="*.rb" --include="*.yml" 2>/dev/null
```

### Environment variable mapping

| Tool | Old env var | Sentry |
|------|-------------|--------|
| AppSignal | `APPSIGNAL_PUSH_API_KEY` | `SENTRY_DSN` |
| Honeybadger | `HONEYBADGER_API_KEY` | `SENTRY_DSN` |
| Bugsnag | `BUGSNAG_API_KEY` | `SENTRY_DSN` |
| Rollbar | `ROLLBAR_ACCESS_TOKEN` | `SENTRY_DSN` |
| Airbrake | `AIRBRAKE_PROJECT_ID` + `AIRBRAKE_PROJECT_KEY` | `SENTRY_DSN` |

### Rollout strategy

Run both tools in parallel for one release cycle, then remove the old gem once Sentry is receiving events in production.

```ruby
# Temporary dual-capture shim — remove after rollout validation:
module ErrorCapture
  def self.capture(exception, context: {})
    Sentry.with_scope do |scope|
      scope.set_context("extra", context) unless context.empty?
      Sentry.capture_exception(exception)
    end
    begin
      OldTool.notify(exception)  # replace OldTool with actual constant
    rescue => e
      Sentry.logger.warn("OldTool capture failed: %{message}", message: e.message)
    end
  end
end
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing errors after migration | Ensure `sentry-rails` is present — `sentry-ruby` alone doesn't hook Rails error handlers |
| Context missing from events | Old tools often set context via middleware; replicate with a `before_action` calling `Sentry.set_user` / `Sentry.set_tags` |
| Old gem still loading | Check `Gemfile.lock` — it may be a transitive dependency |
| Distributed traces broken | Ensure all services have migrated and propagate `sentry-trace` + `baggage` headers |
