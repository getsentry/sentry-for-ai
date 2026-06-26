# Tracing — Sentry Go SDK

> Minimum SDK: `github.com/getsentry/sentry-go` v0.9.0+

## Configuration

```go
sentry.Init(sentry.ClientOptions{
    Dsn:              os.Getenv("SENTRY_DSN"),
    EnableTracing:    true,      // REQUIRED — tracing is off by default
    TracesSampleRate: 1.0,       // start at 1.0 for dev; lower in production
})
```

Key tracing fields in `ClientOptions`:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `EnableTracing` | `bool` | `false` | Must be `true` to enable tracing |
| `TracesSampleRate` | `float64` | `0.0` | Uniform sample rate [0.0–1.0] |
| `TracesSampler` | `TracesSampler` | `nil` | Custom per-transaction sampling; overrides `TracesSampleRate` |
| `MaxSpans` | `int` | `1000` | Max child spans per transaction |
| `TracePropagationTargets` | `[]string` | `nil` | URLs to inject trace headers into (nil = all) |
| `PropagateTraceparent` | `bool` | `false` | Also propagate W3C `traceparent` header |
| `TraceIgnoreStatusCodes` | `[][]int` | `[[404]]` | HTTP codes that skip trace creation |
| `BeforeSendTransaction` | `func` | `nil` | Mutate or drop transaction events |

## Code Examples

### Custom sampler

Use `TracesSampler` instead of `TracesSampleRate` for per-transaction control. Setting both — sampler wins.

```go
sentry.Init(sentry.ClientOptions{
    Dsn:          os.Getenv("SENTRY_DSN"),
    EnableTracing: true,
    TracesSampler: sentry.TracesSampler(func(ctx sentry.SamplingContext) float64 {
        switch ctx.Span.Name {
        case "GET /healthz", "GET /metrics":
            return 0.0  // never sample
        case "POST /checkout":
            return 1.0  // always sample
        default:
            return 0.1  // 10% of everything else
        }
    }),
})
```

`SamplingContext` fields:
- `ctx.Span` — current span (always non-nil)
- `ctx.Parent` — parent span (nil for root transactions)

### Manual transactions and spans

```go
// Start a root transaction
tx := sentry.StartTransaction(ctx, "process-order",
    sentry.WithOpName("task"),
    sentry.WithTransactionSource(sentry.SourceCustom),
)
defer tx.Finish()

// Start a child span — pass tx.Context() to nest under the transaction
dbSpan := sentry.StartSpan(tx.Context(), "db.query")
dbSpan.Description = "INSERT INTO orders (user_id, total) VALUES (?, ?)"
dbSpan.SetData("db.system", "postgresql")
dbSpan.SetData("db.rows_affected", 1)
defer dbSpan.Finish()

// Alternative: StartChild on the parent span directly
cacheSpan := tx.StartChild("cache.get",
    sentry.WithDescription("get:user:42"),
)
defer cacheSpan.Finish()
```

### HTTP handler with manual transaction

```go
http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
    hub := sentry.CurrentHub().Clone()
    ctx := sentry.SetHubOnContext(r.Context(), hub)

    tx := sentry.StartTransaction(ctx,
        fmt.Sprintf("%s %s", r.Method, r.URL.Path),
        sentry.WithOpName("http.server"),
        sentry.ContinueFromRequest(r),           // link to incoming distributed trace
        sentry.WithTransactionSource(sentry.SourceURL),
    )
    defer tx.Finish()

    users, err := fetchUsers(tx.Context())
    if err != nil {
        hub.CaptureException(err)
        http.Error(w, "internal error", 500)
        return
    }
    fmt.Fprintf(w, "%d users", len(users))
})

func fetchUsers(ctx context.Context) ([]string, error) {
    span := sentry.StartSpan(ctx, "db.query")
    span.Description = "SELECT id, name FROM users"
    span.SetData("db.system", "postgresql")
    defer span.Finish()

    time.Sleep(10 * time.Millisecond)
    span.Status = sentry.SpanStatusOK
    return []string{"alice", "bob"}, nil
}
```

### Setting span status and data

