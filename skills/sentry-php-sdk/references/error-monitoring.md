# Error Monitoring — Sentry PHP SDK

> Minimum SDK: `sentry/sentry-php` ^4.0 · `sentry/sentry-laravel` ^4.0 · `sentry/sentry-symfony` ^5.0

## Configuration

Key `\Sentry\init()` options for error monitoring:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `dsn` | `string` | env `SENTRY_DSN` | Data Source Name; SDK disabled if empty |
| `environment` | `string` | `"production"` | Deployment environment tag |
| `release` | `string` | `null` | App version string |
| `sample_rate` | `float` | `1.0` | Fraction of error events to send (0.0–1.0) |
| `send_default_pii` | `bool` | `false` | Include IPs, cookies, request body |
| `attach_stacktrace` | `bool` | `false` | Add stack traces to `captureMessage()` |
| `max_breadcrumbs` | `int` | `100` | Max breadcrumbs per event |
| `context_lines` | `int` | `5` | Source code lines around each stack frame |
| `ignore_exceptions` | `array` | `[]` | Exception classes (matched by `instanceof`) to never report |
| `error_types` | `int` | `E_ALL` | PHP error bitmask — errors to capture |
| `capture_silenced_errors` | `bool` | `false` | Capture errors suppressed with `@` operator |
| `before_send` | `callable` | no-op | Mutate or drop error events before sending |
| `before_breadcrumb` | `callable` | no-op | Mutate or drop breadcrumbs |
| `in_app_include` | `array` | `[]` | Paths to mark as in-app in stack traces |
| `in_app_exclude` | `array` | `[]` | Paths to exclude from in-app (e.g., vendor) |
| `max_request_body_size` | `string` | `"medium"` | `"none"` / `"never"` / `"small"` / `"medium"` / `"always"` |
| `default_integrations` | `bool` | `true` | Auto-install PHP error/exception/fatal handlers |

## Code Examples

### Basic setup

```php
// Plain PHP
\Sentry\init([
    'dsn'              => 'https://<key>@<org>.ingest.sentry.io/<project>',
    'environment'      => 'production',
    'release'          => 'my-app@1.2.3',
    'sample_rate'      => 1.0,
    'send_default_pii' => false,
    'max_breadcrumbs'  => 100,
    'in_app_exclude'   => ['/var/www/html/vendor'],
]);
```

```php
// Laravel — config/sentry.php (published by php artisan vendor:publish)
return [
    'dsn'         => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),
    'release'     => env('SENTRY_RELEASE'),
    'environment' => env('SENTRY_ENVIRONMENT'),   // defaults to APP_ENV
    'sample_rate' => (float) env('SENTRY_SAMPLE_RATE', 1.0),
    'send_default_pii' => env('SENTRY_SEND_DEFAULT_PII', false),
    'ignore_exceptions' => [],
];
```

```yaml
# Symfony — config/packages/sentry.yaml
sentry:
    dsn: '%env(SENTRY_DSN)%'
    register_error_listener: true   # auto-captures on kernel.exception
    register_error_handler: true    # registers PHP error/exception handlers
    options:
        environment: '%kernel.environment%'
        release: '%env(default::SENTRY_RELEASE)%'
        sample_rate: 1.0
        send_default_pii: false
        max_breadcrumbs: 100
        in_app_exclude:
            - '%kernel.cache_dir%'
            - '%kernel.project_dir%/vendor'
        ignore_exceptions:
            - Symfony\Component\HttpKernel\Exception\NotFoundHttpException
```

### Capture APIs

#### `captureException()`

```php
// Signature: function captureException(\Throwable $exception, ?EventHint $hint = null): ?EventId

// Basic
try {
    riskyOperation();
} catch (\Throwable $e) {
    \Sentry\captureException($e);
}

// With extra data attached via hint
\Sentry\captureException($e, \Sentry\EventHint::fromArray([
    'extra' => ['sql' => $query, 'bindings' => $bindings],
]));

// Mark as unhandled (higher priority / inbox in Sentry UI)
\Sentry\captureException($e, \Sentry\EventHint::fromArray([
    'mechanism' => new \Sentry\ExceptionMechanism(
        \Sentry\ExceptionMechanism::TYPE_GENERIC,
        false  // $handled = false
    ),
]));
```

#### `captureMessage()`

