# Profiling — Sentry Ruby SDK

> ⚠️ **Beta** — profiling is in beta and may have bugs.
> Minimum SDK: `sentry-ruby` v5.9.0+ (StackProf), v5.21.0+ (Vernier)

Profiling attaches CPU/memory samples to Sentry transactions. It requires tracing to be enabled first — `profiles_sample_rate` is relative to `traces_sample_rate`.

## Contents

- [Choosing a profiler](#choosing-a-profiler)
- [StackProf setup](#stackprof-setup)
- [Vernier setup](#vernier-setup)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Choosing a Profiler

| Profiler | Gem | Min sentry-ruby | Min Ruby | Notes |
|----------|-----|-----------------|----------|-------|
| StackProf | `stackprof` | v5.9.0 | Any | Wall-clock or CPU sampling |
| Vernier | `vernier` | v5.21.0 | 3.2.1+ | Lower overhead; GVL-aware |

Vernier is preferred for Ruby 3.2.1+ applications. Use StackProf for older Ruby versions.

### GVL-aware profiling (Vernier)

Ruby's Global VM Lock (GVL) means only one thread executes Ruby code at a time. StackProf only samples the thread holding the GVL, so multi-threaded apps (Puma, Sidekiq) show incomplete profiles. Vernier is GVL-aware — it tracks all threads including those waiting on I/O or the GVL, giving a complete picture of where time is spent across the entire process.

### Production overhead

Both profilers use sampling (not tracing), so overhead is low. Expect ~2-5% CPU overhead per profiled transaction. Use `profiles_sample_rate` to control how many transactions are profiled — start with `0.1` in production and adjust based on your performance budget.

## StackProf Setup

```ruby
# Gemfile
gem "sentry-ruby"
gem "sentry-rails"   # if Rails
gem "stackprof"
```

```ruby
# config/initializers/sentry.rb (Rails) or Sentry.init block
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.traces_sample_rate = 1.0    # tracing must be enabled
  config.profiles_sample_rate = 1.0  # relative to traces_sample_rate
end
```

## Vernier Setup

```ruby
# Gemfile
gem "sentry-ruby"
gem "sentry-rails"   # if Rails
gem "vernier"
```

```ruby
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]
  config.traces_sample_rate = 1.0
  config.profiles_sample_rate = 1.0
  config.profiler_class = Sentry::Vernier::Profiler  # opt into Vernier
end
```

## Configuration

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `profiles_sample_rate` | Float | `nil` | Fraction of sampled transactions that include a profile [0.0–1.0] |
| `profiler_class` | Class | StackProf profiler | Set to `Sentry::Vernier::Profiler` to use Vernier |

`profiles_sample_rate` is **relative** to `traces_sample_rate`. With `traces_sample_rate = 0.1` and `profiles_sample_rate = 0.5`, 5% of total transactions include a profile.

## Best Practices

- Start with `profiles_sample_rate = 1.0` in development to verify profiles appear in Sentry
- Lower to `0.1`–`0.5` in production — profiling adds overhead per sampled transaction
- Prefer Vernier on Ruby 3.2.1+ for lower overhead and GVL visibility
- Profiling without tracing is not supported — ensure `traces_sample_rate > 0`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles in Sentry | Verify `traces_sample_rate > 0` — profiling requires tracing to be active |
| `Sentry::Vernier::Profiler` not found | Ensure `vernier` gem is installed and `sentry-ruby` ≥ 5.21.0 |
| StackProf missing constant error | Add `gem "stackprof"` to Gemfile and run `bundle install` |
| Profiles on some requests only | Expected — `profiles_sample_rate` is a fraction of sampled transactions, not all requests |
| Beta instability | Check [sentry-ruby releases](https://github.com/getsentry/sentry-ruby/releases) for fixes; report issues there |
