# Tracing — Sentry .NET SDK

> Minimum SDK: `Sentry` ≥4.0.0  
> OpenTelemetry integration: `Sentry.OpenTelemetry` ≥6.1.0  
> Custom measurements: `Sentry` ≥3.23.0  
> Profiling (Alpha): `Sentry.Profiling` ≥4.0.0, .NET 8+ only

---

## How Tracing Is Activated

Tracing is **disabled by default**. Enable it by setting `TracesSampleRate` or `TracesSampler` during `SentrySdk.Init()`:

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.TracesSampleRate = 1.0; // capture all transactions (lower in production)
});
```

> **Without one of these set**, no spans or transactions are created regardless of other configuration.

---

## `TracesSampleRate` — Uniform Sampling

A `double?` between `0.0` (capture nothing) and `1.0` (capture everything). Defaults to `null` (disabled).

```csharp
options.TracesSampleRate = 0.2; // sample 20% of transactions
```

---

## `TracesSampler` — Dynamic Per-Transaction Sampling

When set, takes **precedence** over `TracesSampleRate`. Receives a `TransactionSamplingContext` and returns `double?` (0.0–1.0) or `null` (falls back to `TracesSampleRate`).

```csharp
options.TracesSampler = context =>
{
    var name = context.TransactionContext.Name;
    var op   = context.TransactionContext.Operation;

    // Drop health checks entirely
    if (name.Contains("/health") || name.Contains("/ping"))
        return 0.0;

    // Always capture checkout flow
    if (name == "checkout" || op == "perform-checkout")
        return 1.0;

    // Read caller-supplied hint
    if (context.CustomSamplingContext.TryGetValue("isCritical", out var flag) && flag is true)
        return 1.0;

    return 0.1; // default: 10%
};
```

### Passing Custom Sampling Context

```csharp
var transaction = SentrySdk.StartTransaction(
    new TransactionContext("checkout", "http.server"),
    new Dictionary<string, object?> { ["isCritical"] = true }
);
```

`TransactionSamplingContext` shape:

```csharp
public class TransactionSamplingContext
{
    public ITransactionContext TransactionContext { get; }
    public IReadOnlyDictionary<string, object?> CustomSamplingContext { get; }
}
```

---

## ASP.NET Core Middleware Integration

### Setup

```csharp
// Program.cs — .NET 6+ minimal API
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSentry(options =>
{
    options.Dsn = "https://...@o0.ingest.sentry.io/...";
    options.TracesSampleRate = 1.0;
    options.SendDefaultPii = true; // include user info in transactions
});

var app = builder.Build();

// Place UseSentry() BEFORE all other middleware to capture the full request lifecycle
app.UseSentry();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### What Happens Automatically

| Behavior | Detail |
|---|---|
| One transaction per request | `SentryMiddleware` creates an `ITransactionTracer` for every HTTP request |
| Route-based naming | Transaction name = route template (e.g., `GET /api/users/{id}`) with `TransactionNameSource.Route` |
| Error linking | Transaction is set on scope → all errors captured during the request are linked to it |
| Distributed trace continuation | Incoming `sentry-trace` + `baggage` headers are read; `ContinueTrace()` is called automatically |
| Outgoing HTTP spans | `SentryHttpMessageHandler` auto-registered with `IHttpClientFactory` → child spans on every outbound call |
| EF Core / SQLClient spans | `DiagnosticSource` integration adds `db.*` child spans automatically (≥3.9.0) |
| Transaction send | Finished and sent to Sentry when the response is written |

### Dropping or Renaming Transactions

```csharp
options.BeforeSendTransaction = transaction =>
{
    // Drop internal/health routes
    if (transaction.Name.StartsWith("GET /internal/")) return null;

    return transaction;
};
```

---

## Auto-Instrumentation Reference

| Integration | Spans Created | Package | Notes |
|---|---|---|---|
| ASP.NET Core requests | `http.server` transaction per request | `Sentry.AspNetCore` | Enabled automatically by `UseSentry()` |
| Outgoing HTTP (`IHttpClientFactory`) | `http.client` spans | `Sentry.AspNetCore` | Requires active transaction on scope |
| EF Core queries | `db.query_compiler`, `db.connection`, `db.query` | `Sentry.DiagnosticSource` (auto in `Sentry.AspNetCore` ≥3.9.0) | Opt out with `DisableDiagnosticSourceIntegration()` |
| SQLClient | `db.connection`, `db.query` | `Sentry.DiagnosticSource` | Same as EF Core |
| Azure Functions Worker | Transaction per invocation | `Sentry.AzureFunctions.Worker` | Auto-registered |
| Hangfire jobs | Transaction per job | `Sentry.Hangfire` | Auto-registered |
| `Microsoft.Extensions.AI` | `ai.*` spans | `Sentry.Extensions.AI` | — |

