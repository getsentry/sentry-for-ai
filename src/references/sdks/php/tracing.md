# Tracing — Sentry PHP SDK

> Minimum SDK: `sentry/sentry` ^4.0 · `sentry/sentry-laravel` ^4.0 · `sentry/sentry-symfony` ^5.0

## Configuration

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `traces_sample_rate` | `float` | `null` | Fraction of transactions to trace (0.0–1.0); `null` disables tracing |
| `traces_sampler` | `callable` | `null` | Per-transaction sampling function; takes precedence over `traces_sample_rate` |
| `profiles_sample_rate` | `float` | `null` | Fraction of sampled transactions to profile (relative to `traces_sample_rate`) |
| `ignore_transactions` | `array` | `[]` | Transaction names to never trace (e.g., `['/up', '/healthz']`) |
| `before_send_transaction` | `callable` | no-op | Mutate or drop transaction events before sending |
| `strict_trace_continuation` | `bool` | `false` | Only continue an incoming distributed trace if the `sentry-org_id` baggage matches the SDK's org ID; prevents trace contamination from third-party services (>=4.21.0). Replaces deprecated `strict_trace_propagation` |

## Code Examples

### Enable tracing

```php
// Plain PHP — uniform sample rate
\Sentry\init([
    'dsn'                => 'https://<key>@<org>.ingest.sentry.io/<project>',
    'traces_sample_rate' => 0.2,  // trace 20% of requests
]);

// Laravel — config/sentry.php
'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE') === null
    ? null
    : (float) env('SENTRY_TRACES_SAMPLE_RATE'),
```

```yaml
# Symfony — config/packages/sentry.yaml
sentry:
    options:
        traces_sample_rate: 0.2
```

### Dynamic sampling with `traces_sampler`

```php
// Plain PHP — closure directly in init()
\Sentry\init([
    'dsn' => '...',
    'traces_sampler' => function (\Sentry\Tracing\SamplingContext $context): float {
        $transactionName = $context->getTransactionContext()->getName();

        // Drop health checks
        if (in_array($transactionName, ['/healthz', '/up', '/ping'])) {
            return 0.0;
        }

        // Honour parent sampling decision in distributed traces
        $parentSampled = $context->getParentSampled();
        if ($parentSampled !== null) {
            return (float) $parentSampled;
        }

        // 50% of HTTP requests, 10% of everything else
        return str_starts_with($transactionName, 'GET ') || str_starts_with($transactionName, 'POST ')
            ? 0.5
            : 0.1;
    },
]);
```

```yaml
# Symfony — traces_sampler must be wired through the service container (closures can't be serialized)
sentry:
    options:
        traces_sampler: "sentry.callback.traces_sampler"

services:
    sentry.callback.traces_sampler:
        class: 'App\Service\Sentry'
        factory: ['@App\Service\Sentry', 'getTracesSampler']
```

```php
// src/Service/Sentry.php
namespace App\Service;

class Sentry
{
    public function getTracesSampler(): callable
    {
        return function (\Sentry\Tracing\SamplingContext $context): float {
            return 0.5;
        };
    }
}
```

### Custom span API — `TransactionContext` and `SpanContext`

```php
use Sentry\Tracing\TransactionContext;
use Sentry\Tracing\SpanContext;

// 1. Build and start a root transaction
$transactionContext = TransactionContext::make()
    ->setName('process-order')
    ->setOp('task');

$transaction = \Sentry\startTransaction($transactionContext);

// 2. Register on the hub so child spans attach to it
\Sentry\SentrySdk::getCurrentHub()->setSpan($transaction);

// 3. Add a child span
$spanContext = SpanContext::make()
    ->setOp('db.query')
    ->setDescription('SELECT * FROM orders WHERE id = ?');

$span = $transaction->startChild($spanContext);
// ... do work ...
$span->finish();

// 4. Finish transaction — submits everything to Sentry
$transaction->finish();
```

### `\Sentry\trace()` helper (recommended)

Removes boilerplate: starts the span, sets it as current, finishes it automatically.

```php
$result = \Sentry\trace(
    function (\Sentry\State\Scope $scope): array {
        return fetchOrdersFromDatabase();
    },
    SpanContext::make()
        ->setOp('db.query')
        ->setDescription('fetch-orders')
);
```

### Safe manual span pattern (handles no-transaction case)

```php
function expensiveOperation(): void
{
    $parent = \Sentry\SentrySdk::getCurrentHub()->getSpan();
    $span = null;

    if ($parent !== null) {
        $context = SpanContext::make()
            ->setOp('some_operation')
            ->setDescription('This is a description');
        $span = $parent->startChild($context);
        \Sentry\SentrySdk::getCurrentHub()->setSpan($span);
    }

    try {
        // ... do work ...
    } finally {
        if ($span !== null) {
            $span->finish();
            \Sentry\SentrySdk::getCurrentHub()->setSpan($parent);
        }
    }
}
```

