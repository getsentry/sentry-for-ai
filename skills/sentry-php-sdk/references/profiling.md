# Profiling — Sentry PHP SDK

> Requires the **Excimer** PHP extension (Linux/macOS only — Windows not supported)

## Prerequisites

**Excimer extension** must be installed:

```bash
# Linux (recommended)
apt-get install php-excimer

# PECL
pecl install excimer

# Enable (if needed)
phpenmod -s fpm excimer
```

Excimer requires PHP 7.2+ and does **not** support Windows.

## Version Requirements

| Framework | Min SDK Version |
|-----------|----------------|
| PHP (base) | `sentry/sentry-php` ≥ 3.15.0 |
| Laravel | `sentry/sentry-laravel` ≥ 3.3.0 |
| Symfony | `sentry/sentry-symfony` ≥ 4.7.0 |

## Configuration

Profiling requires `traces_sample_rate > 0`. `profiles_sample_rate` is relative to `traces_sample_rate`.

### PHP (base SDK)

```php
\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'traces_sample_rate' => 1.0,
    'profiles_sample_rate' => 1.0,  // relative to traces_sample_rate
]);
```

### Laravel (`config/sentry.php`)

```php
return [
    'dsn' => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),
    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE') === null ? null : (float) env('SENTRY_TRACES_SAMPLE_RATE'),
    'profiles_sample_rate' => env('SENTRY_PROFILES_SAMPLE_RATE') === null ? null : (float) env('SENTRY_PROFILES_SAMPLE_RATE'),
];
```

`.env`:
```bash
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

### Symfony (`config/packages/sentry.yaml`)

```yaml
sentry:
  options:
    traces_sample_rate: 1.0
    profiles_sample_rate: 1.0
```

## How `profiles_sample_rate` Works

`profiles_sample_rate` is a **fraction of already-sampled transactions**, not of all requests:

```
Effective profiling rate = traces_sample_rate × profiles_sample_rate

Examples:
  traces_sample_rate: 1.0, profiles_sample_rate: 1.0  → 100% of requests profiled
  traces_sample_rate: 0.5, profiles_sample_rate: 0.5  → 25% of requests profiled
  traces_sample_rate: 0.1, profiles_sample_rate: 1.0  → 10% of requests profiled
```

## Reducing Latency Impact

Profiling data is sent to Sentry after generating the response, not before:

- **Laravel (FastCGI):** Uses terminable middleware — data sent **after** response is dispatched
- **Symfony (FastCGI):** Uses `kernel.terminate` event — same behavior
- **Non-FastCGI servers:** Use a local [Relay](https://docs.sentry.io/product/relay/) instance:

```
PHP App → local Relay (127.0.0.1) → Sentry Cloud
```

## Best Practices

- Start with `profiles_sample_rate: 1.0` in development to verify setup
- In production, reduce `traces_sample_rate` (e.g., `0.1`) — profiling follows automatically
- Profiling has no meaningful overhead on Linux with Excimer; Relay is only needed to avoid latency on non-FastCGI servers
- Profiles are capped at **30 seconds** per transaction

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles appearing | Verify Excimer is installed (`php -m \| grep excimer`) and `traces_sample_rate > 0` |
| `profiles_sample_rate has no effect` | Check SDK version meets minimum requirement |
| Windows deployment | Profiling is not supported on Windows — use Linux or macOS |
| High latency from profiling | Use FastCGI (terminable middleware) or deploy a local Relay instance |
