# Logging — Sentry PHP SDK

> Minimum SDK versions: `sentry/sentry-php` ≥ 4.12.0 · `sentry/sentry-laravel` ≥ 4.15.0 · `sentry/sentry-symfony` ≥ 5.4.0

## Overview

Sentry PHP structured logs are **separate from error reporting**. They produce searchable log records in the Sentry Logs UI. The feature must be explicitly enabled with `enable_logs: true`.

## Configuration

### PHP (base SDK)

```php
\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'enable_logs' => true,
]);
```

### Laravel (`.env`)

```bash
LOG_CHANNEL=stack
LOG_STACK=single,sentry_logs
SENTRY_ENABLE_LOGS=true
LOG_LEVEL=info
SENTRY_LOG_LEVEL=warning    # optional: Sentry-specific threshold
```

`config/sentry.php`:
```php
'enable_logs' => env('SENTRY_ENABLE_LOGS', false),
'logs_channel_level' => env('SENTRY_LOG_LEVEL', env('LOG_LEVEL', 'debug')),
```

> For SDK versions ≤ 4.16.0, also add `sentry_logs` to `config/logging.php` channels manually. Versions > 4.16.0 auto-register it.

### Symfony (`config/packages/sentry.yaml` + `monolog.yaml`)

```yaml
# config/packages/sentry.yaml
sentry:
  options:
    enable_logs: true
```

```yaml
# config/packages/monolog.yaml
monolog:
  handlers:
    sentry_logs:
      type: service
      id: Sentry\SentryBundle\Monolog\LogsHandler
```

```yaml
# config/services.yaml
services:
  Sentry\SentryBundle\Monolog\LogsHandler:
    arguments:
      - !php/const Monolog\Logger::INFO
```

## Code Examples

### PHP — direct logger API

```php
\Sentry\logger()->trace('Starting request processing');
\Sentry\logger()->debug('Cache lookup for key %s', values: ['user:42']);
\Sentry\logger()->info('User logged in');
\Sentry\logger()->warn('Rate limit approaching for %s', values: ['/api/v1/users']);
\Sentry\logger()->error('Payment failed for order %s', values: [$orderId]);
\Sentry\logger()->fatal('Database connection pool exhausted');

// Must flush at end of script (CLI) or long-running processes
\Sentry\logger()->flush();
```

### PHP — with custom attributes

```php
\Sentry\logger()->warn('This is a warning log with attributes.', attributes: [
    'attribute1' => 'string',
    'attribute2' => 1,
    'attribute3' => 1.0,
    'attribute4' => true,
]);
```

### PHP — Monolog bridge

```php
use Monolog\Level;
use Monolog\Logger;

\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'enable_logs' => true,
]);

$log = new Logger('app');
$log->pushHandler(new \Sentry\Monolog\LogsHandler(
    hub: \Sentry\SentrySdk::getCurrentHub(),
    level: Level::Info,
));

$log->info('Application started');
$log->error('Something went wrong', ['user_id' => 42]);

\Sentry\logger()->flush();
```

### Laravel — Laravel Log facade

```php
use Illuminate\Support\Facades\Log;

Log::info('This is an info message');
Log::warning('User {id} failed to login.', ['id' => $user->id]);
Log::error('Payment failed', [
    'user_id' => auth()->id(),
    'order_id' => $orderId,
]);

// Send only to Sentry (not to other channels)
Log::channel('sentry_logs')->error('Critical failure in payment module');
```

### Symfony — via injected LoggerInterface

```php
// Inject via constructor or autowiring
$this->logger->info('User {id} logged in', ['id' => $userId]);
$this->logger->warning('Slow query detected', ['duration_ms' => 850]);
$this->logger->error('Payment processing failed', [
    'user_id' => $userId,
    'action' => 'checkout',
]);
```

### Filtering with `before_send_log`

**PHP / Laravel:**
```php
\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'enable_logs' => true,
    'before_send_log' => function (\Sentry\Logs\Log $log): ?\Sentry\Logs\Log {
        if ($log->getLevel() === \Sentry\Logs\LogLevel::info()) {
            return null;  // drop info logs
        }
        return $log;
    },
]);
```

**Symfony** (uses service ID, not a closure):
```yaml
sentry:
  options:
    before_send_log: "sentry.callback.before_send_log"
```

```php
// App\Service\Sentry
public function getBeforeSendLog(): callable
{
    return function (\Sentry\Logs\Log $log): ?\Sentry\Logs\Log {
        if ($log->getLevel() === \Sentry\Logs\LogLevel::info()) {
            return null;
        }
        return $log;
    };
}
```

## Two Log Channel Types in Laravel

| Channel | Driver | Purpose |
|---------|--------|---------|
| `sentry` | `sentry` | Sends log messages as Sentry **error events/breadcrumbs** |
| `sentry_logs` | `sentry_logs` | Sends **structured logs** to the Sentry Logs product |

These are independent — use `sentry_logs` for the structured logs feature.

## Log Levels

| Method | PSR Level |
|--------|-----------|
| `trace()` | debug |
| `debug()` | debug |
| `info()` | info |
| `warn()` | warning |
| `error()` | error |
| `fatal()` | critical |

## Automatically Added Attributes

Every log record receives these automatically:

| Attribute | Description |
|-----------|-------------|
| `sentry.environment` | Environment from SDK config |
| `sentry.release` | Release from SDK config |
| `sentry.sdk.name` / `sentry.sdk.version` | SDK metadata |
| `sentry.server.address` | Server hostname |
| `sentry.message.template` | Parameterized template string |
| `sentry.message.parameter.N` | Template parameter values |
| `user.id`, `user.name`, `user.email` | Active scope user (if set) |
| `sentry.origin` | Log origin (e.g., `auto.log.monolog`) |

## Flushing

Logs are buffered and must be flushed to be sent:

| Context | Behavior |
|---------|----------|
| PHP (CLI/scripts) | Call `\Sentry\logger()->flush()` manually at end of execution |
| Laravel | Auto-flushed via `app->terminating()` callback |
| Symfony (HTTP) | Auto-flushed on `kernel.terminate` by `LogRequestListener` |
| Symfony (console) | Auto-flushed on `console.terminate` by `ConsoleListener` |

**Long-running CLI tasks:** Call `\Sentry\logger()->flush()` periodically to avoid memory buildup.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing | Verify `enable_logs: true` and that `\Sentry\logger()->flush()` is called |
| Laravel logs missing | Check `LOG_STACK` includes `sentry_logs` and `LOG_LEVEL` permits expected messages |
| Symfony logs missing | Verify `LogsHandler` is registered in `monolog.yaml` and `enable_logs: true` is set |
| Tinker session missing logs | Manually call `\Sentry\logger()->flush()` — Tinker skips normal lifecycle |
| Info logs filtered out | Check `before_send_log` callback and `SENTRY_LOG_LEVEL` threshold |