### Span data attributes

```php
// At creation time
$spanContext = SpanContext::make()
    ->setOp('http.client')
    ->setData([
        'http.request.method'       => 'GET',
        'http.response.status_code' => 200,
    ]);

// On an existing span
$span->setData(['db.system' => 'postgresql', 'db.table' => 'orders']);

// Read-modify-write
$span->setData([
    'counter' => $span->getData('counter', 0) + 1,
]);
```

### Span status

```php
$span->setStatus(\Sentry\Tracing\SpanStatus::createFromHttpStatusCode($response->getStatusCode()));
$transaction->setStatus(\Sentry\Tracing\SpanStatus::ok());
$transaction->setStatus(\Sentry\Tracing\SpanStatus::internalError());
```

### Accessing the active span/transaction

```php
$transaction = \Sentry\SentrySdk::getCurrentHub()->getTransaction();  // ?Transaction
$span        = \Sentry\SentrySdk::getCurrentHub()->getSpan();          // ?Span

if ($transaction !== null) {
    $transaction->setData(['order.type' => 'subscription']);
}
```

### Mutating all spans via `before_send_transaction`

```php
\Sentry\init([
    'before_send_transaction' => function (\Sentry\Event $event, ?\Sentry\EventHint $hint): ?\Sentry\Event {
        // Drop health-check transactions
        if (in_array($event->getTransaction(), ['GET /up', 'GET /healthz'])) {
            return null;
        }

        // Add data to every span in the transaction
        foreach ($event->getSpans() as $span) {
            $span->setData(['server' => 'web-01']);
        }

        return $event;
    },
]);
```

## Auto-Instrumentation Matrix

### Plain PHP — No automatic instrumentation

The plain PHP SDK provides **zero automatic instrumentation**. Every transaction and span must be created manually using the Custom Span API.

### Laravel — Auto-instrumented operations

The `Tracing\Middleware` is auto-prepended and the `Tracing\ServiceProvider` wires all listeners automatically.

| Operation | Span Op | Enabled by default |
|-----------|---------|-------------------|
| HTTP request lifecycle | `http.server` | ✅ Always |
| Route handler dispatch | `http.route` | ✅ Always |
| SQL queries | `db.sql.query` | ✅ (`tracing.sql_queries`) |
| DB transactions | `db.transaction` | ✅ Always |
| Blade view rendering | `view.render` | ✅ (`tracing.views`) |
| Outgoing HTTP client | `http.client` | ✅ (`tracing.http_client_requests`, Laravel ≥ 8.45) |
| Cache operations | `cache.*` | ✅ (`tracing.cache`, Laravel ≥ 11.11) |
| Queue job processing | `queue.process` | ⚙️ `tracing.queue_jobs: true` |
| Queue job as transaction | `queue.process` | ⚙️ `tracing.queue_job_transactions: true` |
| Redis commands | (redis spans) | ⚙️ `tracing.redis_commands: true` |
| Livewire components | (livewire spans) | ⚙️ `tracing.livewire: true` |
| Notifications | (notification spans) | ✅ (`tracing.notifications`) |
| Lighthouse GraphQL | (graphql spans) | ✅ When Lighthouse installed |
| Laravel Folio routes | transaction name | ✅ When Folio installed |
| Filesystem disk operations | (file spans) | ⚙️ Opt-in via `Storage\Integration::configureDisks()` |

```php
// Filesystem disk opt-in (config/filesystems.php)
'disks' => \Sentry\Laravel\Features\Storage\Integration::configureDisks([
    'local' => ['driver' => 'local', 'root' => storage_path('app'), 'throw' => false],
    's3'    => ['driver' => 's3', /* ... */],
], enableSpans: true, enableBreadcrumbs: true),
```

### Symfony — Auto-instrumented operations

`TracingRequestListener` and other compiler-wired listeners activate automatically.

| Operation | Span Op | Origin |
|-----------|---------|--------|
| HTTP main request | `http.server` | `auto.http.server` |
| HTTP sub-request | `http.server` | `auto.http.server` |
| Console command | `console.command` | `auto.console` |
| Outbound HTTP calls | `http.client` | `auto.http.client` |
| Doctrine DB query | `db.sql.query` | `auto.db` |
| Doctrine DB prepare | `db.sql.prepare` | `auto.db` |
| Doctrine DB exec | `db.sql.exec` | `auto.db` |
| Doctrine TX begin/commit/rollback | `db.sql.transaction.*` | `auto.db` |
| PSR-6 cache get/put/delete/flush | `cache.*` | `auto.cache` |
| Twig template rendering | `view.render` | `auto.view` |