### EF Core Span Types

Three spans are created automatically per EF Core query:

```
db.query_compiler  — query compilation / optimization (cached after first run)
db.connection      — database connection lifecycle
db.query           — actual SQL execution
```

### Outgoing HTTP Auto-Instrumentation

Spans are only created when there is an **active transaction on scope**. For manual `HttpClient` construction outside of `IHttpClientFactory`:

```csharp
var sentryHandler = new SentryHttpMessageHandler();
var httpClient = new HttpClient(sentryHandler);

// Must have a transaction active first
var tx = SentrySdk.StartTransaction("my-op", "http.client");
SentrySdk.ConfigureScope(s => s.Transaction = tx);

var response = await httpClient.GetStringAsync("https://api.example.com");
// ^ creates a "GET https://api.example.com" child span

tx.Finish();
```

---

## Custom Instrumentation

### Minimal Example

```csharp
var transaction = SentrySdk.StartTransaction("test-transaction", "test-operation");

var span = transaction.StartChild("test-child-operation");
// ... do work ...
span.Finish();

transaction.Finish(); // sends everything to Sentry
```

### Real-World Example: Checkout Flow

```csharp
public async Task PerformCheckoutAsync()
{
    var transaction = SentrySdk.StartTransaction("checkout", "perform-checkout");

    // Set on scope so that:
    // 1. Errors during this transaction are linked to it
    // 2. Auto-instrumentation (HTTP, EF Core) attaches child spans to it
    SentrySdk.ConfigureScope(scope => scope.Transaction = transaction);

    // Validate cart
    var validationSpan = transaction.StartChild("validation", "validating shopping cart");
    try
    {
        await ValidateShoppingCartAsync();
        validationSpan.Finish(SpanStatus.Ok);
    }
    catch (Exception ex)
    {
        validationSpan.Finish(ex); // auto-maps exception type → SpanStatus
        transaction.Finish(ex);
        throw;
    }

    // Process payment
    var paymentSpan = transaction.StartChild("payment", "processing payment");
    await ProcessPaymentAsync();
    paymentSpan.Finish(SpanStatus.Ok);

    // Send confirmation
    var emailSpan = transaction.StartChild("email", "sending confirmation email");
    await SendConfirmationEmailAsync();
    emailSpan.Finish(SpanStatus.Ok);

    transaction.Finish(SpanStatus.Ok);
}
```

### Attaching to an Active Transaction

```csharp
public async Task DoSomethingAsync()
{
    var activeSpan = SentrySdk.GetSpan();

    if (activeSpan == null)
    {
        // No transaction in scope — start a new root transaction
        activeSpan = SentrySdk.StartTransaction("task", "background-job");
    }
    else
    {
        // Transaction already running — add a child
        activeSpan = activeSpan.StartChild("subtask");
    }

    // ... work ...
    activeSpan.Finish();
}
```

### Nested Spans with Data

```csharp
var transaction = SentrySdk.StartTransaction("data-pipeline", "pipeline");

var fetchSpan = transaction.StartChild("http.client", "fetch raw data");
    var parseSpan = fetchSpan.StartChild("serialize", "parse JSON response");
    parseSpan.Finish();
fetchSpan.Finish();

var processSpan = transaction.StartChild("function", "transform data");
    var dbSpan = processSpan.StartChild("db.query", "INSERT INTO results");
    dbSpan.SetData("db.system", "postgresql");
    dbSpan.SetData("db.statement", "INSERT INTO results (data) VALUES (?)");
    dbSpan.Finish();
processSpan.Finish();

transaction.Finish();
```

### DI-Friendly Pattern (`IHub`)

In ASP.NET Core, inject `IHub` instead of using the static `SentrySdk` API:

```csharp
public class OrderService
{
    private readonly IHub _hub;
    public OrderService(IHub hub) => _hub = hub;

    public async Task ProcessOrderAsync(int orderId)
    {
        var transaction = _hub.StartTransaction("process-order", "task");
        SentrySdk.ConfigureScope(s => s.Transaction = transaction);

        var span = transaction.StartChild("db.query", $"SELECT * FROM orders WHERE id = {orderId}");
        try
        {
            await FetchOrderAsync(orderId);
            span.Finish(SpanStatus.Ok);
            transaction.Finish(SpanStatus.Ok);
        }
        catch (Exception ex)
        {
            span.Finish(ex);
            transaction.Finish(ex);
            throw;
        }
    }
}
```

