# Symfony — Sentry SDK Deep Dive

> Package: `sentry/sentry-symfony` · Requires `sentry/sentry ^4.20.0`  
> Symfony versions: `^4.4.20` through `^8.0`

---

## Installation & Setup

### Requirements

- PHP `^7.2 | ^8.0`
- Symfony `^4.4.20`–`^8.0`
- `zend.exception_ignore_args: Off` in `php.ini` (required for stack trace arguments)

### Install

```bash
composer require sentry/sentry-symfony
```

**With Symfony Flex**, this automatically:
- Registers the bundle in `config/bundles.php`
- Creates `config/packages/sentry.yaml`
- Adds `SENTRY_DSN` to `.env`

**Without Flex**, register manually:

```php
// config/bundles.php
return [
    Sentry\SentryBundle\SentryBundle::class => ['all' => true],
];
```

### Environment Variable Setup

```env
###> sentry/sentry-symfony ###
SENTRY_DSN="___PUBLIC_DSN___"
###< sentry/sentry-symfony ###
```

### Verify

```bash
php bin/console sentry:test
```

---

## `config/packages/sentry.yaml` — Complete Schema

```yaml
sentry:
    dsn: "%env(SENTRY_DSN)%"           # The ONLY mandatory option
    register_error_listener: true       # Register Symfony error event listener
    register_error_handler: true        # Register PHP error/exception handlers

    options:
        # Release & environment
        environment: "%kernel.environment%"  # Default: kernel env (not "production")
        release: "%env(default::SENTRY_RELEASE)%"
        server_name: "web-01"

        # Error monitoring
        sample_rate: 1.0
        ignore_exceptions:
            - "Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException"
            - "Symfony\\Component\\HttpKernel\\Exception\\BadRequestHttpException"
        error_types: "E_ALL & ~E_NOTICE"
        before_send: "sentry.callback.before_send"   # DIC service ID

        # Tracing
        traces_sample_rate: 0.1
        traces_sampler: "sentry.callback.traces_sampler"
        ignore_transactions:
            - "GET /health"
        before_send_transaction: "sentry.callback.before_send_transaction"
        trace_propagation_targets:
            - "example.com"

        # Profiling
        profiles_sample_rate: 0.1

        # Logs
        enable_logs: true
        before_send_log: "sentry.callback.before_send_log"

        # Metrics
        enable_metrics: true
        before_send_metric: "sentry.callback.before_send_metric"

        # Breadcrumbs
        max_breadcrumbs: 100
        before_breadcrumb: "sentry.callback.before_breadcrumb"

        # Context
        context_lines: 5
        attach_stacktrace: false
        send_default_pii: false
        max_request_body_size: "medium"   # none|never|small|medium|always
        capture_silenced_errors: false
        max_value_length: 1024
        in_app_exclude:
            - "%kernel.cache_dir%"
            - "%kernel.project_dir%/vendor"
        in_app_include:
            - "%kernel.project_dir%/src"

        # Tags
        tags:
            server: "web-01"
            region: "us-east-1"

        # Transport
        http_proxy: "proxy.example.com:8080"
        http_connect_timeout: 2
        http_timeout: 5

        # Serialization
        class_serializers:
            App\User: "App\\Sentry\\Serializer\\UserSerializer"

    # Symfony Messenger integration
    messenger:
        enabled: true
        capture_soft_fails: true
        isolate_breadcrumbs_by_message: false

    # Symfony auto-instrumentation
    tracing:
        enabled: true
        dbal:
            enabled: true
            connections:
                - default
        twig:
            enabled: true
        cache:
            enabled: true
        http_client:
            enabled: true
        console:
            excluded_commands:
                - "messenger:consume"
```

---

## Symfony-Specific Defaults

These differ from the plain PHP SDK:

