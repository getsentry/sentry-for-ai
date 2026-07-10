# Profiling — Sentry .NET SDK

> **Alpha feature** — `Sentry.Profiling` NuGet package  
> Minimum SDK: `Sentry.Profiling` ≥ 4.0.0 · .NET 8.0+ required  
> **Not supported:** .NET Framework, Android, Blazor WASM, Native AOT (except iOS/Mac Catalyst)

---

## Overview

The Sentry .NET SDK captures CPU profiles using the .NET EventPipe sampling infrastructure (via `Microsoft.Diagnostics.NETCore.Client`). Profiles attach to **transactions** — they are not standalone events.

| Platform | Mechanism | Package required |
|---|---|---|
| .NET 8+ on Windows | EventPipe CPU sampling | `Sentry.Profiling` |
| .NET 8+ on Linux | EventPipe CPU sampling | `Sentry.Profiling` ⚠️ see Linux note |
| .NET 8+ on macOS | EventPipe CPU sampling | `Sentry.Profiling` |
| iOS / Mac Catalyst | Native profiler (via Cocoa binding) | **None** (do not install `Sentry.Profiling`) |
| .NET Framework | ❌ Not supported | — |
| Android | ❌ Not supported | — |
| Blazor WebAssembly | ❌ Not supported | — |
| Native AOT (non-iOS) | ❌ Not supported | — |

---

## How Profiling Attaches to Traces

Profiles are always tied to a transaction — you must have tracing enabled first:

```
TracesSampleRate × ProfilesSampleRate = net profiling rate

Example:
  TracesSampleRate   = 0.5  →  50% of requests create transactions
  ProfilesSampleRate = 0.4  →  40% of those transactions get profiled
  Net profiling rate        =  20% of all requests
```

When a transaction starts:
1. `ProfilingIntegration` checks whether this transaction should be profiled (per `ProfilesSampleRate`)
2. If yes, an EventPipe session starts collecting CPU samples
3. When `transaction.Finish()` is called, the profiler stops and attaches the profile data to the transaction envelope
4. Both the transaction and the profile are sent to Sentry together — you can drill from a slow span directly into a flame graph

> **One profiler at a time:** Only one profile can be active per process. Nested transactions will not each receive their own profile.

---

## Installation

```bash
dotnet add package Sentry.Profiling
```

> **Do NOT install `Sentry.Profiling` for iOS or Mac Catalyst.** Those platforms use the bundled native profiler (via the Cocoa binding) — installing this package on those targets has no effect.
>
> **Do NOT install `Sentry.Profiling` for Android or Blazor WebAssembly** either — profiling is not supported on those platforms, so the package has no effect.

---

## Basic Setup

Profiling requires three additions to your `SentrySdk.Init` call:

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";

    // Step 1: Enable tracing (REQUIRED — profiling won't work without it)
    options.TracesSampleRate = 1.0;

    // Step 2: Set what fraction of sampled transactions get profiled
    options.ProfilesSampleRate = 1.0;  // 1.0 = 100% for development; lower in production

    // Step 3: Register the profiling integration
    options.AddProfilingIntegration();
});
```

### ASP.NET Core

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSentry(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.TracesSampleRate = 1.0;
    options.ProfilesSampleRate = 0.1;   // Profile 10% of sampled transactions in production
    options.AddProfilingIntegration();
});

var app = builder.Build();
app.MapControllers();
app.Run();
```

---

## Synchronous Startup (Recommended for Most Apps)

`AddProfilingIntegration()` initializes the EventPipe session asynchronously on a background thread. Transactions that start immediately after `SentrySdk.Init()` may not get a profile because the profiler isn't ready yet.

```csharp
// ❌ Problem: profiler may not be ready when first transaction starts
SentrySdk.Init(options => {
    options.AddProfilingIntegration();  // async startup
});
var tx = SentrySdk.StartTransaction("startup", "init");  // profiler might miss this
```

```csharp
// ✅ Fix: provide a timeout to block until profiler is ready
SentrySdk.Init(options => {
    options.AddProfilingIntegration(TimeSpan.FromMilliseconds(500));
});
var tx = SentrySdk.StartTransaction("startup", "init");  // profiler guaranteed ready
```

> **iOS/Mac Catalyst note:** The native profiler always starts synchronously. The `TimeSpan` parameter is accepted but has no effect on those platforms.

---

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `TracesSampleRate` | `double?` | `null` | **Required.** Fraction of requests that create transactions (0.0–1.0). Profiling does nothing without this. |
| `TracesSampler` | `Func<TransactionSamplingContext, double?>` | `null` | Alternative to `TracesSampleRate` for dynamic per-request sampling. Takes precedence when set. |
| `ProfilesSampleRate` | `double?` | `null` | Fraction of sampled transactions that get profiled (0.0–1.0). Null = profiling disabled. |
| `AddProfilingIntegration()` | — | — | Registers `SamplingTransactionProfilerFactory`. **Required.** |
| `AddProfilingIntegration(TimeSpan)` | `TimeSpan` | — | Same as above, but blocks synchronously until the EventPipe session starts (or timeout). Recommended for most apps. |