---

## Distributed Tracing

### Propagation Headers

Sentry uses two HTTP headers to propagate trace context between services:

| Header | Format | Purpose |
|---|---|---|
| `sentry-trace` | `traceId-spanId-samplingDecision` | Links spans across services into one trace |
| `baggage` | W3C Baggage | Carries Dynamic Sampling Context (DSC): `sentry-trace_id`, `sentry-public_key`, `sentry-environment`, `sentry-release`, `sentry-transaction`, etc. |

> **CORS note:** If you have browser frontends, explicitly allowlist `sentry-trace` and `baggage` in your CORS policy — they're blocked by default as non-simple headers.

### Automatic Propagation (ASP.NET Core)

No configuration needed:
- **Incoming:** `SentryMiddleware` reads `sentry-trace` + `baggage` and calls `ContinueTrace()` automatically
- **Outgoing:** `SentryHttpMessageHandler` injects `sentry-trace` + `baggage` into all `IHttpClientFactory` requests

### Restrict Which Hosts Receive Trace Headers

By default, headers are injected into **all** outgoing requests. Restrict with:

```csharp
options.TracePropagationTargets = new List<StringOrRegex>
{
    "api.mycompany.com",
    new StringOrRegex(new Regex(@"^https://.*\.mycompany\.com")),
};
```

### Manual Propagation — Outgoing

```csharp
// Read from active transaction
var sentryTrace = SentrySdk.GetTraceHeader()?.ToString();
var baggage     = SentrySdk.GetBaggage()?.ToString();

// W3C traceparent (alternative format)
var traceparent = SentrySdk.GetTraceparentHeader()?.ToString();

// Inject into your request
request.Headers["sentry-trace"] = sentryTrace;
request.Headers["baggage"]      = baggage;
```

### Manual Propagation — Incoming (`ContinueTrace`)

```csharp
// Service B receives an HTTP request from Service A
var sentryTraceHeader = httpRequest.Headers["sentry-trace"];
var baggageHeader     = httpRequest.Headers["baggage"];

// ContinueTrace parses headers and returns a pre-populated TransactionContext
// with the upstream traceId, parentSpanId, and sampling decision
var ctx = SentrySdk.ContinueTrace(
    sentryTraceHeader,
    baggageHeader,
    name: "process-incoming-request",
    operation: "http.server"
);

var transaction = SentrySdk.StartTransaction(ctx);
// Now this transaction is part of the same distributed trace as Service A
```

### Producer / Consumer Queue Example

**Producer:**

```csharp
var transaction = SentrySdk.StartTransaction("order-submitted", "function");

var publishSpan = transaction.StartChild("queue.publish", "orders");
publishSpan.SetData("messaging.message.id", messageId);
publishSpan.SetData("messaging.destination.name", "orders-queue");
publishSpan.SetData("messaging.message.body.size", Encoding.UTF8.GetByteCount(payload));

// Embed trace context in the message envelope
var envelope = new MessageEnvelope
{
    Payload    = payload,
    SentryTrace = SentrySdk.GetTraceHeader()?.ToString(),
    Baggage     = SentrySdk.GetBaggage()?.ToString(),
};

await queue.PublishAsync("orders-queue", envelope);
publishSpan.Finish();
transaction.Finish();
```

**Consumer:**

```csharp
var envelope = await queue.ConsumeAsync("orders-queue");

// Link consumer to producer's trace
var ctx         = SentrySdk.ContinueTrace(envelope.SentryTrace, envelope.Baggage);
var transaction = SentrySdk.StartTransaction(ctx, "process-order", "function");

var processSpan = transaction.StartChild("queue.process", "orders");
processSpan.SetData("messaging.message.id", envelope.MessageId);
processSpan.SetData("messaging.destination.name", "orders-queue");
processSpan.SetData("messaging.message.receive.latency", latencyMs);
processSpan.SetData("messaging.message.retry.count", retryCount);

try
{
    await ProcessOrderAsync(envelope.Payload);
    processSpan.Finish(SpanStatus.Ok);
    transaction.Finish(SpanStatus.Ok);
}
catch (Exception ex)
{
    processSpan.Finish(ex);
    SentrySdk.CaptureException(ex);
    transaction.Finish(ex);
}
```