| Option | Plain PHP Default | Symfony Default |
|--------|------------------|-----------------|
| `environment` | `SENTRY_ENVIRONMENT` or `"production"` | `%kernel.environment%` (kernel env) |
| `release` | `SENTRY_RELEASE` env | Auto-detected via `PrettyVersions::getRootPackageVersion()` |
| `in_app_exclude` | `[]` | Auto-includes `%kernel.cache_dir%`, `%kernel.build_dir%`, `%kernel.project_dir%/vendor` |

---

## Bundle-Level Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsn` | `scalar\|null` | `null` | Sentry DSN |
| `register_error_listener` | `boolean` | `true` | Register Symfony `ErrorListener` event subscriber on `kernel.exception` |
| `register_error_handler` | `boolean` | `true` | Register PHP-level error/exception handlers |
| `logger` | `scalar\|null` | `null` | Service ID of a PSR-3 `LoggerInterface` for SDK debug logging |

---

## Callable Options — DIC Service Pattern

Symfony's YAML configuration cannot hold inline PHP closures. All callable options must reference a **DIC service ID** whose factory method returns the callable.

```yaml
# config/packages/sentry.yaml
sentry:
  options:
    before_send: "sentry.callback.before_send"
    traces_sampler: "sentry.callback.traces_sampler"
    before_send_log: "sentry.callback.before_send_log"

# config/services.yaml
services:
  sentry.callback.before_send:
    class: 'App\Service\SentryCallbacks'
    factory: ['@App\Service\SentryCallbacks', 'getBeforeSend']

  sentry.callback.traces_sampler:
    class: 'App\Service\SentryCallbacks'
    factory: ['@App\Service\SentryCallbacks', 'getTracesSampler']

  sentry.callback.before_send_log:
    class: 'App\Service\SentryCallbacks'
    factory: ['@App\Service\SentryCallbacks', 'getBeforeSendLog']
```

```php
// src/Service/SentryCallbacks.php
namespace App\Service;

class SentryCallbacks
{
    public function getBeforeSend(): callable
    {
        return function (\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event {
            if ($hint?->exception instanceof MyIgnoredException) {
                return null;
            }
            return $event;
        };
    }

    public function getTracesSampler(): callable
    {
        return function (\Sentry\Tracing\SamplingContext $context): float {
            return $context->getParentSampled() ? 1.0 : 0.25;
        };
    }

    public function getBeforeSendLog(): callable
    {
        return function (\Sentry\Logs\Log $log): ?\Sentry\Logs\Log {
            if ($log->getLevel() === \Sentry\Logs\LogLevel::info()) {
                return null; // drop info logs
            }
            return $log;
        };
    }
}
```

This pattern applies to: `before_send`, `before_send_transaction`, `before_send_check_in`, `before_send_log`, `before_send_metric`, `before_breadcrumb`, `traces_sampler`, `transport`, `http_client`, `logger`, `class_serializers` values.

---

## Auto-Instrumented Operations

| Operation | Span Op | Requires |
|-----------|---------|---------|
| HTTP main request | `http.server` | Always |
| HTTP sub-request | `http.server` (child span) | Always |
| Console command | `console.command` | Always |
| Outbound HTTP calls | `http.client` | `symfony/http-client` |
| Doctrine DB prepare | `db.sql.prepare` | `doctrine/doctrine-bundle` |
| Doctrine DB query | `db.sql.query` | `doctrine/doctrine-bundle` |
| Doctrine DB exec | `db.sql.exec` | `doctrine/doctrine-bundle` |
| Doctrine TX begin | `db.sql.transaction.begin` | `doctrine/doctrine-bundle` |
| Doctrine TX commit | `db.sql.transaction.commit` | `doctrine/doctrine-bundle` |
| Doctrine TX rollback | `db.sql.transaction.rollback` | `doctrine/doctrine-bundle` |
| PSR-6 cache get/put/delete/flush | `cache.*` | `symfony/cache` |
| Twig template render | `view.render` | `symfony/twig-bundle` |

