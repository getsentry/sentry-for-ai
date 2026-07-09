# Logging — Sentry .NET SDK

> **Minimum SDK: `Sentry` ≥ 5.14.0** for native `SentrySdk.Logger` + `EnableLogs`  
> Integration packages (`Sentry.Extensions.Logging`, `Sentry.Serilog`, `Sentry.NLog`, `Sentry.Log4Net`) available since SDK ≥ 4.x  
> Native structured logs forwarded through integration packages: requires SDK ≥ 6.1.0

---

## Enabling Native Structured Logs

`EnableLogs` must be set to `true` — logging is **disabled by default**:

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
    options.EnableLogs = true; // Required — logs are silently no-ops without this
});
```

Without `EnableLogs = true`, all `SentrySdk.Logger.*` calls are silently discarded.

---

## Native Logger API — Six Levels

The native logger type is `SentryStructuredLogger`, accessed via `SentrySdk.Logger`:

```csharp
SentrySdk.Logger.LogTrace("Entering method Foo");
SentrySdk.Logger.LogDebug("Loaded {0} items", itemCount);
SentrySdk.Logger.LogInfo("Order created successfully");
SentrySdk.Logger.LogWarning("Cache miss for key {0}", cacheKey);
SentrySdk.Logger.LogError("A {0} error occurred", "critical");
SentrySdk.Logger.LogFatal("Unrecoverable error — shutting down");
```

| Level | Method | Typical Use |
|-------|--------|-------------|
| `Trace` | `LogTrace()` | Ultra-granular method entry/exit; high-volume — filter in production |
| `Debug` | `LogDebug()` | Development diagnostics, cache hits/misses |
| `Info` | `LogInfo()` | Normal business milestones, confirmations |
| `Warning` | `LogWarning()` | Degraded state, approaching limits, recoverable issues |
| `Error` | `LogError()` | Failures requiring attention |
| `Fatal` | `LogFatal()` | Critical failures, system unavailable |

### Attaching Custom Attributes

Use the lambda overload to attach typed key-value attributes to a log entry:

```csharp
SentrySdk.Logger.LogWarning(static log =>
{
    log.SetAttribute("request.id", 12345);
    log.SetAttribute("user.tier", "premium");
    log.SetAttribute("is.retried", true);
}, "Payment declined for order {0}", orderId);
```

### Supported Attribute Value Types

| Category | Types |
|----------|-------|
| Textual | `string`, `char` |
| Logical | `bool` |
| Integral | `sbyte`, `byte`, `short`, `ushort`, `int`, `uint`, `long`, `nint` |
| Floating-point | `float`, `double` |
| Other | Any type via `ToString()` fallback |

---

## Log Filtering — `SetBeforeSendLog`

Use `SetBeforeSendLog` to modify or drop logs before transmission. Return `null` to discard:

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "https://...@sentry.io/...";
    options.EnableLogs = true;

    options.SetBeforeSendLog(static log =>
    {
        // Drop all Info and Trace logs in production
        if (log.Level is SentryLogLevel.Info or SentryLogLevel.Trace)
            return null;

        // Drop noisy health-check messages
        if (log.Message?.Contains("/health") == true)
            return null;

        // Enrich surviving logs
        log.SetAttribute("app.version", "2.1.0");

        return log;
    });
});
```

### The `SentryLog` Object

| Member | Type | Description |
|--------|------|-------------|
| `Timestamp` | `DateTimeOffset` | When the log was created |
| `TraceId` | `SentryId` | Active trace ID — links log to a trace |
| `SpanId` | `SpanId?` | Active span ID — links log to a span |
| `Level` | `SentryLogLevel` | Trace, Debug, Info, Warning, Error, Fatal |
| `Message` | `string` | Formatted log message |
| `Template` | `string?` | Original message template (if structured) |
| `Parameters` | `ImmutableArray` | Template parameters |
| `TryGetAttribute()` | method | Read an attribute |
| `SetAttribute()` | method | Write/modify an attribute |

---

## Automatically Attached Attributes

These are added by the SDK to every log without any configuration:

| Attribute Key | Source |
|---------------|--------|
| `environment` | SDK config |
| `release` | SDK config |
| `sdk.name`, `sdk.version` | SDK internals |
| `message.template` | Message template |
| `message.parameter.0`, `.1`, … | Template parameters |
| `server.address` | Host info |
| `user.id`, `user.name`, `user.email` | Active scope user (requires `SendDefaultPii = true`) |
| `origin` | Integration that created the log |
| `sentry.trace.parent_span_id` | When inside an active span (enables log ↔ trace correlation) |