---

## OpenTelemetry Integration

### Version Requirements

| Package | Minimum Version |
|---|---|
| `Sentry` | 6.1.0 |
| `Sentry.OpenTelemetry` | 6.1.0 |
| `OpenTelemetry` | 1.5.0 |

```bash
dotnet add package Sentry.OpenTelemetry
```

### How It Works

The `AddSentry()` extension registers a `SentrySpanProcessor` with the OTel `TracerProvider`. Span mapping:

- The **first** OTel `Span` flowing through the processor becomes a Sentry **Transaction**
- **Child** OTel `Span`s with the same parent become Sentry **child Spans** on that transaction
- A new top-level OTel `Span` from a different service creates a new Sentry **Transaction**, linked via the same distributed trace

### Full ASP.NET Core Setup

Two parts are required — both must be configured:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Part 1: Configure Sentry with UseOpenTelemetry()
builder.WebHost.UseSentry(options =>
{
    options.Dsn = "https://...@o0.ingest.sentry.io/...";
    options.TracesSampleRate = 1.0;
    options.UseOpenTelemetry(); // ← tells Sentry to use OTel for trace context propagation
    // Do NOT also configure Sentry's own DiagnosticSource integration —
    // let OTel instrumentation libraries handle it instead
});

// Part 2: Register OTel TracerProvider with AddSentry()
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddSentry() // ← routes all OTel spans to Sentry
    );

var app = builder.Build();
app.UseSentry();
app.Run();
```

### ⚠️ Exception Capture in OTel Mode

**Do NOT use OTel's exception APIs** — they strip exception data before Sentry can see it:

```csharp
// ❌ These lose exception details
activity.RecordException(ex);
activity.AddException(ex);

// ✅ Use these instead
_logger.LogError(ex, "Something went wrong"); // ILogger (Sentry captures via logging integration)
SentrySdk.CaptureException(ex);               // or capture directly
```

---

## Dynamic Sampling

Sentry's dynamic sampling uses the **Dynamic Sampling Context (DSC)** carried in `baggage` to make consistent sampling decisions across a distributed trace.

### How It Works

1. The **head service** (first in the trace) makes the sampling decision.
2. The decision is encoded in `baggage` as `sentry-sampled=true|false`.
3. All downstream services receive `baggage` and honor the upstream decision.
4. DSC fields: `sentry-trace_id`, `sentry-public_key`, `sentry-sample_rate`, `sentry-sampled`, `sentry-release`, `sentry-environment`, `sentry-transaction`, `sentry-user_segment`.

### `TransactionNameSource` — Critical for Grouping

High-cardinality names (raw URLs) break dynamic sampling grouping. Use parameterized routes:

```csharp
// ❌ Raw URL — creates unbounded unique groups, defeats sampling
SentrySdk.StartTransaction("/users/12345/orders/9876", "http.server");

// ✅ Parameterized — clean grouping, correct dynamic sampling
SentrySdk.StartTransaction(new TransactionContext(
    "/users/{userId}/orders/{orderId}",
    "http.server",
    nameSource: TransactionNameSource.Route
));
```

| `TransactionNameSource` | Cardinality | Use For |
|---|---|---|
| `Route` | Low ✅ | Parameterized route templates (e.g., `GET /users/{id}`) |
| `Custom` | Low ✅ | User-defined names (background jobs, tasks) |
| `View` | Low ✅ | Controller / view class names |
| `Component` | Medium | Function / component names |
| `Url` | High ❌ | Raw URLs — avoid for dynamic sampling |
| `Task` | Low ✅ | Background task names |

---

## Operation Types and Naming Conventions

The `operation` string categorizes and color-codes spans in the Sentry UI. Follow these conventions:

| Category | Operation | Example Description |
|---|---|---|
| HTTP server | `http.server` | `GET /api/users` |
| HTTP client | `http.client` | `GET https://api.stripe.com/v1/charges` |
| DB query | `db.query` | `SELECT * FROM orders WHERE id = ?` |
| DB connection | `db.connection` | — |
| DB compile | `db.query_compiler` | The LINQ/HQL expression |
| Cache read | `cache.get` | The cache key |
| Cache write | `cache.put` | The cache key |
| Queue publish | `queue.publish` | Queue or topic name |
| Queue consume | `queue.process` | Queue or topic name |
| Function | `function` | Function or method name |
| Background task | `task` | Task name |
| Serialization | `serialize` | — |
| Validation | `validation` | What is being validated |
| AI inference | `ai.*` | Model name |