**Doctrine span data fields:** `db.system`, `db.user`, `db.name`, `server.address`, `server.port`

**⚠️ HTTP client tracing warning:** "Using HTTP client tracing will not execute your requests concurrently." — tracing wraps each request synchronously.

### Tracing Sub-Config

```yaml
sentry:
  tracing:
    enabled: true
    dbal:
      enabled: true
      connections: [default]         # Specify which DB connections to trace
    twig:
      enabled: true
    cache:
      enabled: true
    http_client:
      enabled: true
    console:
      excluded_commands:
        - "messenger:consume"        # Always excluded by default
        - "app:my-command"
```

---

## Structured Logs (≥ 5.4.0)

```yaml
# config/packages/monolog.yaml
monolog:
  handlers:
    sentry_logs:
      type: service
      id: Sentry\SentryBundle\Monolog\LogsHandler

# config/services.yaml
services:
  Sentry\SentryBundle\Monolog\LogsHandler:
    arguments:
      - !php/const Monolog\Logger::INFO   # Minimum log level

# config/packages/sentry.yaml
sentry:
  options:
    enable_logs: true
```

```php
// Usage — inject LoggerInterface via DI
class MyService
{
    public function __construct(private \Psr\Log\LoggerInterface $logger) {}

    public function doSomething(int $userId): void
    {
        $this->logger->info('User logged in');
        $this->logger->warning('User {id} failed to login.', ['id' => $userId]);
        $this->logger->error('Something went wrong', [
            'user_id' => $userId,
            'action'  => 'update_profile',
        ]);
    }
}
```

**Auto-flush:**
- HTTP requests: flushed on `kernel.terminate`
- Console commands: flushed on `console.terminate`

### Traditional Monolog Handler (Error Events, Not Structured Logs)

For sending log messages as Sentry error events (not the Logs product):

```yaml
# config/services.yaml
services:
  app.sentry.handler:
    class: Sentry\Monolog\Handler
    arguments:
      - '@Sentry\State\HubInterface'
      - !php/const Monolog\Logger::WARNING

  Sentry\Monolog\BreadcrumbHandler:
    arguments:
      - '@Sentry\State\HubInterface'
      - !php/const Monolog\Logger::WARNING

# config/packages/monolog.yaml
monolog:
  handlers:
    sentry:
      type: service
      id: app.sentry.handler
    sentry_buffer:
      type: buffer
      handler: sentry
      level: notice
      buffer_size: 50
```

The `BufferFlushPass` compiler pass auto-discovers `BufferHandler` instances and flushes them on `kernel.terminate`, `console.command`, `console.terminate`, and `console.error`.

---

## Messenger Integration

The Messenger integration provides error capture for queue workers (not tracing spans):

```yaml
sentry:
  messenger:
    enabled: true                         # Auto-enabled when MessageBusInterface exists
    capture_soft_fails: true              # Capture failures that will be retried
    isolate_breadcrumbs_by_message: false # Separate breadcrumb buffer per message
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable Messenger integration |
| `capture_soft_fails` | `true` | Capture exceptions even if the message will be retried |
| `isolate_breadcrumbs_by_message` | `false` | Push/pop scope per message — prevents breadcrumb leakage between messages |

**What it captures:**
- Tags events with `messenger.receiver_name`, `messenger.message_class`, `messenger.message_bus`
- Unwraps nested exceptions from `HandlerFailedException`, `DelayedMessageHandlingException`, `WrappedExceptionsInterface`
- Sets `ExceptionMechanism(isHandled: $willRetry)` — retried failures are marked as handled
- Flushes the client after each failure (background workers have no shutdown hook)

**⚠️ No tracing spans:** There is no `MessengerTracingMiddleware` in the current SDK — Messenger integration is error-capture only. Use `captureCheckIn()` manually for cron-like queue monitoring.

---

## Cron Monitoring

The Symfony SDK has no dedicated scheduled-task integration. Use the PHP SDK functions directly:

```php
use Sentry\CheckInStatus;
use Sentry\MonitorConfig;
use Sentry\MonitorSchedule;