```php
// Signature: function captureMessage(string $message, ?Severity $level = null, ?EventHint $hint = null): ?EventId

\Sentry\captureMessage('Payment gateway timeout');
\Sentry\captureMessage('Low disk space', \Sentry\Severity::warning());
\Sentry\captureMessage('Critical failure', \Sentry\Severity::fatal());

// All Severity factory methods:
// Severity::debug()  Severity::info()  Severity::warning()
// Severity::error()  Severity::fatal()
```

#### `captureEvent()`

```php
// Signature: function captureEvent(Event $event, ?EventHint $hint = null): ?EventId

$event = \Sentry\Event::createEvent();
$event->setMessage('Custom billing event');
$event->setLevel(\Sentry\Severity::info());
$event->setTags(['component' => 'payment', 'provider' => 'stripe']);
$event->setExtra(['order_id' => 42, 'retries' => 3]);
$event->setFingerprint(['{{ default }}', 'payment-module']);
$event->setTransaction('checkout.payment');

\Sentry\captureEvent($event);
```

#### `captureLastError()`

```php
// Signature: function captureLastError(?EventHint $hint = null): ?EventId
// Reads the most recent error from error_get_last()

register_shutdown_function(function (): void {
    \Sentry\captureLastError();
    \Sentry\flush();   // required in CLI/shutdown contexts
});

// Note: installed automatically by FatalErrorListenerIntegration
// when default_integrations => true (the default).
```

### Automatic capture by framework

```php
// Plain PHP — default integrations auto-install PHP error handlers
\Sentry\init(['dsn' => '...']);
// ErrorListenerIntegration    → set_error_handler()
// ExceptionListenerIntegration → set_exception_handler()
// FatalErrorListenerIntegration → register_shutdown_function()

// Laravel 11+ (bootstrap/app.php)
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withExceptions(function ($exceptions) {
        Integration::handles($exceptions);
    })
    ->create();

// Laravel 10 and below (app/Exceptions/Handler.php)
public function register(): void
{
    $this->reportable(function (\Throwable $e) {
        \Sentry\Laravel\Integration::captureUnhandledException($e);
    });
}

// Symfony — register_error_listener: true in sentry.yaml (default)
// ErrorListener subscribes to kernel.exception and captures automatically
```

### Scope management

Three scope types control where data persists:

| Scope API | Lifetime | Use for |
|-----------|----------|---------|
| `configureScope()` | Current scope (persists) | Per-request user identity, session tags |
| `withScope()` | Isolated child scope | Data for a single capture call |
| `withContext()` | Fully isolated hub context | Long-running processes (Octane, queues) |

```php
// Persistent — modifies current scope, data appears on all subsequent events
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setTag('tenant', 'acme-corp');
    $scope->setUser(['id' => 42, 'email' => 'user@example.com']);
});

// Isolated — child scope discarded after callback; changes don't leak
\Sentry\withScope(function (\Sentry\State\Scope $scope): void {
    $scope->setTag('payment_flow', 'checkout');
    $scope->setExtra('cart_id', 'cart-123');
    \Sentry\captureException(new \RuntimeException('Payment failed'));
});
// ← tag and extra are gone after this line

// Long-running process isolation (prevents cross-request contamination)
\Sentry\withContext(function () use ($job): void {
    \Sentry\configureScope(function (\Sentry\State\Scope $scope) use ($job): void {
        $scope->setTag('job.class', get_class($job));
    });
    $job->handle();
}, timeout: 2);

// Manual push/pop (lower level)
$hub = \Sentry\SentrySdk::getCurrentHub();
$hub->pushScope();
try {
    // ... isolated work ...
} finally {
    $hub->popScope();
}
```

### Context enrichment

#### Tags

Tags are **indexed** — searchable and filterable in the Sentry UI. Max key 32 chars, value 200 chars.

```php
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setTag('environment', 'production');
    $scope->setTags(['payment_provider' => 'stripe', 'checkout_version' => 'v3']);
    $scope->removeTag('debug_mode');
});

// Per-event only
\Sentry\withScope(function (\Sentry\State\Scope $scope): void {
    $scope->setTag('retry_attempt', '2');
    \Sentry\captureException(new \RuntimeException('Still failing'));
});
```

#### User context — `UserDataBag`

