# Error Monitoring — Sentry Go SDK

> Minimum SDK: `github.com/getsentry/sentry-go` v0.9.0+

## Configuration

Key `ClientOptions` fields for error monitoring:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `Dsn` | `string` | `""` | SDK disabled if empty |
| `AttachStacktrace` | `bool` | `false` | Stack traces on `CaptureMessage` calls |
| `SendDefaultPII` | `bool` | `false` | Include IP, request headers |
| `SampleRate` | `float64` | `1.0` | Error event sample rate (0.0 treated as 1.0) |
| `MaxBreadcrumbs` | `int` | `100` | Max breadcrumbs per event (negative = disabled) |
| `MaxErrorDepth` | `int` | `100` | Max depth for unwrapping error chains |
| `IgnoreErrors` | `[]string` | `nil` | Regex patterns; matched errors are dropped |
| `BeforeSend` | `func(*Event, *EventHint) *Event` | `nil` | Mutate or drop error events before sending |
| `BeforeBreadcrumb` | `func(*Breadcrumb, *BreadcrumbHint) *Breadcrumb` | `nil` | Mutate or drop breadcrumbs |

## Code Examples

### Basic setup

```go
import (
    "log"
    "os"
    "time"
    "github.com/getsentry/sentry-go"
)

func main() {
    err := sentry.Init(sentry.ClientOptions{
        Dsn:              os.Getenv("SENTRY_DSN"),
        Environment:      os.Getenv("SENTRY_ENVIRONMENT"),
        Release:          release, // inject via -ldflags
        AttachStacktrace: true,
        SendDefaultPII:   true,
    })
    if err != nil {
        log.Fatalf("sentry.Init: %s", err)
    }
    defer sentry.Flush(2 * time.Second)
}
```

### Capturing errors and messages

```go
// Error (any value implementing error interface) — unwraps full chain
sentry.CaptureException(err)

// Plain message (use AttachStacktrace: true for stack traces)
sentry.CaptureMessage("queue depth exceeded threshold")

// Fully manual event
sentry.CaptureEvent(&sentry.Event{
    Message: "payment gateway timeout",
    Level:   sentry.LevelError,
    Tags:    map[string]string{"gateway": "stripe"},
    Fingerprint: []string{"payment-gateway", "timeout"},
})
```

### Panic recovery

```go
// Simplest — defer in any function
func riskyOperation() {
    defer sentry.Recover()
    panic("something catastrophic")
}

// With context — makes context available in BeforeSend via hint.Context
func handleRequest(ctx context.Context) {
    defer sentry.RecoverWithContext(ctx)
    processRequest()
}

// Manual — needed when you must flush before process exit
func main() {
    defer func() {
        if err := recover(); err != nil {
            sentry.CurrentHub().Recover(err)
            sentry.Flush(5 * time.Second)
        }
    }()
}

// HTTP middleware recovery pattern
func SentryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                sentry.CurrentHub().Recover(err)
                sentry.Flush(2 * time.Second)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

### Hub and scope — context enrichment

```go
// ConfigureScope — persistent modification of the current scope
sentry.ConfigureScope(func(scope *sentry.Scope) {
    scope.SetUser(sentry.User{
        ID:    "user-42",
        Email: "user@example.com",
    })
    scope.SetTag("region", "us-east-1")
    scope.SetContext("request_metadata", map[string]interface{}{
        "trace_id":   traceID,
        "account_id": accountID,
    })
})

// WithScope — isolated temporary scope; changes are discarded after the callback
sentry.WithScope(func(scope *sentry.Scope) {
    scope.SetTag("component", "checkout")
    scope.SetLevel(sentry.LevelWarning)
    sentry.CaptureException(err)
})
// ← scope changes above do NOT affect subsequent events
```

### Hub cloning for goroutines

```go
// ALWAYS clone the hub before spawning goroutines — global hub is not goroutine-safe
go func(hub *sentry.Hub) {
    hub.ConfigureScope(func(scope *sentry.Scope) {
        scope.SetTag("worker_id", "w-1")
    })
    hub.CaptureException(err)
}(sentry.CurrentHub().Clone())
```

### Breadcrumbs

```go
sentry.AddBreadcrumb(&sentry.Breadcrumb{
    Category: "auth",
    Message:  "user authenticated",
    Level:    sentry.LevelInfo,
})

sentry.AddBreadcrumb(&sentry.Breadcrumb{
    Type:     "http",
    Category: "http",
    Data: map[string]interface{}{
        "url":         "https://api.example.com/orders",
        "method":      "POST",
        "status_code": 503,
    },
    Level: sentry.LevelError,
})
```

### Error wrapping and chains

The SDK automatically traverses the full error chain from `CaptureException`. Each error becomes a separate exception entry in Sentry.

```go
// %w wrapping — both errors captured; dbErr shown as root cause
dbErr := errors.New("connection refused")
appErr := fmt.Errorf("failed to load user %d: %w", userID, dbErr)
sentry.CaptureException(appErr)