// Two-step check-in (recommended)
$checkInId = \Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::inProgress(),
);

// ... do work ...

\Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::ok(),
    checkInId: $checkInId,
);

// Wrapper approach
\Sentry\withMonitor(
    slug: 'my-cron-job',
    callback: fn () => $this->doWork(),
);

// With programmatic monitor config
$monitorConfig = new \Sentry\MonitorConfig(
    \Sentry\MonitorSchedule::crontab('*/10 * * * *'),
    checkinMargin: 5,
    maxRuntime: 15,
    timezone: 'Europe/Vienna',
    failureIssueThreshold: 2,
    recoveryThreshold: 5,
);

$checkInId = \Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::inProgress(),
    monitorConfig: $monitorConfig,
);
```

**Filter check-ins:**

```yaml
sentry:
  options:
    before_send_check_in: "App\\Sentry\\BeforeSendCheckInCallback"
```

---

## Console Command Tracing & Monitoring

### Error Capture (`ConsoleListener`)

Auto-enabled. Tags every console command scope with:
- `console.command` — command name
- `console.command.exit_code` — exit code
- `Full command` — full command with arguments (extra context)

Flushes logs AND metrics on `console.terminate`.

### Tracing (`TracingConsoleListener`)

```yaml
sentry:
  tracing:
    console:
      excluded_commands:
        - "messenger:consume"   # Always excluded
```

Creates transactions with:
- `op: 'console.command'`
- `origin: 'auto.console'`
- `source: TransactionSource::task()`
- Status: `ok()` if exit code 0, `internalError()` otherwise

---

## Event Listeners Auto-Registered

| Listener | Events | Description |
|----------|--------|-------------|
| `ErrorListener` | `kernel.exception` | Captures all uncaught exceptions |
| `RequestListener` | `kernel.request`, `kernel.controller` | Sets IP (PII-gated); tags route name |
| `ConsoleCommandListener` | `console.command`, `console.terminate` | Tags scope, flushes on terminate |
| `MessengerListener` | Messenger worker events | Captures failures, optional scope isolation |
| `LoginListener` | Symfony Security login events | Captures authenticated user context |
| `TracingRequestListener` | `kernel.request`, `kernel.terminate` | Creates/finishes transaction for HTTP requests |
| `TracingSubRequestListener` | `kernel.request` (subrequest) | Creates child spans for sub-requests |
| `TracingConsoleListener` | `console.command`, `console.terminate` | Creates/finishes transaction for console commands |

### Distributed Tracing — Automatic Header Handling

The `TracingRequestListener` automatically reads incoming trace headers:

```php
// Accepts both Sentry and W3C trace context formats:
$request->headers->get('sentry-trace')   // Sentry format
$request->headers->get('traceparent')    // W3C format
$request->headers->get('baggage')
```

The `AbstractTraceableHttpClient` decorator automatically injects outbound headers on all Symfony HTTP Client requests:

```
sentry-trace: <value>
baggage: <value>
traceparent: <value>   # W3C trace context
```

Respects `trace_propagation_targets` — only injects headers to matching hostnames.

---

## Metrics (≥ 5.8.0, Open Beta)

```php
use function Sentry\traceMetrics;

traceMetrics()->count('button-click', 5, ['browser' => 'Firefox']);
traceMetrics()->distribution('page-load', 15.0, ['page' => '/home'], \Sentry\Unit::millisecond());
traceMetrics()->gauge('memory-usage', memory_get_usage(), ['worker' => 'web-01']);
```

**Config:**

```yaml
sentry:
  options:
    enable_metrics: true
    before_send_metric: "App\\Sentry\\BeforeSendMetricCallback"
```

**Auto-flush:** Flushed automatically on `kernel.terminate` and `console.terminate` — no manual flush needed in typical web/console contexts.