### Recommended Production Settings

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "...";

    // Sample 20% of transactions
    options.TracesSampleRate = 0.2;

    // Profile 50% of those — net 10% of all requests get profiled
    options.ProfilesSampleRate = 0.5;

    // Block up to 500ms so early-startup transactions are captured
    options.AddProfilingIntegration(TimeSpan.FromMilliseconds(500));
});
```

---

## Platform-Specific Notes

### Linux

Supported on .NET 8+. Because profiling is in Alpha and depends on the EventPipe tracing stack, initialization can fail in some minimal/trimmed Linux container images. If you deploy to containers, guard `AddProfilingIntegration()` so a profiler-init failure can't take down startup, and test on your specific image before enabling in production:

```csharp
try
{
    options.AddProfilingIntegration();
}
catch (Exception ex)
{
    Console.Error.WriteLine($"[Sentry] Profiling unavailable on this platform: {ex.Message}");
}
```

### iOS / Mac Catalyst

On iOS/Mac Catalyst, profiling is provided by the bundled native profiler (via the Cocoa binding) — do **not** install `Sentry.Profiling`.

```csharp
// iOS: same configuration, but do NOT install Sentry.Profiling
SentrySdk.Init(options =>
{
    options.Dsn = "...";
    options.TracesSampleRate = 1.0;
    options.ProfilesSampleRate = 1.0;
    options.AddProfilingIntegration();  // delegates to native profiler on iOS/Mac Catalyst
});
```

### Windows

Fully supported on .NET 8+. No extra steps required.

---

## Limitations and Known Issues

| Limitation | Details |
|---|---|
| **Alpha status** | The profiling feature is officially in Alpha. APIs may change and it is not recommended for mission-critical production use without testing. |
| **One profile at a time** | Only one transaction profiler can be active per process. If two transactions run concurrently, only the first one gets a profile. |
| **30-second cap** | Profiles are hard-capped at 30 seconds. Transactions longer than 30 seconds have their profile truncated. |
| **.NET 8+ only** | The `Sentry.Profiling` package targets .NET 8/9/10. .NET 6/7 and .NET Framework are not supported. |
| **Container init failures** | On minimal/trimmed Linux container images, profiler initialization can fail. Guard `AddProfilingIntegration()` in a try/catch and test on your image. |
| **OTel conflict** | When using `UseOpenTelemetry()` + `AddProfilingIntegration()`, profiles may not surface all application frames. Verify on your SDK version; try disabling one integration to isolate. |
| **"Unknown frames"** | Some stack frames appear as "unknown" in the Sentry UI. This is expected — they are anonymous JIT helper methods in System assemblies that can't be resolved to named methods. |
| **No Android / WASM** | Android and Blazor WebAssembly are not supported. |

---

## Complete Setup Example

```csharp
// Program.cs — ASP.NET Core with tracing + profiling

using Sentry;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSentry(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.Environment = builder.Environment.EnvironmentName;
    options.Release = "my-app@1.2.3";

    // Tracing: sample 10% of requests in production
    options.TracesSampleRate = builder.Environment.IsProduction() ? 0.1 : 1.0;

    // Profiling: profile 50% of sampled transactions
    // Net result: 5% of all production requests are profiled
    options.ProfilesSampleRate = 0.5;

    // Block up to 500ms so early-startup transactions aren't missed
    options.AddProfilingIntegration(TimeSpan.FromMilliseconds(500));
});

var app = builder.Build();
app.MapControllers();
app.Run();
```

### Console / Worker Service

```csharp
using Sentry;

SentrySdk.Init(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.TracesSampleRate = 1.0;
    options.ProfilesSampleRate = 1.0;
    options.AddProfilingIntegration(TimeSpan.FromMilliseconds(500));
});

// The profiler is ready — this transaction will be profiled
var transaction = SentrySdk.StartTransaction("data-import", "task");
SentrySdk.ConfigureScope(s => s.Transaction = transaction);

// ... your work here ...

transaction.Finish(SpanStatus.Ok);
// Profile is bundled with the transaction and sent to Sentry
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| No profiles appearing in Sentry | Verify `ProfilesSampleRate > 0` AND `TracesSampleRate > 0`. Both must be set. Check that `AddProfilingIntegration()` is called. |
| Early-startup transactions not profiled | Use `AddProfilingIntegration(TimeSpan.FromMilliseconds(500))` to block until the EventPipe session is ready before the first transaction starts. |
| Profiler init throws on startup (Linux containers) | Wrap `AddProfilingIntegration()` in try/catch and test on your specific container image. Consider disabling profiling there until confirmed working. |
| Profiles missing application frames when using OTel | Profiling with `UseOpenTelemetry()` may not surface all frames. Verify on your SDK version; try disabling one integration to isolate. |
| Concurrent transactions — second one not profiled | Expected behavior. Only one profiler runs at a time. The first concurrent transaction wins the profiler slot. |
| Profile truncated after 30 seconds | Hard cap in the SDK. Split long-running operations into multiple shorter transactions if full profiling coverage is needed. |
| `.NET 6` or `.NET 7` — profiling not working | Not supported. EventPipe profiling requires .NET 8+. |
| "Unknown frames" in flame graph | Expected for JIT internals. Focus on named application frames. |
| iOS profiles not appearing (using `Sentry.Profiling` package) | Remove `Sentry.Profiling` from iOS targets. iOS/Mac Catalyst use the bundled native profiler (via the Cocoa binding) — the NuGet package is not needed and may conflict. |
