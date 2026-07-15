# Logging — Sentry Go SDK

> Minimum SDK: `github.com/getsentry/sentry-go` v0.33.0+  
> Minimum SDK for zap integration: v0.43.0+

## Configuration

Enable Sentry Logs in `sentry.Init`:

```go
sentry.Init(sentry.ClientOptions{
    Dsn:        os.Getenv("SENTRY_DSN"),
    EnableLogs: true, // REQUIRED — logs are off by default
})
```

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `EnableLogs` | `bool` | `false` | Enable Sentry Logs feature |
| `BeforeSendLog` | `func(*Log) *Log` | `nil` | Mutate or drop log entries before sending |

> If `EnableLogs` is `false`, `sentry.NewLogger(ctx)` returns a **no-op logger** — all calls are silently discarded.

## Code Examples

### Native Sentry logger

```go
import (
    "context"
    "time"
    "github.com/getsentry/sentry-go"
    "github.com/getsentry/sentry-go/attribute"
)

func main() {
    sentry.Init(sentry.ClientOptions{
        Dsn:        os.Getenv("SENTRY_DSN"),
        EnableLogs: true,
    })
    defer sentry.Flush(2 * time.Second)

    ctx := context.Background()
    logger := sentry.NewLogger(ctx)

    // Basic logging
    logger.Info().Emit("server started")
    logger.Warn().Emitf("queue depth: %d", 42)
    logger.Error().Emit("database connection lost")

    // Per-entry attributes (chained, non-persistent)
    logger.Info().
        String("request.id", "abc-123").
        Int("status.code", 200).
        Bool("cache.hit", true).
        Float64("latency.ms", 12.3).
        Emitf("request completed: %s", r.URL.Path)

    // Permanent logger-level attributes (all subsequent entries include these)
    logger.SetAttributes(
        attribute.String("service", "payment-api"),
        attribute.String("version", "2.1.0"),
    )

    // Switch context on a single entry (for trace correlation)
    logger.Info().WithCtx(requestCtx).Emit("handling request")
}
```

### Log levels

| Method | OTel Severity | Use for |
|--------|--------------|---------|
| `logger.Trace()` | 1 | Very detailed debugging |
| `logger.Debug()` | 5 | Development debugging |
| `logger.Info()` | 9 | Informational events |
| `logger.Warn()` | 13 | Warnings, recoverable issues |
| `logger.Error()` | 17 | Errors requiring attention |
| `logger.Fatal()` | 21 | Fatal — logs then calls `os.Exit(1)` |
| `logger.Panic()` | 21 | Fatal — logs then panics |
| `logger.LFatal()` | 21 | Logs at fatal level without exiting |

### BeforeSendLog — filtering logs

```go
sentry.Init(sentry.ClientOptions{
    Dsn:        os.Getenv("SENTRY_DSN"),
    EnableLogs: true,
    BeforeSendLog: func(log *sentry.Log) *sentry.Log {
        // Drop trace and debug logs
        if log.Severity <= sentry.LogSeverityDebug {
            return nil
        }
        // Drop logs from noisy subsystem
        if v, ok := log.Attributes["service"]; ok && v.String() == "health-checker" {
            return nil
        }
        return log
    },
})
```

`sentry.Log` struct fields: `Timestamp`, `TraceID`, `SpanID`, `Level`, `Severity` (int), `Body`, `Attributes`.

### Auto-attached attributes

The SDK automatically appends these to every log entry:

| Attribute | Source |
|-----------|--------|
| `sentry.release` | `ClientOptions.Release` |
| `sentry.environment` | `ClientOptions.Environment` |
| `sentry.server.address` | `ClientOptions.ServerName` or `os.Hostname()` |
| `sentry.sdk.name` / `.version` | SDK identifier |
| `sentry.message.template` | Set when `Emitf()` is used |
| `sentry.message.parameters.0`, `.1`… | Parameters passed to `Emitf()` |
| `user.id`, `user.name`, `user.email` | Set if user is in scope |

## Logging Integrations

### Logrus

```bash
go get github.com/getsentry/sentry-go/logrus
```