```php
// Via array (Scope::setUser accepts array OR UserDataBag)
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setUser([
        'id'         => 42,
        'email'      => 'jane@example.com',
        'username'   => 'jane_doe',
        'ip_address' => '192.168.1.1',
        'plan'       => 'enterprise',   // extra keys become metadata
    ]);
});

// Via UserDataBag fluent API
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $user = \Sentry\UserDataBag::createFromUserIdentifier(42);
    $user->setEmail('jane@example.com');
    $user->setMetadata('plan', 'enterprise');
    $scope->setUser($user);
});

// Clear user (e.g., on logout)
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->removeUser();
});
```

#### Breadcrumbs — `Breadcrumb` constants

```php
// Type constants (Breadcrumb::TYPE_*)
Breadcrumb::TYPE_DEFAULT    // 'default' — generic log entry
Breadcrumb::TYPE_HTTP       // 'http'    — outgoing HTTP request
Breadcrumb::TYPE_USER       // 'user'    — user interaction
Breadcrumb::TYPE_NAVIGATION // 'navigation' — URL/route change
Breadcrumb::TYPE_ERROR      // 'error'   — captured error

// Level constants (Breadcrumb::LEVEL_*)
Breadcrumb::LEVEL_DEBUG
Breadcrumb::LEVEL_INFO
Breadcrumb::LEVEL_WARNING
Breadcrumb::LEVEL_ERROR
Breadcrumb::LEVEL_FATAL

// Shorthand via global function (PHP 8 named args)
\Sentry\addBreadcrumb(
    category: 'auth',
    message:  'User authenticated',
    metadata: ['user_id' => 42, 'method' => 'oauth'],
    level:    \Sentry\Breadcrumb::LEVEL_INFO,
    type:     \Sentry\Breadcrumb::TYPE_DEFAULT,
);

// Explicit Breadcrumb object
\Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_HTTP,
    'http.client',
    'POST https://api.stripe.com/v1/charges',
    ['status_code' => 200, 'duration_ms' => 243]
));

// Navigation crumb
\Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_NAVIGATION,
    'navigation',
    null,
    ['from' => '/home', 'to' => '/checkout']
));

// Breadcrumb is immutable — modify via with*() methods (return clones)
$crumb = new \Sentry\Breadcrumb(
    \Sentry\Breadcrumb::LEVEL_INFO,
    \Sentry\Breadcrumb::TYPE_DEFAULT,
    'cache', 'Cache miss', ['key' => 'user:42:profile']
);
$crumb = $crumb->withLevel(\Sentry\Breadcrumb::LEVEL_WARNING)
               ->withMetadata('ttl', 300);
\Sentry\addBreadcrumb($crumb);
```

#### Structured named context

Named context blocks appear as collapsible panels in the Sentry event UI.

```php
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setContext('payment', [
        'provider' => 'stripe',
        'amount'   => 9900,
        'currency' => 'USD',
    ]);
});

// Per-event
\Sentry\withScope(function (\Sentry\State\Scope $scope) use ($exception): void {
    $scope->setContext('order', [
        'id'     => 'ord-999',
        'items'  => 3,
        'total'  => 59.99,
        'status' => 'pending',
    ]);
    \Sentry\captureException($exception);
});

// Reserved names with special UI rendering: os, runtime, app, browser, device, gpu, culture, trace
```

### `before_send` hook — filtering and scrubbing

```php
// Callback signature:
// callable(\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event
// Return null to DROP the event; return (modified) event to send.

\Sentry\init([
    'before_send' => function (\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event {
        // Drop health-check routes
        $request = $event->getRequest();
        if ($request?->getUrl() && str_contains($request->getUrl(), '/healthz')) {
            return null;
        }

        // Scrub sensitive extra data
        $extra = $event->getExtra();
        unset($extra['password'], $extra['credit_card']);
        $event->setExtra($extra);

        // Add tag based on exception type
        if ($hint?->exception instanceof \PDOException) {
            $event->setTag('db_error', 'true');
        }

        // Custom fingerprint based on message
        if ($hint?->exception && str_contains($hint->exception->getMessage(), 'timeout')) {
            $event->setFingerprint(['timeout', get_class($hint->exception)]);
        }

        return $event;
    },
]);
```

### `before_breadcrumb` hook