### `Origin` Field

Indicates whether a span was created by auto-instrumentation or by your code:

| Value | Source |
|---|---|
| `auto.http.aspnetcore` | ASP.NET Core middleware |
| `auto.http.system_net_http` | `SentryHttpMessageHandler` |
| `auto.db.ef_core` | EF Core DiagnosticSource |
| `auto.db.sql_client` | SQLClient DiagnosticSource |
| `manual` | User code |

---

## Custom Measurements

Attach numeric measurements to transactions (requires `Sentry` ≥3.23.0):

```csharp
var span = SentrySdk.GetSpan();
if (span != null)
{
    var transaction = span.GetTransaction();

    transaction.SetMeasurement("memory_used",            64,   MeasurementUnit.Information.Megabyte);
    transaction.SetMeasurement("profile_loading_time",   1.3,  MeasurementUnit.Duration.Second);
    transaction.SetMeasurement("items_processed",        1500);           // unitless
    transaction.SetMeasurement("cache_hit_rate",         0.85, MeasurementUnit.Fraction.Ratio);
}
```

### `MeasurementUnit` Quick Reference

| Category | Values |
|---|---|
| Duration | `Nanosecond`, `Microsecond`, `Millisecond`, `Second`, `Minute`, `Hour`, `Day`, `Week` |
| Information | `Bit`, `Byte`, `Kilobyte`/`Kibibyte`, `Megabyte`/`Mebibyte`, `Gigabyte`/`Gibibyte`, … |
| Fraction | `Ratio`, `Percent` |
| Unitless | Omit unit parameter |

> **⚠️ Unit consistency:** `("latency", 60, Second)` and `("latency", 3, Minute)` are stored as **separate measurements**, not aggregated. Always use the same unit per measurement name.

---

## `SpanStatus` Reference

```csharp
SpanStatus.Ok                // success
SpanStatus.Cancelled         // OperationCanceledException
SpanStatus.InvalidArgument   // ArgumentException, bad input
SpanStatus.DeadlineExceeded  // TimeoutException
SpanStatus.NotFound          // 404
SpanStatus.PermissionDenied  // UnauthorizedAccessException, 403
SpanStatus.ResourceExhausted // 429 / out of resources
SpanStatus.Unimplemented     // NotImplementedException, 501
SpanStatus.Unavailable       // 503
SpanStatus.InternalError     // unhandled exception, 500
SpanStatus.UnknownError      // unknown failure
SpanStatus.FailedPrecondition // InvalidOperationException
SpanStatus.Aborted           // conflicting operation
SpanStatus.DataLoss          // unrecoverable data loss
```

`span.Finish(exception)` auto-maps exception type → `SpanStatus`. HTTP status codes from `SentryHttpMessageHandler` are also mapped automatically (`2xx→Ok`, `401→Unauthenticated`, `403→PermissionDenied`, `404→NotFound`, `429→ResourceExhausted`, `5xx→InternalError`).

---

## Complete Configuration Reference

```csharp
SentrySdk.Init(options =>
{
    // ── Identity ──────────────────────────────────────────────────────────
    options.Dsn         = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.Environment = "production";
    options.Release     = "my-app@1.2.3";

    // ── Tracing ───────────────────────────────────────────────────────────
    options.TracesSampleRate = 0.2;  // 20% uniform rate

    // OR dynamic sampler (takes precedence when set)
    options.TracesSampler = ctx =>
    {
        if (ctx.TransactionContext.Name.Contains("/health")) return 0.0;
        return 0.1;
    };

    // Restrict which outbound hosts receive trace headers (default: all)
    options.TracePropagationTargets = new List<StringOrRegex>
    {
        "api.mycompany.internal",
        new StringOrRegex(new Regex(@"^https://.*\.mycompany\.com")),
    };

    // ── Auto-instrumentation control ──────────────────────────────────────
    // options.DisableDiagnosticSourceIntegration(); // opt out of EF Core / SQLClient spans

    // ── OpenTelemetry (optional) ──────────────────────────────────────────
    // options.UseOpenTelemetry(); // use when routing spans via OTel TracerProvider

    // ── Profiling (Alpha, .NET 8+ only) ───────────────────────────────────
    // options.ProfilesSampleRate = 0.1;
    // options.AddProfilingIntegration(TimeSpan.FromMilliseconds(500)); // sync startup
});
```