Two hook modes — use them independently or together:

```go
import (
    "github.com/sirupsen/logrus"
    "github.com/getsentry/sentry-go"
    sentrylogrus "github.com/getsentry/sentry-go/logrus"
)

logger := logrus.New()

// Log hook: sends logrus entries as Sentry Log entries (requires EnableLogs: true)
logHook, _ := sentrylogrus.NewLogHook(
    []logrus.Level{logrus.InfoLevel, logrus.WarnLevel},
    sentry.ClientOptions{Dsn: os.Getenv("SENTRY_DSN"), EnableLogs: true},
)
defer logHook.Flush(5 * time.Second)

// Event hook: sends logrus entries as Sentry Events (issues/errors)
eventHook, _ := sentrylogrus.NewEventHook(
    []logrus.Level{logrus.ErrorLevel, logrus.FatalLevel, logrus.PanicLevel},
    sentry.ClientOptions{Dsn: os.Getenv("SENTRY_DSN")},
)
defer eventHook.Flush(5 * time.Second)

logger.AddHook(logHook)
logger.AddHook(eventHook)

// Flush before os.Exit on logger.Fatal()
logrus.RegisterExitHandler(func() {
    logHook.Flush(5 * time.Second)
    eventHook.Flush(5 * time.Second)
})

logger.Info("service started")
logger.WithField("user", sentry.User{ID: "u1"}).Error("payment failed")
```

**Logrus level mapping:**

| Logrus level | Sentry level |
|-------------|--------------|
| Trace, Debug | `debug` |
| Info | `info` |
| Warn | `warning` |
| Error | `error` |
| Fatal, Panic | `fatal` |

**Special field names** (auto-mapped to Sentry metadata):

| Field | Type | Maps to |
|-------|------|---------|
| `"request"` | `*http.Request` | `sentry.Request` |
| `"user"` | `sentry.User` | scope user |
| `"transaction"` | `string` | event transaction ID |
| `"fingerprint"` | `[]string` | event fingerprint |

### slog (Go 1.21+)

```bash
go get github.com/getsentry/sentry-go/slog
```

```go
import (
    "context"
    "log/slog"
    "github.com/getsentry/sentry-go"
    sentryslog "github.com/getsentry/sentry-go/slog"
)

sentry.Init(sentry.ClientOptions{
    Dsn:        os.Getenv("SENTRY_DSN"),
    EnableLogs: true,
})
defer sentry.Flush(5 * time.Second)

ctx := context.Background()
handler := sentryslog.Option{
    // These levels are sent as Sentry Events (issues)
    EventLevel: []slog.Level{slog.LevelError, sentryslog.LevelFatal},
    // These levels are sent as Sentry Log entries
    LogLevel: []slog.Level{slog.LevelInfo, slog.LevelWarn, slog.LevelError},
    AddSource: true, // include file:line in events
}.NewSentryHandler(ctx)

logger := slog.New(handler)
logger.Info("server started", "port", 8080)
logger.Warn("rate limit approaching", "requests", 950)
logger.Error("database connection failed", "host", "db.example.com")
```

**slog level mapping:**

| slog.Level range | Sentry method |
|-----------------|---------------|
| `< -4` | `Trace` |
| `-4` to `-1` | `Debug` |
| `0` to `3` | `Info` |
| `4` to `7` | `Warn` |
| `8` to `11` | `Error` |
| `≥ 12` (`LevelFatal`) | `Fatal` |

`sentryslog.LevelFatal` is defined as `slog.Level(12)`.

### zerolog

```bash
go get github.com/getsentry/sentry-go/zerolog
```

> **Note:** The zerolog integration sends as **Sentry Events** (issues), not Sentry Log entries. It does not support structured logs.