---

## Integration: Microsoft.Extensions.Logging (ILogger)

### Install

```shell
dotnet add package Sentry.Extensions.Logging
```

### What it does

The MEL integration provides **three capabilities** simultaneously:
1. Stores log messages as **breadcrumbs** (attached to the next error event as context)
2. Sends logs at or above the event threshold as **Sentry error events**
3. Forwards logs as **native Sentry structured logs** (SDK ≥ 6.1.0)

### ASP.NET Core / Generic Host Setup (Recommended)

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSentry(o =>
{
    o.Dsn = "https://...@sentry.io/...";
    o.MinimumBreadcrumbLevel = LogLevel.Debug;   // default: Information
    o.MinimumEventLevel = LogLevel.Error;         // default: Error
    o.InitializeSdk = true;                       // set false if using SentrySdk.Init elsewhere
});
```

Or configure via `appsettings.json`:

```json
{
  "Sentry": {
    "Dsn": "https://...@sentry.io/...",
    "MinimumBreadcrumbLevel": "Information",
    "MinimumEventLevel": "Error",
    "SendDefaultPii": true,
    "MaxBreadcrumbs": 100
  }
}
```

```csharp
builder.Logging.AddSentry(); // reads Sentry section from appsettings.json
```

### Direct Setup (no DI)

```csharp
var loggerFactory = LoggerFactory.Create(logging =>
{
    logging.AddSentry(o => o.Dsn = "https://...@sentry.io/...");
});
ILogger logger = loggerFactory.CreateLogger<MyClass>();
```

### Usage

Once configured, use standard `ILogger<T>` — no Sentry-specific code required:

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger) => _logger = logger;

    public async Task ProcessOrderAsync(int orderId)
    {
        _logger.LogInformation("Processing order {OrderId}", orderId); // → breadcrumb

        try
        {
            await _paymentService.ChargeAsync(orderId);
            _logger.LogInformation("Order {OrderId} paid successfully", orderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process order {OrderId}", orderId); // → Sentry event
            throw;
        }
    }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `MinimumBreadcrumbLevel` | `LogLevel` | `Information` | Threshold for breadcrumb storage |
| `MinimumEventLevel` | `LogLevel` | `Error` | Threshold for sending Sentry error events |
| `InitializeSdk` | `bool` | `true` | Auto-init SDK. Set `false` when using `SentrySdk.Init` |
| `Filters` | `ICollection<ILogEntryFilter>` | — | Custom pre-processing filters |
| `TagFilters` | `ICollection<string>` | — | Prefix-based tag exclusions |

### Important Behavior Notes

- **Breadcrumb cascade**: A `LogError` event includes ALL breadcrumbs accumulated since the last event — so the full Info/Warning/Error history is attached.
- **Self-filtering**: Messages from assemblies starting with `"Sentry"` are excluded to prevent infinite loops.
- **Single init**: Set `InitializeSdk = false` if calling `SentrySdk.Init()` elsewhere in your startup.
- **Empty DSN** disables the SDK entirely.

---

## Integration: Serilog

### Install

```shell
dotnet add package Sentry.Serilog
```

### What it does

Same three capabilities as MEL: breadcrumbs, Sentry error events, and native structured logs.

### Basic Setup (Serilog initializes Sentry)

```csharp
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Sentry(o =>
    {
        o.Dsn = "https://...@sentry.io/...";
        o.MinimumBreadcrumbLevel = LogEventLevel.Debug;   // default: Information
        o.MinimumEventLevel = LogEventLevel.Warning;      // default: Error
    })
    .WriteTo.Console()
    .CreateLogger();
```

### Setup (Sentry initialized separately)

```csharp
SentrySdk.Init(o => o.Dsn = "...");

Log.Logger = new LoggerConfiguration()
    .WriteTo.Sentry(o =>
    {
        o.InitializeSdk = false; // ← avoid double-init
        o.MinimumBreadcrumbLevel = LogEventLevel.Information;
        o.MinimumEventLevel = LogEventLevel.Error;
    })
    .CreateLogger();
```

### ASP.NET Core with Serilog

```csharp
builder.Host.UseSerilog((ctx, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .WriteTo.Sentry(o =>
       {
           o.Dsn = ctx.Configuration["Sentry:Dsn"];
           o.MinimumBreadcrumbLevel = LogEventLevel.Debug;
           o.MinimumEventLevel = LogEventLevel.Error;
       });
});
```

### Usage

```csharp
var log = Log.ForContext<OrderService>();