## Distributed Tracing

Two headers carry trace context between services:

| Header | Purpose |
|--------|---------|
| `sentry-trace` | Trace ID, span ID, sampling decision (Sentry native format) |
| `baggage` | Dynamic sampling context (W3C baggage spec) |

> **CORS note:** Both headers must be in your CORS allowlist if browser requests are involved. Proxies and API gateways may strip unknown headers.

### Extracting incoming trace context

```php
$sentryTrace = $_SERVER['HTTP_SENTRY_TRACE'] ?? '';
$baggage     = $_SERVER['HTTP_BAGGAGE'] ?? '';

// continueTrace() returns a TransactionContext pre-populated with parent trace data
$ctx = \Sentry\continueTrace($sentryTrace, $baggage);
$ctx->setName('process-payment')->setOp('task');

$transaction = \Sentry\startTransaction($ctx);
\Sentry\SentrySdk::getCurrentHub()->setSpan($transaction);
```

### Injecting outgoing trace headers

```php
// Manual header injection (e.g., Guzzle, curl, any HTTP client)
$headers = [
    'sentry-trace' => \Sentry\getTraceparent(),
    'baggage'      => \Sentry\getBaggage(),
];

$client = new \GuzzleHttp\Client();
$response = $client->get('https://internal-api.example.com', [
    'headers' => $headers,
]);
```

### Guzzle middleware (automatic header injection)

```php
use Sentry\Tracing\GuzzleTracingMiddleware;

$stack = \GuzzleHttp\HandlerStack::create();
$stack->push(GuzzleTracingMiddleware::trace());

$client = new \GuzzleHttp\Client(['handler' => $stack]);
$response = $client->get('https://example.com/');
// sentry-trace + baggage headers injected automatically; span created for the request
```

### `continueTrace()` full pattern (queue consumers, workers)

```php
// Continue a distributed trace from a queue job payload
$context = \Sentry\continueTrace(
    $job->getMetadata('sentry_trace'),
    $job->getMetadata('baggage')
);
$context->setOp('queue.process')->setName('App\Jobs\ProcessPayment');

$transaction = \Sentry\startTransaction($context);
\Sentry\SentrySdk::getCurrentHub()->setSpan($transaction);

try {
    $job->handle();
} catch (\Throwable $e) {
    $transaction->setStatus(\Sentry\Tracing\SpanStatus::internalError());
    throw $e;
} finally {
    $transaction->finish();
}
```

### HTML meta tag injection (frontend/backend trace stitching)

Inject these tags into your HTML `<head>` so the Sentry JavaScript SDK can continue the backend trace in the browser.

```php
// Plain PHP
echo sprintf('<meta name="sentry-trace" content="%s"/>', \Sentry\getTraceparent());
echo sprintf('<meta name="baggage" content="%s"/>', \Sentry\getBaggage());
```

```blade
{{-- Laravel Blade template --}}
{!! \Sentry\Laravel\Integration::sentryMeta() !!}

{{-- Or individually: --}}
{!! \Sentry\Laravel\Integration::sentryTracingMeta() !!}
{!! \Sentry\Laravel\Integration::sentryBaggageMeta() !!}
```

```twig
{# Symfony Twig template — inject via a controller variable #}
{{ sentry_trace_meta | raw }}
{{ sentry_baggage_meta | raw }}
```

### Framework-automatic propagation

| Framework | Incoming (extract) | Outgoing (inject) |
|-----------|--------------------|-------------------|
| Plain PHP | Manual `continueTrace()` | Manual header injection |
| Laravel | Auto in `Tracing\Middleware` | Auto on Laravel HTTP Client (≥ 8.45) |
| Symfony | Auto in `TracingRequestListener` (supports both `sentry-trace` and `traceparent`) | Auto via HTTP Client decorator (injects `sentry-trace`, `baggage`, `traceparent`) |

## Profiling

Requires the **Excimer** PHP extension (Wikimedia sampling profiler).
- Platform: **Linux or macOS only** — Windows is not supported
- PHP: 7.2+

```bash
# Install Excimer
apt-get install php-excimer      # Debian/Ubuntu
pecl install excimer             # PECL
phpenmod -s fpm excimer          # Enable
```

```php
// Plain PHP — traces_sample_rate must be set; profiles_sample_rate is relative to it
\Sentry\init([
    'dsn'                  => '...',
    'traces_sample_rate'   => 1.0,
    'profiles_sample_rate' => 1.0,  // profile 100% of sampled transactions
]);
```