```go
import (
    "github.com/rs/zerolog"
    "github.com/getsentry/sentry-go"
    sentryzerolog "github.com/getsentry/sentry-go/zerolog"
)

writer, _ := sentryzerolog.New(sentryzerolog.Config{
    ClientOptions: sentry.ClientOptions{Dsn: os.Getenv("SENTRY_DSN")},
    Options: sentryzerolog.Options{
        Levels:          []zerolog.Level{zerolog.ErrorLevel, zerolog.FatalLevel},
        WithBreadcrumbs: true,  // non-error logs become breadcrumbs
        FlushTimeout:    3 * time.Second,
    },
})
defer writer.Close()

logger := zerolog.New(writer).With().Timestamp().Logger()
logger.Info().Msg("breadcrumb only")
logger.Error().Str("user", "u1").Msg("captured as Sentry event")
```

**Special field names** (same as logrus, auto-mapped):
`"request"` → `*http.Request`, `"user"` → `sentry.User`, `"transaction"` → string, `"fingerprint"` → `[]string`

### zap (v0.43.0+)

```bash
go get github.com/getsentry/sentry-go/zap
```

```go
import (
    "context"
    "github.com/getsentry/sentry-go"
    sentryzap "github.com/getsentry/sentry-go/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "os"
)

sentry.Init(sentry.ClientOptions{
    Dsn:        os.Getenv("SENTRY_DSN"),
    EnableLogs: true,
})
defer sentry.Flush(2 * time.Second)

ctx := context.Background()
sentryCore := sentryzap.NewSentryCore(ctx, sentryzap.Option{
    Level:     []zapcore.Level{zapcore.InfoLevel, zapcore.WarnLevel, zapcore.ErrorLevel},
    AddCaller: true,
})

// Tee with console output
consoleCore := zapcore.NewCore(
    zapcore.NewConsoleEncoder(zap.NewProductionEncoderConfig()),
    zapcore.AddSync(os.Stdout),
    zapcore.DebugLevel,
)
logger := zap.New(zapcore.NewTee(consoleCore, sentryCore), zap.AddCaller())

// Attach trace context to log entries
span := sentry.StartSpan(ctx, "my-operation")
defer span.Finish()
logger.With(sentryzap.Context(span.Context())).Info("within span",
    zap.String("version", "1.0"),
    zap.Float64("cpu", 0.42),
)
```

**zap level mapping:**

| zap level | Sentry method |
|-----------|---------------|
| Debug | `Debug` |
| Info | `Info` |
| Warn | `Warn` |
| Error, DPanic | `Error` |
| Panic, Fatal | `LFatal` (zap handles the actual exit/panic) |

## Integration Comparison

| Library | Package | Sends as | `EnableLogs` required |
|---------|---------|----------|----------------------|
| Native | `sentry-go` | Sentry Logs | ✅ Yes |
| logrus (log hook) | `sentry-go/logrus` | Sentry Logs | ✅ Yes |
| logrus (event hook) | `sentry-go/logrus` | Sentry Events | ❌ No |
| slog | `sentry-go/slog` | Both (configurable) | ✅ For logs |
| zerolog | `sentry-go/zerolog` | Sentry Events + Breadcrumbs | ❌ No |
| zap | `sentry-go/zap` | Sentry Logs | ✅ Yes |

## Best Practices

- Enable both a log hook and an event hook for logrus — logs for visibility, events for alerting
- For slog, configure `EventLevel` to `[slog.LevelError, LevelFatal]` and `LogLevel` for the rest
- Call `hook.Flush()` (logrus) or `writer.Close()` (zerolog) before program exit
- Use `WithCtx(requestCtx)` on log entries inside HTTP handlers for trace correlation
- Set `sentry.LogSeverityInfo` as the minimum in `BeforeSendLog` to avoid sending noisy debug logs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Ensure `EnableLogs: true` in `ClientOptions` |
| `NewLogger` returns no-op | `EnableLogs` is false or no client is bound to the hub |
| Logrus `Fatal` not flushing | Register `logrus.RegisterExitHandler` to flush hooks before exit |
| zerolog entries not appearing | zerolog sends Events, not Logs — check the Issues section, not Logs |
| Logs missing trace context | Use `logger.Info().WithCtx(spanCtx).Emit(...)` to attach span context |
| Too many logs in Sentry | Use `BeforeSendLog` to filter by severity or attribute |