log.Information("Processing order {OrderId} for {CustomerId}", orderId, customerId); // → breadcrumb
log.Error(ex, "Payment failed for order {OrderId}", orderId); // → Sentry event
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `MinimumBreadcrumbLevel` | `Information` | Minimum `LogEventLevel` for breadcrumbs |
| `MinimumEventLevel` | `Error` | Minimum level for Sentry error events |
| `InitializeSdk` | `true` | Whether this sink initializes the SDK |

---

## Integration: NLog

### Install

```shell
dotnet add package Sentry.NLog
```

### Code-Based Configuration

```csharp
LogManager.Configuration = new LoggingConfiguration();

LogManager.Configuration.AddSentry(options =>
{
    options.Dsn = "https://...@sentry.io/...";
    options.Layout = "${message}";
    options.BreadcrumbLayout = "${logger}: ${message}";
    options.MinimumBreadcrumbLevel = LogLevel.Debug;  // default: Info
    options.MinimumEventLevel = LogLevel.Error;        // default: Error
    options.AddTag("logger", "${logger}");
    options.IgnoreEventsWithNoException = false;
    options.SendEventPropertiesAsData = true;
    options.SendEventPropertiesAsTags = false;
});

LogManager.ReconfigExistingLoggers();
```

### XML Configuration (nlog.config)

```xml
<?xml version="1.0" encoding="utf-8" ?>
<nlog xmlns="http://www.nlog-project.org/schemas/NLog.xsd"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <extensions>
    <add assembly="Sentry.NLog"/>
  </extensions>

  <targets>
    <target xsi:type="Sentry"
            name="sentry"
            dsn="https://...@sentry.io/..."
            minimumBreadcrumbLevel="Debug"
            minimumEventLevel="Error"
            layout="${message}"
            breadcrumbLayout="${logger}: ${message}"
            sendEventPropertiesAsData="true"
            ignoreEventsWithNoException="false">
      <tag name="logger" layout="${logger}"/>
    </target>
  </targets>

  <rules>
    <!-- Set minlevel LOWER than breadcrumbLevel so SentryTarget sees all entries -->
    <logger name="*" minlevel="Debug" writeTo="sentry"/>
  </rules>
</nlog>
```

### Usage

```csharp
private static readonly Logger Logger = LogManager.GetCurrentClassLogger();

public void ProcessOrder(int orderId)
{
    Logger.Info("Processing order {orderId}", orderId); // → breadcrumb

    try { /* ... */ }
    catch (Exception ex)
    {
        Logger.Error(ex, "Failed to process order {orderId}", orderId); // → Sentry event
    }
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `MinimumBreadcrumbLevel` | `Info` | Threshold for breadcrumb storage |
| `MinimumEventLevel` | `Error` | Threshold for Sentry error events |
| `InitializeSdk` | `true` | Auto-init SDK when DSN provided |
| `IgnoreEventsWithNoException` | `false` | Skip entries with no attached exception |
| `SendEventPropertiesAsData` | `true` | Forward NLog properties as Sentry event data |
| `SendEventPropertiesAsTags` | `false` | Forward NLog properties as Sentry tags |
| `IncludeEventDataOnBreadcrumbs` | `false` | Attach event property data to breadcrumbs |
| `BreadcrumbLayout` | — | NLog layout string for breadcrumb text |
| `Layout` | — | NLog layout string for event message |
| `Tags` | — | Additional static tags attached to all messages |

### ⚠️ Critical NLog Detail

The `SentryTarget` must receive **all** log entries to correctly classify them as breadcrumbs vs events. Configure NLog's `minlevel` **lower** than `MinimumBreadcrumbLevel`:

```xml
<!-- If MinimumBreadcrumbLevel = Info, set minlevel = Debug or Trace -->
<logger name="*" minlevel="Debug" writeTo="sentry"/>
```

---

## Integration: log4net

### Install

```shell
dotnet add package Sentry.Log4Net
```

### XML Configuration (`app.config` / `web.config`)

```xml
<configuration>
  <configSections>
    <section name="log4net"
             type="log4net.Config.Log4NetConfigurationSectionHandler, log4net"/>
  </configSections>

  <log4net>
    <appender name="SentryAppender" type="Sentry.Log4Net.SentryAppender, Sentry.Log4Net">
      <Dsn value="https://...@sentry.io/..."/>
      <SendIdentity value="true"/>  <!-- send log4net Identity as Sentry user.id -->
      <threshold value="INFO"/>     <!-- minimum level for this appender -->
    </appender>

    <root>
      <level value="DEBUG"/>
      <appender-ref ref="SentryAppender"/>
    </root>
  </log4net>