```php
// Callback signature:
// callable(\Sentry\Breadcrumb $breadcrumb): ?\Sentry\Breadcrumb
// Return null to DROP; return (modified) Breadcrumb to keep.

\Sentry\init([
    'before_breadcrumb' => function (\Sentry\Breadcrumb $breadcrumb): ?\Sentry\Breadcrumb {
        // Drop SQL queries containing sensitive data
        if ($breadcrumb->getCategory() === 'db.sql.query') {
            if (str_contains(strtolower($breadcrumb->getMessage() ?? ''), 'password')) {
                return null;
            }
        }

        // Redact API keys from URLs
        $metadata = $breadcrumb->getMetadata();
        if (isset($metadata['url']) && str_contains($metadata['url'], 'api_key=')) {
            return $breadcrumb->withMetadata(
                'url',
                preg_replace('/api_key=[^&]+/', 'api_key=[Filtered]', $metadata['url'])
            );
        }

        return $breadcrumb;
    },
]);
```

### Additional hook variants

```php
// Filter performance transactions (not error events)
'before_send_transaction' => function (\Sentry\Event $tx, ?\Sentry\EventHint $hint): ?\Sentry\Event {
    if (in_array($tx->getTransaction(), ['GET /up', 'GET /ping', 'GET /healthz'])) {
        return null;
    }
    return $tx;
},

// Filter cron monitor check-ins
'before_send_check_in' => function (\Sentry\Event $checkIn, ?\Sentry\EventHint $hint): ?\Sentry\Event {
    return $checkIn; // or null to drop
},

// NOTE: Symfony uses service IDs instead of closures:
// options: { before_send: 'App\Sentry\BeforeSendHandler' }
```

### Error context — `EventHint` and `ExceptionMechanism`

```php
// EventHint public properties:
// $exception  — original \Throwable
// $mechanism  — ExceptionMechanism (how it was caught)
// $stacktrace — custom Stacktrace override
// $extra      — array<string, mixed> passed to before_send but not in event body

// Handled vs unhandled — affects priority and inbox routing in Sentry
use Sentry\ExceptionMechanism;

$hint = \Sentry\EventHint::fromArray([
    'exception'  => $exception,
    'mechanism'  => new ExceptionMechanism(ExceptionMechanism::TYPE_GENERIC, false), // unhandled
]);
\Sentry\captureException($exception, $hint);

// Exception chaining — SDK auto-walks $e->getPrevious()
// All chained exceptions appear as exception.values[] in the event
try {
    try {
        $pdo->query($sql);           // throws PDOException
    } catch (\PDOException $dbEx) {
        throw new \DomainException('Payment failed', 0, $dbEx);
    }
} catch (\DomainException $e) {
    \Sentry\captureException($e);
    // Sentry event: exception.values[0] = DomainException
    //               exception.values[1] = PDOException ($previous)
}

// Pass data through hint to before_send without including it in the event body
$hint = \Sentry\EventHint::fromArray([
    'extra' => ['query' => $sql, 'duration_ms' => $ms],
]);
\Sentry\captureException($exception, $hint);

// Access in before_send
'before_send' => function (\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event {
    if ($hint !== null && ($hint->extra['duration_ms'] ?? 0) > 5000) {
        $event->setTag('slow_query', 'true');
    }
    return $event;
},
```

### Fingerprinting (custom grouping)

Default fingerprint: `['{{ default }}']` — stack trace hash + exception type + message.

```php
// Via scope — persistent
\Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
    $scope->setFingerprint(['payment-timeout', 'stripe-api']);
});

// Via withScope — per-event, combined with default
\Sentry\withScope(function (\Sentry\State\Scope $scope) use ($exception, $provider): void {
    $scope->setFingerprint(['{{ default }}', 'payment', $provider]);
    \Sentry\captureException($exception);
});

// Via before_send — dynamic
\Sentry\init([
    'before_send' => function (\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event {
        if ($hint?->exception instanceof \PDOException) {
            $msg = $hint->exception->getMessage();
            if (str_contains($msg, 'timed out')) {
                $event->setFingerprint(['db-timeout', 'pdo']);
            }
        }
        return $event;
    },
]);

// Via captureEvent — inline
$event = \Sentry\Event::createEvent();
$event->setFingerprint(['my-custom-group', '{{ default }}']);
$event->setMessage('Grouped event');
\Sentry\captureEvent($event);

// Scope fingerprints are APPENDED to any existing event fingerprints:
// array_merge($event->getFingerprint(), $scope->getFingerprint())
```

## Framework-Specific Notes

### Plain PHP