### Key Options Table

| Option | Type | Default | Purpose |
|---|---|---|---|
| `TracesSampleRate` | `double?` | `null` (disabled) | Uniform sampling rate 0.0–1.0 |
| `TracesSampler` | `Func<TransactionSamplingContext, double?>` | `null` | Dynamic sampler; overrides `TracesSampleRate` |
| `TracePropagationTargets` | `IList<StringOrRegex>` | `[".*"]` (all) | Hosts that receive `sentry-trace` + `baggage` headers |
| `SendDefaultPii` | `bool` | `false` | Include user IP and username in transactions |
| `MaxSpans` | `int` | `1000` | Maximum child spans per transaction |
| `ProfilesSampleRate` | `double?` | `null` | Profiling rate relative to traced transactions |
| `UseOpenTelemetry()` | method | — | Enable OTel-based trace context propagation |
| `DisableDiagnosticSourceIntegration()` | method | — | Opt out of EF Core / SQLClient auto-spans |

---

## Quick Reference Cheat Sheet

```csharp
// ── Start a root transaction ──────────────────────────────────────────────
var tx = SentrySdk.StartTransaction("name", "operation");
SentrySdk.ConfigureScope(s => s.Transaction = tx);  // link errors + enable auto-spans

// ── Add child spans ───────────────────────────────────────────────────────
var span = tx.StartChild("operation", "description");
span.SetData("key", "value");
span.Finish(SpanStatus.Ok);

// ── Get the active span from anywhere ────────────────────────────────────
var active = SentrySdk.GetSpan();
var child  = active?.StartChild("nested-op");
child?.Finish();

// ── Access the transaction from a span ───────────────────────────────────
var txFromSpan = active?.GetTransaction();
txFromSpan?.SetMeasurement("count", 42, MeasurementUnit.Duration.Millisecond);

// ── Finish variants ───────────────────────────────────────────────────────
tx.Finish();                          // implicit Ok
tx.Finish(SpanStatus.InternalError);  // explicit status
tx.Finish(exception);                 // auto-maps exception → SpanStatus

// ── Distributed tracing: outgoing headers ─────────────────────────────────
var traceHeader  = SentrySdk.GetTraceHeader()?.ToString();   // "sentry-trace" value
var baggage      = SentrySdk.GetBaggage()?.ToString();        // "baggage" value
var traceparent  = SentrySdk.GetTraceparentHeader()?.ToString(); // W3C format

// ── Distributed tracing: incoming headers ─────────────────────────────────
var ctx    = SentrySdk.ContinueTrace(incomingTraceHeader, incomingBaggageHeader);
var linked = SentrySdk.StartTransaction(ctx, "name", "op");
```

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| No transactions appear in Sentry | `TracesSampleRate` and `TracesSampler` are both unset | Set `options.TracesSampleRate = 1.0` (or `>0`) during `SentrySdk.Init()` |
| Transactions appear but have no child spans | Transaction not set on scope | Call `SentrySdk.ConfigureScope(s => s.Transaction = tx)` after starting the transaction |
| Outgoing HTTP spans missing | `HttpClient` created manually without `SentryHttpMessageHandler` | Use `IHttpClientFactory`, or wrap with `new HttpClient(new SentryHttpMessageHandler())` |
| EF Core spans missing | `Sentry.DiagnosticSource` not installed or version < 3.9.0 | Install `Sentry.DiagnosticSource`, or upgrade `Sentry.AspNetCore` to ≥3.9.0 |
| Distributed trace not connected across services | Missing `ContinueTrace()` on receiving end | Call `SentrySdk.ContinueTrace(traceHeader, baggageHeader)` and use the returned context to start the transaction |
| `sentry-trace` header stripped by browser preflight | CORS policy blocks non-simple headers | Add `sentry-trace` and `baggage` to `Access-Control-Allow-Headers` in your CORS config |
| OTel spans not appearing in Sentry | `AddSentry()` missing from `TracerProvider` OR `UseOpenTelemetry()` missing from `SentryOptions` | Both are required: `AddSentry()` in OTel builder AND `options.UseOpenTelemetry()` in Sentry init |
| OTel mode: exceptions captured with no context | Using `activity.RecordException()` or `activity.AddException()` | Use `SentrySdk.CaptureException(ex)` or `_logger.LogError(ex, ...)` instead |
| High-cardinality transaction groups | Transaction names are raw URLs | Use `TransactionNameSource.Route` with parameterized route templates |
