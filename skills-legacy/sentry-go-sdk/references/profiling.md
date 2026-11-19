# Profiling — Sentry Go SDK

> **⚠️ Profiling is not available for Go.**
>
> Profiling support was added in v0.22.0 as an alpha feature and **removed in v0.31.0** (breaking change). As of v0.43.0, `ProfilesSampleRate` does not exist in `ClientOptions` and the field will not compile.

## Current Status

The Sentry Go SDK **does not support** transaction-based or continuous profiling. The `/platforms/go/profiling/` documentation page returns 404.

```go
// ❌ This does NOT compile on v0.31.0+
sentry.Init(sentry.ClientOptions{
    EnableTracing:      true,
    TracesSampleRate:   1.0,
    ProfilesSampleRate: 1.0,  // unknown field — compile error
})
```

## Alternatives

For Go application profiling, use these standard approaches independently of Sentry:

**pprof (stdlib):**
```go
import _ "net/http/pprof"

// Exposes /debug/pprof/ on your HTTP server
http.ListenAndServe(":6060", nil)
```

**Continuous profiling services:**
- [Pyroscope](https://pyroscope.io/) — open-source continuous profiling
- [Google Cloud Profiler](https://cloud.google.com/profiler)
- [Datadog Continuous Profiler](https://docs.datadoghq.com/profiler/)

## Check for Future Support

Monitor the [sentry-go releases](https://github.com/getsentry/sentry-go/releases) and [docs.sentry.io/platforms/go/](https://docs.sentry.io/platforms/go/) for profiling to be re-introduced.
