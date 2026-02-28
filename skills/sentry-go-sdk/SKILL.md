---
name: sentry-go-sdk
description: Full Sentry SDK setup for Go. Use when asked to "add Sentry to Go", "install sentry-go", "setup Sentry in Go", or configure error monitoring, tracing, logging, metrics, or crons for Go applications. Supports net/http, Gin, Echo, Fiber, FastHTTP, Iris, and Negroni.
license: Apache-2.0
category: sdk-setup
parent: sentry-sdk-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [SDK Setup](../sentry-sdk-setup/SKILL.md) > Go SDK

# Sentry Go SDK

Opinionated wizard that scans your Go project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to Go" or "setup Sentry" in a Go app
- User wants error monitoring, tracing, logging, metrics, or crons in Go
- User mentions `sentry-go`, `github.com/getsentry/sentry-go`, or Go Sentry SDK
- User wants to monitor panics, HTTP handlers, or scheduled jobs in Go

> **Note:** SDK versions and APIs below reflect Sentry docs at time of writing (sentry-go v0.43.0).
> Always verify against [docs.sentry.io/platforms/go/](https://docs.sentry.io/platforms/go/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making any recommendations:

```bash
# Check existing Sentry dependency
grep -i sentry go.mod 2>/dev/null

# Detect web framework
grep -E "gin-gonic/gin|labstack/echo|gofiber/fiber|valyala/fasthttp|kataras/iris|urfave/negroni" go.mod 2>/dev/null

# Detect logging libraries
grep -E "sirupsen/logrus|go.uber.org/zap|rs/zerolog|log/slog" go.mod go.sum 2>/dev/null

# Detect cron / scheduler patterns
grep -E "robfig/cron|go-co-op/gocron|jasonlvhit/gocron" go.mod 2>/dev/null

# Detect OpenTelemetry usage
grep "go.opentelemetry.io" go.mod 2>/dev/null

# Check for companion frontend
ls frontend/ web/ client/ ui/ 2>/dev/null
```

**What to note:**
- Is `sentry-go` already in `go.mod`? If yes, skip to Phase 2 (configure features).
- Which framework is used? (Determines which sub-package and middleware to install.)
- Which logging library? (Enables automatic log capture.)
- Are cron/scheduler patterns present? (Triggers Crons recommendation.)
- Is there a companion frontend directory? (Triggers Phase 4 cross-link.)

---

## Phase 2: Recommend

Based on what you found, present a concrete recommendation. Don't ask open-ended questions — lead with a proposal:

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; captures panics and unhandled errors
- ✅ **Tracing** — if HTTP handlers, gRPC, or DB calls are detected
- ✅ **Logging** — if logrus, zap, zerolog, or slog is detected

**Optional (enhanced observability):**
- ⚡ **Metrics** — custom counters and gauges for business KPIs / SLOs
- ⚡ **Crons** — detect silent failures in scheduled jobs
- ⚠️ **Profiling** — removed in sentry-go v0.31.0; see `references/profiling.md` for alternatives

**Recommendation logic:**

| Feature | Recommend when... |
|---------|------------------|
| Error Monitoring | **Always** — non-negotiable baseline |
| Tracing | `net/http`, gin, echo, fiber, or gRPC imports detected |
| Logging | logrus, zap, zerolog, or `log/slog` imports detected |
| Metrics | Business events, SLO tracking, or counters needed |
| Crons | `robfig/cron`, `gocron`, or scheduled job patterns detected |
| Profiling | ⚠️ **Removed in v0.31.0** — do not recommend; see `references/profiling.md` |

Propose: *"I recommend setting up Error Monitoring + Tracing [+ Logging if applicable]. Want me to also add Metrics or Crons?"*

---

## Phase 3: Guide

### Install

```bash
# Core SDK (always required)
go get github.com/getsentry/sentry-go

# Framework sub-package — install only what matches detected framework:
go get github.com/getsentry/sentry-go/http      # net/http
go get github.com/getsentry/sentry-go/gin       # Gin
go get github.com/getsentry/sentry-go/echo      # Echo
go get github.com/getsentry/sentry-go/fiber     # Fiber
go get github.com/getsentry/sentry-go/fasthttp  # FastHTTP

# Logging sub-packages — install only what matches detected logging lib:
go get github.com/getsentry/sentry-go/logrus    # Logrus
go get github.com/getsentry/sentry-go/slog      # slog (stdlib, Go 1.21+)
go get github.com/getsentry/sentry-go/zap       # Zap
go get github.com/getsentry/sentry-go/zerolog   # Zerolog

# OpenTelemetry bridge (only if OTel is already in use):
go get github.com/getsentry/sentry-go/otel
```

### Quick Start — Recommended Init

Add to `main()` before any other code. This config enables the most features with sensible defaults:

```go
import (
    "log"
    "os"
    "time"
    "github.com/getsentry/sentry-go"
)

err := sentry.Init(sentry.ClientOptions{
    Dsn:              os.Getenv("SENTRY_DSN"),
    Environment:      os.Getenv("SENTRY_ENVIRONMENT"), // "production", "staging", etc.
    Release:          release,                          // inject via -ldflags at build time
    SendDefaultPII:   true,
    AttachStacktrace: true,

    // Tracing (adjust sample rate for production)
    EnableTracing:    true,
    TracesSampleRate: 1.0, // lower to 0.1–0.2 in high-traffic production

    // Logs
    EnableLogs: true,
})
if err != nil {
    log.Fatalf("sentry.Init: %s", err)
}
defer sentry.Flush(2 * time.Second)
```

**Injecting `Release` at build time (recommended):**
```go
var release string // set by -ldflags

// go build -ldflags="-X main.release=my-app@$(git describe --tags)"
```

### Framework Middleware

After `sentry.Init`, register the Sentry middleware for your framework:

| Framework | Import path | Middleware call | `Repanic` | `WaitForDelivery` |
|-----------|------------|----------------|-----------|-------------------|
| `net/http` | `.../sentry-go/http` | `sentryhttp.New(opts).Handle(h)` | `true` | `false` |
| Gin | `.../sentry-go/gin` | `router.Use(sentrygin.New(opts))` | `true` | `false` |
| Echo | `.../sentry-go/echo` | `e.Use(sentryecho.New(opts))` | `true` | `false` |
| Fiber | `.../sentry-go/fiber` | `app.Use(sentryfiber.New(opts))` | `false` | `true` |
| FastHTTP | `.../sentry-go/fasthttp` | `sentryfasthttp.New(opts).Handle(h)` | `false` | `true` |
| Iris | `.../sentry-go/iris` | `app.Use(sentryiris.New(opts))` | `true` | `false` |
| Negroni | `.../sentry-go/negroni` | `n.Use(sentrynegroni.New(opts))` | `true` | `false` |

> **Note:** Fiber and FastHTTP are built on `valyala/fasthttp` which has no built-in recovery. Use `Repanic: false, WaitForDelivery: true` for those.

**Hub access in handlers:**
```go
// net/http, Negroni:
hub := sentry.GetHubFromContext(r.Context())

// Gin:
hub := sentrygin.GetHubFromContext(c)

// Echo:
hub := sentryecho.GetHubFromContext(c)

// Fiber:
hub := sentryfiber.GetHubFromContext(c)
```

### For Each Agreed Feature

Walk through features one at a time. Load the reference file for each, follow its steps, and verify before moving to the next:

| Feature | Reference file | Load when... |
|---------|---------------|-------------|
| Error Monitoring | `${SKILL_ROOT}/references/error-monitoring.md` | Always (baseline) |
| Tracing | `${SKILL_ROOT}/references/tracing.md` | HTTP handlers / distributed tracing |
| Profiling | `${SKILL_ROOT}/references/profiling.md` | Performance-sensitive production apps |
| Logging | `${SKILL_ROOT}/references/logging.md` | logrus / zap / zerolog / slog detected |
| Metrics | `${SKILL_ROOT}/references/metrics.md` | Business KPIs / SLO tracking |
| Crons | `${SKILL_ROOT}/references/crons.md` | Scheduler / cron job patterns detected |

For each feature: `Read ${SKILL_ROOT}/references/<feature>.md`, follow steps exactly, verify it works.

---

## Configuration Reference

### Key `ClientOptions` Fields

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `Dsn` | `string` | `""` | SDK disabled if empty; env: `SENTRY_DSN` |
| `Environment` | `string` | `""` | e.g., `"production"`; env: `SENTRY_ENVIRONMENT` |
| `Release` | `string` | `""` | e.g., `"my-app@1.0.0"`; env: `SENTRY_RELEASE` |
| `SendDefaultPII` | `bool` | `false` | Include IP, request headers |
| `AttachStacktrace` | `bool` | `false` | Stack traces on `CaptureMessage` calls |
| `SampleRate` | `float64` | `1.0` | Error event sample rate (0.0 treated as 1.0) |
| `EnableTracing` | `bool` | `false` | Enable performance tracing |
| `TracesSampleRate` | `float64` | `0.0` | Transaction sample rate |
| `TracesSampler` | `TracesSampler` | `nil` | Custom per-transaction sampling (overrides rate) |
| `EnableLogs` | `bool` | `false` | Enable Sentry Logs feature |
| `MaxBreadcrumbs` | `int` | `100` | Max breadcrumbs per event |
| `MaxErrorDepth` | `int` | `100` | Max depth for unwrapping error chains |
| `Debug` | `bool` | `false` | Verbose SDK debug output |
| `BeforeSend` | `func` | `nil` | Hook to mutate/drop error events |
| `BeforeSendTransaction` | `func` | `nil` | Hook to mutate/drop transaction events |
| `IgnoreErrors` | `[]string` | `nil` | Regex patterns for errors to drop |
| `IgnoreTransactions` | `[]string` | `nil` | Regex patterns for transactions to drop |

### Environment Variables

| Variable | Maps to | Purpose |
|----------|---------|---------|
| `SENTRY_DSN` | `Dsn` | Data Source Name |
| `SENTRY_RELEASE` | `Release` | App version (e.g., `my-app@1.0.0`) |
| `SENTRY_ENVIRONMENT` | `Environment` | Deployment environment |
| `HTTP_PROXY` / `HTTPS_PROXY` | `HTTPProxy` / `HTTPSProxy` | Outbound proxy |

Options set in `ClientOptions` **override** environment variables.

---

## Verification

Test that Sentry is receiving events:

```go
// In a handler or test — triggers a real error event:
sentry.CaptureMessage("Sentry Go SDK test")

// Or trigger a captured panic (with recovery middleware in place):
panic("sentry test panic")
```

Check the Sentry dashboard within a few seconds. If nothing appears:
1. Set `Debug: true` in `ClientOptions` — prints SDK internals to stdout
2. Verify the DSN is correct and the project exists
3. Ensure `sentry.Flush(2 * time.Second)` is called (events are async by default)

---

## Phase 4: Cross-Link

After completing Go setup, check for a companion frontend missing Sentry coverage:

```bash
ls frontend/ web/ client/ ui/ 2>/dev/null
cat frontend/package.json web/package.json 2>/dev/null | grep -E '"react"|"svelte"|"vue"|"next"'
```

If a frontend directory exists without Sentry configured, suggest the matching skill:

| Frontend detected | Suggest skill |
|-------------------|--------------|
| React / Next.js | `sentry-react-sdk` |
| Svelte / SvelteKit | `sentry-svelte-sdk` |
| Vue | Use `@sentry/vue` — see [docs.sentry.io/platforms/javascript/guides/vue/](https://docs.sentry.io/platforms/javascript/guides/vue/) |
| Other JS/TS | `sentry-react-sdk` (covers generic browser JS patterns) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `Debug: true`, check DSN, verify `sentry.Flush()` is called |
| `sentry.Init` returns error | Malformed DSN — check format: `https://<key>@o<org>.ingest.sentry.io/<project>` |
| Panics not captured | Ensure framework middleware is registered before handlers |
| `defer sentry.Flush` not running | `os.Exit()` skips `defer` — call `sentry.Flush()` explicitly before `os.Exit()` |
| Missing stack traces | Set `AttachStacktrace: true` for `CaptureMessage`; works automatically for `CaptureException` |
| Goroutine events missing context | Clone hub before spawning goroutine: `hub := sentry.CurrentHub().Clone()` |
| Too many transactions | Lower `TracesSampleRate` or use `TracesSampler` to drop health checks / metrics endpoints |
| Fiber/FastHTTP not recovering | Use `Repanic: false, WaitForDelivery: true` for fasthttp-based frameworks |
| `SampleRate: 0.0` sending all events | `0.0` is treated as `1.0`; to drop all, set `Dsn: ""` instead |