```go
span := sentry.StartSpan(ctx, "http.client")
span.Description = "GET https://api.stripe.com/v1/charges"
span.SetData("http.request.method", "GET")
span.SetData("server.address", "api.stripe.com")

req, _ := http.NewRequestWithContext(span.Context(), "GET", "https://api.stripe.com/v1/charges", nil)
resp, err := http.DefaultClient.Do(req)
if err != nil {
    span.Status = sentry.SpanStatusInternalError
} else {
    span.Status = sentry.HTTPtoSpanStatus(resp.StatusCode)
    span.SetData("http.response.status_code", resp.StatusCode)
}
defer span.Finish()
```

> `span.Status` is set **directly** — there is no `SetStatus()` method.

### Retrieving active transaction or span from context

```go
// Root transaction
tx := sentry.TransactionFromContext(ctx)
if tx != nil {
    tx.SetTag("user_id", "42")
    tx.Name = "custom-name"
}

// Innermost span (may be a child)
span := sentry.SpanFromContext(ctx)
span.SetData("result_count", 47)
```

## Framework Middleware

All framework middlewares automatically start a root transaction per request and continue incoming distributed traces.

| Framework | Import | Middleware call | Transaction source |
|-----------|--------|----------------|-------------------|
| `net/http` | `sentry-go/http` | `sentryhttp.New(opts).Handle(mux)` | `SourceURL` |
| Gin | `sentry-go/gin` | `router.Use(sentrygin.New(opts))` | `SourceRoute` |
| Echo | `sentry-go/echo` | `e.Use(sentryecho.New(opts))` | `SourceRoute` |
| Fiber | `sentry-go/fiber` | `app.Use(sentryfiber.New(opts))` | `SourceURL` |
| Iris | `sentry-go/iris` | `app.Use(sentryiris.New(opts))` | `SourceRoute` |

Accessing the current transaction in a framework handler:

```go
// net/http — use the standard context
tx := sentry.TransactionFromContext(r.Context())

// Gin
tx := sentrygin.GetSpanFromContext(c)

// Echo
tx := sentryecho.GetSpanFromContext(c)

// Fiber
tx := sentryfiber.GetSpanFromContext(c)

// Iris
tx := sentryiris.GetSpanFromContext(c)
```

Adding a child span in a Gin handler:

```go
router.GET("/users/:id", func(c *gin.Context) {
    tx := sentrygin.GetSpanFromContext(c)

    dbSpan := sentry.StartSpan(tx.Context(), "db.query")
    dbSpan.Description = "SELECT * FROM users WHERE id = ?"
    defer dbSpan.Finish()

    // handler logic...
})
```

## Distributed Tracing

Sentry propagates two headers:

| Header | Constant | Purpose |
|--------|----------|---------|
| `sentry-trace` | `sentry.SentryTraceHeader` | Links spans across services |
| `baggage` | `sentry.SentryBaggageHeader` | Dynamic Sampling Context |

**Consuming an incoming trace (downstream service):**

```go
// ContinueFromRequest reads both sentry-trace and baggage headers automatically
tx := sentry.StartTransaction(ctx, "GET /api/check",
    sentry.WithOpName("http.server"),
    sentry.ContinueFromRequest(r),
    sentry.WithTransactionSource(sentry.SourceRoute),
)
defer tx.Finish()
```

**Propagating to an outgoing request (upstream service):**

```go
func callDownstream(ctx context.Context, url string) {
    hub := sentry.GetHubFromContext(ctx)

    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set(sentry.SentryTraceHeader, hub.GetTraceparent())
    req.Header.Set(sentry.SentryBaggageHeader, hub.GetBaggage())

    http.DefaultClient.Do(req)
}
```

**Hub header methods:**

```go
hub.GetTraceparent()    // sentry-trace format: "traceID-spanID-sampled"
hub.GetTraceparentW3C() // W3C format: "00-traceID-spanID-01"
hub.GetBaggage()        // "sentry-trace_id=...,sentry-environment=production,..."
```

Both `sentry-trace` AND `baggage` headers must be propagated for correct Dynamic Sampling Context.

### OpenTelemetry bridge

For projects already using OpenTelemetry, forward OTel spans to Sentry without changing instrumentation:

```go
import (
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sentryotel "github.com/getsentry/sentry-go/otel"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

sentry.Init(sentry.ClientOptions{
    Dsn:              os.Getenv("SENTRY_DSN"),
    EnableTracing:    true,
    TracesSampleRate: 1.0,
})

tp := sdktrace.NewTracerProvider(
    sdktrace.WithSpanProcessor(sentryotel.NewSentrySpanProcessor()),
)
otel.SetTracerProvider(tp)
otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
    propagation.TraceContext{},
    propagation.Baggage{},
    sentryotel.NewSentryPropagator(),
))
```

When using OTel, pass the OTel context explicitly when capturing errors — global `sentry.CaptureException` does not auto-link:

```go
hub := sentry.CurrentHub()
hub.Client().CaptureException(
    err,
    &sentry.EventHint{Context: otelCtx},
    hub.Scope(),
)
```

## SpanOption Reference

```go
sentry.WithOpName("http.server")                 // sets span.Op
sentry.WithDescription("SELECT * FROM users")    // sets span.Description
sentry.WithTransactionName("checkout")           // sets root span name
sentry.WithTransactionSource(sentry.SourceRoute) // transaction naming source
sentry.WithSpanSampled(sentry.SampledTrue)       // force-sample this span
sentry.ContinueFromRequest(r *http.Request)      // read sentry-trace + baggage from request
sentry.ContinueFromHeaders(trace, baggage string)// pass raw header strings
sentry.ContinueTrace(hub, traceparent, baggage)  // hub-aware form
```

## TransactionSource Constants

| Constant | Value | Use when... |
|----------|-------|-------------|
| `SourceURL` | `"url"` | Raw URL path (low-cardinality risk) |
| `SourceRoute` | `"route"` | Parameterised template, e.g. `/users/:id` — **preferred** |
| `SourceView` | `"view"` | View/controller name |
| `SourceCustom` | `"custom"` | Manually set name |
| `SourceTask` | `"task"` | Background task name |

Use `SourceRoute` with parameterised paths to prevent high-cardinality grouping in Sentry's Performance UI.

## SpanStatus Constants

Set directly: `span.Status = sentry.SpanStatusOK`

| Constant | When to use |
|----------|-------------|
| `SpanStatusOK` | Success |
| `SpanStatusInternalError` | Unhandled server error |
| `SpanStatusNotFound` | Resource not found |
| `SpanStatusPermissionDenied` | Auth failure |
| `SpanStatusDeadlineExceeded` | Timeout |
| `SpanStatusInvalidArgument` | Bad input |
| `SpanStatusUnavailable` | Service unavailable |

Or derive from HTTP response: `span.Status = sentry.HTTPtoSpanStatus(resp.StatusCode)`

## Common Span Op Values

| Op | Usage |
|----|-------|
| `http.server` | Incoming HTTP requests |
| `http.client` | Outgoing HTTP calls |
| `db.query` | SQL SELECT/INSERT/UPDATE/DELETE |
| `db` | Generic database operation |
| `cache.get` / `cache.set` | Cache reads/writes |
| `queue.publish` / `queue.process` | Message queues |
| `function` | Generic function call |
| `task` | Background job |
| `grpc.server` / `grpc.client` | gRPC spans |

## Best Practices

- Set `EnableTracing: true` explicitly — it defaults to `false`
- Use `TracesSampler` (not `TracesSampleRate`) for any environment-specific or route-specific sampling logic
- Always `defer span.Finish()` — unfinished spans are silently dropped
- Use `SourceRoute` with parameterised route templates to avoid high-cardinality transaction names
- Use `ContinueFromRequest(r)` in every HTTP handler to preserve distributed traces
- Propagate both `sentry-trace` AND `baggage` headers on outgoing requests
- Don't set `MaxSpans` below the number of expected child spans in your largest transactions

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions appearing | Ensure `EnableTracing: true` and `TracesSampleRate > 0` |
| Spans missing from transaction | Ensure `defer span.Finish()` is called on every span |
| High-cardinality transaction names | Use `WithTransactionSource(SourceRoute)` with parameterised route templates |
| Distributed trace not linked | Propagate both `sentry-trace` and `baggage` headers; use `ContinueFromRequest` |
| Health checks polluting data | Use `TracesSampler` to return `0.0` for health endpoints |
| Too many spans | Lower `MaxSpans`; coalesce high-frequency child spans (e.g., N+1 DB calls) |
| OTel errors not linked to trace | Pass OTel `ctx` via `EventHint.Context`; don't use global `sentry.CaptureException` |