- `default_integrations: true` (default) auto-installs `set_error_handler()`, `set_exception_handler()`, and `register_shutdown_function()` — no manual handlers needed
- Always call `\Sentry\flush()` before process exit in CLI scripts
- In long-running workers (e.g., RoadRunner, Swoole), use `withContext()` or manual `pushScope()`/`popScope()` per request to prevent cross-request scope contamination

### Laravel

- **Laravel 11+**: use `Integration::handles($exceptions)` in `bootstrap/app.php`
- **Laravel 10 and below**: use `Integration::captureUnhandledException($e)` in `Handler::register()`
- `Integration::captureUnhandledException()` inspects the call stack to guess whether the exception was truly unhandled and sets the `ExceptionMechanism::$handled` flag accordingly
- Laravel auto-sets user context from `Auth::user()` on the `Authenticated` event (reads `id`, `email`, `username`)
- **Octane**: scope is automatically isolated per request via `pushScope()`/`popScope()` in the Octane event handlers — no manual action needed
- `SENTRY_SEND_DEFAULT_PII=true` is required to capture user email and IP
- Log levels map to breadcrumb levels: `critical`/`alert`/`emergency` → `LEVEL_FATAL`, `warning` → `LEVEL_WARNING`, `error` → `LEVEL_ERROR`, `info`/`notice` → `LEVEL_INFO`, `debug` → `LEVEL_DEBUG`

### Symfony

- Errors are captured by `ErrorListener` on the `kernel.exception` event — controlled by `register_error_listener: true` (default)
- User context requires `send_default_pii: true`; populated by `LoginListener` on `LoginSuccessEvent` / `AuthenticationSuccessEvent`
- Inject `HubInterface` via DI rather than using global `\Sentry\*` functions in services
- `before_send` in Symfony must be a **service ID**, not a closure — closures cannot be serialized and break config caching:

```php
// src/Sentry/BeforeSendHandler.php
namespace App\Sentry;

use Sentry\Event;
use Sentry\EventHint;

class BeforeSendHandler
{
    public function __invoke(Event $event, ?EventHint $hint): ?Event
    {
        // ... filter / scrub ...
        return $event;
    }
}
```

```yaml
# config/packages/sentry.yaml
sentry:
    options:
        before_send: 'App\Sentry\BeforeSendHandler'
```

- `MessengerListener` captures exceptions from failed Messenger messages — inject it if using the Messenger component

## Best Practices

- Set `send_default_pii: false` (default) — add explicit scrubbing in `before_send` for any sensitive fields
- Use `configureScope()` for per-request data (user identity) and `withScope()` for per-capture isolation
- Prefer `setContext()` for structured detail data; use `setTag()` only for fields you want to filter/search on
- Use `ignore_exceptions: [...]` for exceptions that should never be reported (e.g., `NotFoundHttpException`)
- In PHP-FPM (one process per request), global scope is safe. In long-running servers (Octane, RoadRunner), always isolate scope per request/task
- `ignore_exceptions` runs **before** `before_send` — matching classes are silently dropped and `before_send` is never called
- `EventHint` received in `before_send` is the same object passed to `captureException()` — use it to access the original `Throwable` and any `extra` context

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing in Sentry | Verify DSN, call `\Sentry\init()` before all other code, try `'debug' => true` to log to `error_log()` |
| User/tag data missing from events | Set scope data **before** the exception occurs; in Laravel, check `SENTRY_SEND_DEFAULT_PII` |
| PII appearing in events | Ensure `send_default_pii: false` (default), add `before_send` scrubber for headers/cookies |
| `captureException()` sends no event | Check `ignore_exceptions` — class may match by `instanceof`; verify `before_send` isn't returning `null` |
| Duplicate events in Laravel | `Integration::handles()` (L11) already calls `captureUnhandledException()` — don't also add a manual `reportable()` |
| Cross-request scope contamination in Octane | Enable Octane breadcrumb events (already in default config); use `withContext()` in queue workers |
| `before_send` option ignored in Symfony | Must be a service ID string, not a closure — closures can't be serialized for config caching |
| Breadcrumbs missing | Check `max_breadcrumbs` setting and `before_breadcrumb` hook; in Laravel verify `breadcrumbs.*` config flags |
| Fatal errors not captured | Ensure `default_integrations: true` (default) or manually call `register_shutdown_function()` with `captureLastError()` + `flush()` |