</configuration>
```

### Programmatic Setup (for full SDK control)

The XML appender supports only a subset of Sentry options. For full control, init the SDK separately and omit the `Dsn` element to skip auto-init:

```csharp
// Startup code
SentrySdk.Init(options =>
{
    options.Dsn = "https://...@sentry.io/...";
    options.Release = "my-app@1.0.0";
    options.TracesSampleRate = 0.1;
});
```

```xml
<!-- In app.config — no <Dsn> element means SDK won't be re-initialized -->
<appender name="SentryAppender" type="Sentry.Log4Net.SentryAppender, Sentry.Log4Net">
  <SendIdentity value="true"/>
  <threshold value="INFO"/>
</appender>
```

### Usage

```csharp
private static readonly ILog Logger = LogManager.GetLogger(typeof(MyClass));

Logger.Info("Processing started");       // → breadcrumb
Logger.Warn("Low disk space warning");   // → breadcrumb
Logger.Error("DB connection failed");    // → Sentry event
Logger.Fatal("Application crash", ex);  // → Sentry event
```

### Key Appender Options

| Option | Description |
|--------|-------------|
| `Dsn` | Auto-initializes SDK when provided |
| `SendIdentity` | Reports log4net `Identity` as `user.id` |
| `threshold` | Minimum log4net level for this appender |

---

## Log-to-Trace Correlation

Every log entry from any integration automatically carries the active trace and span IDs:

| Field | Description |
|-------|-------------|
| `TraceId` | Links the log to an active distributed trace |
| `SpanId` | Links the log to the currently active span |

In the Sentry UI you can navigate from an error or trace directly to the logs that occurred during that trace, and vice versa. No extra configuration required — correlation is automatic when `TracesSampleRate > 0`.

---

## Log Level Mapping

| Sentry Level | MEL (`ILogger`) | Serilog | NLog | log4net |
|--------------|-----------------|---------|------|---------|
| `Trace` | `Trace` | `Verbose` | `Trace` | — |
| `Debug` | `Debug` | `Debug` | `Debug` | `DEBUG` |
| `Info` | `Information` | `Information` | `Info` | `INFO` |
| `Warning` | `Warning` | `Warning` | `Warn` | `WARN` |
| `Error` | `Error` | `Error` | `Error` | `ERROR` |
| `Fatal` | `Critical` | `Fatal` | `Fatal` | `FATAL` |

---

## SDK Version Matrix

| Feature | Min SDK Version |
|---------|----------------|
| Native `SentrySdk.Logger` + `EnableLogs` | **5.14.0** |
| `Sentry.Extensions.Logging` | **4.x** |
| `Sentry.Serilog` | **4.x** |
| `Sentry.NLog` | **4.x** |
| `Sentry.Log4Net` | **4.x** |
| Native logs forwarded via integration packages | **6.1.0** |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Native logs not appearing in Sentry | Verify `EnableLogs = true` in `SentrySdk.Init()` — without it, all `SentrySdk.Logger.*` calls are silently discarded |
| MEL/Serilog/NLog logs not triggering Sentry events | Check `MinimumEventLevel` — only logs at or above this threshold are sent as events; lower it if needed |
| NLog: only Error/Fatal seen, no breadcrumbs | NLog `<logger minlevel>` must be set **lower** than `MinimumBreadcrumbLevel` so the SentryTarget receives all entries |
| SDK initialized twice (double events) | Set `InitializeSdk = false` in the logging integration when you also call `SentrySdk.Init()` in startup |
| Logs not linked to traces | Ensure `TracesSampleRate > 0` and the log is emitted inside an active span |
| Sensitive data appearing in logs | Add filtering in `SetBeforeSendLog`; better yet, avoid logging sensitive values at the call site |
| `SetBeforeSendLog` not firing | Confirm `EnableLogs = true` — without it, no logs are processed and the hook never runs |
| log4net: SDK not receiving Identity as user.id | Set `<SendIdentity value="true"/>` in the appender config |
| High log volume / rate limits | Use `SetBeforeSendLog` to drop `Trace` and `Debug` levels in production |