// errors.Join (Go 1.20+) — captured as Sentry exception group
combined := errors.Join(errors.New("email invalid"), errors.New("token expired"))
sentry.CaptureException(combined)
```

| Wrapping pattern | Interface | Mechanism |
|-----------------|-----------|-----------|
| `fmt.Errorf("%w", err)` | `Unwrap() error` | `"unwrap"` |
| `errors.Join(...)` | `Unwrap() []error` | `"chained"` |
| `pkg/errors` | `Cause() error` | `"cause"` |

Limit chain depth with `MaxErrorDepth` (default 100).

### BeforeSend hook

```go
sentry.Init(sentry.ClientOptions{
    Dsn: os.Getenv("SENTRY_DSN"),
    BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        // Drop events from health check endpoints
        if event.Request != nil && strings.HasPrefix(event.Request.URL, "/health") {
            return nil // discard
        }
        // Scrub PII
        event.User.Email = ""
        event.User.IPAddress = ""
        // Enrich from original exception type
        if dbErr, ok := hint.OriginalException.(*DatabaseError); ok {
            event.Tags["db.table"] = dbErr.Table
        }
        // Access context set by RecoverWithContext
        if hint.Context != nil {
            if reqID, ok := hint.Context.Value(RequestIDKey).(string); ok {
                event.Tags["request_id"] = reqID
            }
        }
        return event
    },
    // BeforeSend is NOT called for transaction events — use BeforeSendTransaction for those
    BeforeSendTransaction: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        if event.Transaction == "GET /healthz" {
            return nil
        }
        return event
    },
})
```

### Event processors

```go
// Scope-level (per-request enrichment — preferred)
sentry.ConfigureScope(func(scope *sentry.Scope) {
    scope.AddEventProcessor(func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        event.Tags["request_id"] = r.Header.Get("X-Request-ID")
        event.Tags["tenant_id"]  = r.Header.Get("X-Tenant-ID")
        return event
    })
})

// Client-level (all events from this client)
client, _ := sentry.NewClient(sentry.ClientOptions{Dsn: os.Getenv("SENTRY_DSN")})
client.AddEventProcessor(func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
    event.Tags["build_sha"] = os.Getenv("GIT_SHA")
    return event
})
```

Processor execution order: scope processors (LIFO) → client processors → `BeforeSend`.

### Fingerprinting and custom grouping

```go
// One-off — override grouping for a specific error type
sentry.WithScope(func(scope *sentry.Scope) {
    scope.SetFingerprint([]string{"database-connection-error"})
    sentry.CaptureException(err)
})

// Extend default grouping (keeps stack trace + adds discriminators)
BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
    if rpcErr, ok := hint.OriginalException.(MyRPCError); ok {
        event.Fingerprint = []string{
            "{{ default }}",
            rpcErr.FunctionName(),
            strconv.Itoa(rpcErr.ErrorCode()),
        }
    }
    return event
},
```

### Flush patterns

```go
// Recommended: defer in main()
defer sentry.Flush(2 * time.Second)

// os.Exit() bypasses defer — call explicitly
sentry.Flush(2 * time.Second)
os.Exit(1)

// Context-based
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
sentry.FlushWithContext(ctx)

// Synchronous transport (no flush needed — every send blocks)
transport := sentry.NewHTTPSyncTransport()
transport.Timeout = 3 * time.Second
sentry.Init(sentry.ClientOptions{Dsn: "...", Transport: transport})
```

## Scope API Reference

```go
scope.SetUser(sentry.User{ID: "42", Email: "user@example.com"})
scope.SetTag("key", "value")
scope.SetTags(map[string]string{"k": "v"})
scope.SetExtra("key", value)           // deprecated — prefer SetContext
scope.SetContext("key", map[string]interface{}{"field": "value"})
scope.SetLevel(sentry.LevelError)      // "debug" | "info" | "warning" | "error" | "fatal"
scope.SetRequest(r *http.Request)
scope.SetFingerprint([]string{"my-group"})
scope.AddBreadcrumb(bc, limit)
scope.ClearBreadcrumbs()
scope.AddEventProcessor(func(*sentry.Event, *sentry.EventHint) *sentry.Event)
scope.Clear()
scope.Clone() *sentry.Scope
```

## Best Practices

- Call `sentry.Init()` once in `main()`, before any goroutines or handlers start
- Always check the error returned by `sentry.Init()`
- Always `defer sentry.Flush(2 * time.Second)` in `main()`; call it explicitly before `os.Exit()`
- Clone the hub before passing it to goroutines: `hub := sentry.CurrentHub().Clone()`
- Use `WithScope` for one-off context; use `ConfigureScope` for persistent session context
- Prefer `SetContext` over `SetExtra` for structured data (Extra is deprecated)
- Use `BeforeSend` to strip PII — never send raw email/IP unless `SendDefaultPII: true` is intentional
- Set `MaxErrorDepth` to a sensible value (5–10) for deeply wrapped error chains

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `Debug: true`; verify DSN; ensure `sentry.Flush()` is called |
| Missing stack traces on messages | Set `AttachStacktrace: true` in `ClientOptions` |
| Goroutine events missing scope data | Clone hub before goroutine: `sentry.CurrentHub().Clone()` |
| Panics not captured | Register framework middleware before handlers; or add `defer sentry.Recover()` |
| `defer sentry.Flush` not running | `os.Exit()` skips defers — call `sentry.Flush()` explicitly |
| `SampleRate: 0.0` still sending | `0.0` is treated as `1.0`; to drop all, set `Dsn: ""` |
| Error chain shows only top error | Check `MaxErrorDepth`; ensure errors use `%w` or implement `Unwrap()` |
| BeforeSend not called for transactions | Use `BeforeSendTransaction` for transaction/performance events |