```php
// Laravel — config/sentry.php
'traces_sample_rate'   => 1.0,
'profiles_sample_rate' => 1.0,
```

```yaml
# Symfony — config/packages/sentry.yaml
sentry:
    options:
        traces_sample_rate: 1.0
        profiles_sample_rate: 1.0
```

`profiles_sample_rate` is a **ratio of already-sampled transactions**:

```
Effective profiling rate = traces_sample_rate × profiles_sample_rate

Examples:
  0.5 × 0.5 = 25% of all requests profiled
  1.0 × 1.0 = 100% of all requests profiled
  0.1 × 1.0 = 10% of all requests profiled
```

## Framework-Specific Notes

### Plain PHP

- Zero automatic instrumentation — create every transaction and span manually
- Call `\Sentry\flush()` before process exit in CLI scripts to ensure buffered data is sent
- For queue workers and long-running processes, start a transaction per job with `continueTrace()` to preserve distributed trace context

### Laravel

- `Tracing\Middleware` is **auto-prepended** by `Tracing\ServiceProvider` — do not add it manually
- Transaction start time is backdated to Laravel boot via `setBootedTimestamp()` — captures full request duration including framework startup
- `missing_routes: false` (default) discards 404/unmatched route transactions; set to `true` to trace them
- `config:cache` breaks if `traces_sampler` is a closure — use a class/callable string or only set it at runtime
- Queue tracing: `tracing.queue_jobs: true` creates spans; `tracing.queue_job_transactions: true` creates standalone transactions with distributed trace propagation using payload keys `sentry_trace_parent_data` / `sentry_baggage_data`
- On **Octane**: FastCGI terminable middleware dispatches spans after response — no user-visible latency. Without FastCGI, use a local Relay proxy

### Symfony

- `TracingRequestListener` accepts both `sentry-trace` (Sentry) and `traceparent` (W3C) headers for incoming distributed traces
- HTTP Client decorator injects three outgoing headers: `sentry-trace`, `baggage`, `traceparent`
- Console commands are auto-traced by `TracingConsoleListener` — creates a root transaction if none is active, otherwise creates a child span
- Messenger integration is **error-capture only** (via `MessengerListener`) — no tracing spans for queue messages
- FastCGI: spans are sent after response via `kernel.terminate`. Without FastCGI, use a local Relay proxy

## Span Ops Reference

| `op` | What it tracks |
|------|---------------|
| `http.server` | Incoming HTTP request |
| `http.client` | Outgoing HTTP request |
| `http.route` | Controller/action dispatch (Laravel) |
| `db.sql.query` | SQL query execution |
| `db.sql.prepare` | SQL prepare (Symfony) |
| `db.sql.exec` | SQL exec (Symfony) |
| `db.sql.execute` | Statement execute (Symfony) |
| `db.sql.transaction.begin` / `.commit` / `.rollback` | DB transaction lifecycle (Symfony) |
| `db.transaction` | DB transaction (Laravel) |
| `view.render` | Template rendering (Blade / Twig) |
| `cache.get` | Cache read |
| `cache.put` | Cache write |
| `cache.remove` | Cache delete |
| `cache.flush` | Cache clear |
| `queue.publish` | Job enqueue |
| `queue.process` | Job processing |
| `console.command` | CLI command (Symfony) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions appearing | Verify `traces_sample_rate > 0` or `traces_sampler` returns non-zero; confirm SDK is initialized before request handling |
| Spans not linked to transaction | Ensure spans are created inside an active transaction; call `setSpan($transaction)` on the hub after `startTransaction()` |
| Distributed traces broken | Verify `sentry-trace` and `baggage` headers pass through proxies, load balancers, and CORS middleware |
| `traces_sampler` ignored in Laravel | Closures break `config:cache`; use an invokable class or only configure at runtime (not in config file) |
| `traces_sampler` not working in Symfony | Must be a service factory — closures can't be serialized. Register as a service and reference by ID |
| Missing route transactions in Laravel | Set `tracing.missing_routes: true` in sentry config (default is `false` — 404s are discarded) |
| No profiling data | Confirm Excimer extension is installed (`php -m | grep excimer`); Windows not supported; `traces_sample_rate` must be set |
| High response latency from tracing | Use FastCGI (terminable middleware) or deploy a local Relay proxy to make uploads async |
| Queue jobs not traced | Set `tracing.queue_jobs: true`; for standalone transactions also set `tracing.queue_job_transactions: true` |
| HTML meta tags show empty values | Call `getTraceparent()` / `getBaggage()` inside an active transaction; outside a transaction these return empty strings |
