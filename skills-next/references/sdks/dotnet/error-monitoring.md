# Error Monitoring — Sentry .NET SDK

> Minimum SDK: `Sentry` ≥ 4.0.0 (NuGet)  
> ASP.NET Core integration: `Sentry.AspNetCore` ≥ 4.0.0  
> MAUI integration: `Sentry.Maui` ≥ 4.0.0  
> User feedback API: `Sentry` ≥ 4.0.0 (`CaptureFeedback`)

---

## Automatic vs Manual Error Capture

### What Is Captured Automatically

| Error Type | Captured? | Mechanism |
|-----------|-----------|-----------|
| Unhandled exceptions (all platforms) | ✅ Yes | `AppDomain.CurrentDomain.UnhandledException` |
| Unobserved Task exceptions | ✅ Yes | `TaskScheduler.UnobservedTaskException` |
| ASP.NET Core request errors | ✅ Yes | Sentry middleware |
| WPF Dispatcher unhandled exceptions | ✅ Yes | `Application.DispatcherUnhandledException` (with hook) |
| MAUI unhandled exceptions | ✅ Yes | Platform-specific native integrations |
| WinForms exceptions | ✅ Yes | Requires `SetUnhandledExceptionMode(ThrowException)` |
| Caught + swallowed `try/catch` | ❌ No | Must call `SentrySdk.CaptureException()` manually |
| Graceful error returns | ❌ No | Must call `SentrySdk.CaptureException()` manually |

### The Core Rule

> **"If you catch an exception and don't re-throw it, Sentry never sees it."**

```csharp
// ✅ Automatically captured — unhandled, bubbles up
throw new Exception("Unhandled");

// ✅ Automatically captured — re-thrown
try
{
    await DoSomethingAsync();
}
catch (Exception ex)
{
    throw; // re-throw preserves stack trace
}

// ❌ NOT captured — swallowed by graceful return
try
{
    await DoSomethingAsync();
}
catch (Exception ex)
{
    return Result.Failure("Operation failed"); // ← Sentry never sees this
}

// ✅ Manually captured
try
{
    await DoSomethingAsync();
}
catch (Exception ex)
{
    SentrySdk.CaptureException(ex);
    return Result.Failure("Operation failed");
}
```

---

## Core Capture API

### `SentrySdk.CaptureException`

```csharp
// Basic — capture a caught exception
SentryId id = SentrySdk.CaptureException(exception);

// With inline scope enrichment — changes are isolated to this ONE event
SentryId id = SentrySdk.CaptureException(exception, scope =>
{
    scope.SetTag("order.id", orderId.ToString());
    scope.Level = SentryLevel.Fatal;
    scope.User = new SentryUser { Id = userId };
});
```

> **Key behavior:** The SDK clones the current scope before invoking the callback. Changes inside the callback apply only to that one event and do not affect subsequent events.

### `SentrySdk.CaptureMessage`

```csharp
// Default level is Info
SentrySdk.CaptureMessage("Something notable happened");

// With explicit severity
SentrySdk.CaptureMessage("Disk space critically low", SentryLevel.Warning);

// With scope enrichment
SentrySdk.CaptureMessage("Payment gateway timeout", scope =>
{
    scope.SetTag("gateway", "stripe");
    scope.Level = SentryLevel.Error;
}, SentryLevel.Error);
```

**SentryLevel values:**
```csharp
SentryLevel.Debug
SentryLevel.Info      // default for CaptureMessage
SentryLevel.Warning
SentryLevel.Error
SentryLevel.Fatal
```

### `SentrySdk.CaptureEvent`

For full manual control over every field on the event:

```csharp
var evt = new SentryEvent
{
    Message = new SentryMessage { Message = "Custom structured event" },
    Level = SentryLevel.Error
};
evt.SetTag("custom-tag", "value");
evt.Fingerprint = new[] { "custom-fingerprint" };
SentrySdk.CaptureEvent(evt);

// Construct from a caught exception
try { ... }
catch (Exception ex)
{
    var evt = new SentryEvent(ex)
    {
        Level = SentryLevel.Fatal
    };
    SentrySdk.CaptureEvent(evt);
}
```

### All capture signatures

```csharp
// CaptureException
SentryId SentrySdk.CaptureException(Exception exception)
SentryId SentrySdk.CaptureException(Exception exception, Action<Scope> configureScope)

// CaptureMessage
SentryId SentrySdk.CaptureMessage(string message, SentryLevel level = SentryLevel.Info)
SentryId SentrySdk.CaptureMessage(string message, Action<Scope> configureScope,
    SentryLevel level = SentryLevel.Info)

// CaptureEvent
SentryId SentrySdk.CaptureEvent(SentryEvent evt, Scope? scope = null, SentryHint? hint = null)
SentryId SentrySdk.CaptureEvent(SentryEvent evt, Action<Scope> configureScope)
SentryId SentrySdk.CaptureEvent(SentryEvent evt, SentryHint? hint, Action<Scope> configureScope)

// Flush
void  SentrySdk.Flush()
void  SentrySdk.Flush(TimeSpan timeout)
Task  SentrySdk.FlushAsync(TimeSpan timeout)

// Utility
bool      SentrySdk.IsEnabled
SentryId  SentrySdk.LastEventId
```

---

## ASP.NET Core — Automatic & Manual Error Capture

### Installation

```shell
dotnet add package Sentry.AspNetCore
```

### Initialization in `Program.cs`

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseSentry(options =>
{
    options.Dsn = "https://...@sentry.io/...";
    options.SendDefaultPii = true;              // Include user IP, headers, auth
    options.MaxRequestBodySize = RequestSize.Always;
    options.TracesSampleRate = 1.0;
    options.Debug = true;
});

var app = builder.Build();
app.Run();
```

### Via `appsettings.json` (no code required)

```json
{
  "Sentry": {
    "Dsn": "https://...@sentry.io/...",
    "SendDefaultPii": true,
    "MaxRequestBodySize": "Always",
    "MinimumBreadcrumbLevel": "Debug",
    "MinimumEventLevel": "Warning",
    "AttachStacktrace": true,
    "Debug": true,
    "TracesSampleRate": 1.0
  }
}
```

### Via environment variables (double-underscore convention)

```shell
Sentry__Dsn=https://...@sentry.io/...
Sentry__Debug=true
Sentry__TracesSampleRate=0.5
Sentry__SendDefaultPii=true
```

### What ASP.NET Core captures automatically

- All unhandled exceptions thrown from controllers and middleware → captured as Sentry events
- HTTP request data (URL, method, headers, body if configured)
- User info from `IHttpContext` when `SendDefaultPii = true`
- Breadcrumbs from `Microsoft.Extensions.Logging`
- Performance transactions for each HTTP request (when `TracesSampleRate > 0`)

### Manual capture in a controller

```csharp
[ApiController]
[Route("[controller]")]
public class OrderController : ControllerBase
{
    [HttpPost]
    public IActionResult CreateOrder(OrderRequest request)
    {
        try
        {
            _orderService.Create(request);
            return Ok();
        }
        catch (PaymentDeclinedException ex)
        {
            SentrySdk.CaptureException(ex, scope =>
            {
                scope.SetTag("payment.gateway", request.PaymentGateway);
                scope.SetExtra("order_amount", request.Amount);
            });
            return StatusCode(402, "Payment declined");
        }
    }
}
```

### Custom user factory (DI)

```csharp
public class MyUserFactory : ISentryUserFactory
{
    private readonly IHttpContextAccessor _accessor;

    public MyUserFactory(IHttpContextAccessor accessor)
        => _accessor = accessor;

    public SentryUser? Create()
    {
        var user = _accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true) return null;

        return new SentryUser
        {
            Id       = user.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            Email    = user.FindFirst(ClaimTypes.Email)?.Value,
            Username = user.Identity.Name
        };
    }
}

// Register in DI
services.AddSingleton<ISentryUserFactory, MyUserFactory>();
```

### ASP.NET Core-specific options

| Option | Type | Description |
|--------|------|-------------|
| `SendDefaultPii` | `bool` | Include request URL, headers, user IP, auth info |
| `MaxRequestBodySize` | `RequestSize` | `None`, `Small` (<4 KB), `Medium` (<10 KB), `Always` |
| `MinimumBreadcrumbLevel` | `LogLevel` | Min log level for breadcrumb capture from ILogger |
| `MinimumEventLevel` | `LogLevel` | Min log level to generate a Sentry error event from ILogger |
| `CaptureBlockingCalls` | `bool` | Detect `Task.Wait()` / `.Result` threadpool starvation |

---

## Scope Management

### How Scopes Work in .NET

The **Hub** holds a stack of scopes. When an event is captured the hub merges the topmost scope's data into the event. Scope storage mode is controlled by `IsGlobalModeEnabled`:

| `IsGlobalModeEnabled` | Storage | Use For |
|---|---|---|
| `false` (default) | `AsyncLocal<T>` | Server apps — per-request isolation |
| `true` | Singleton | Desktop apps — shared scope across threads |

### `ConfigureScope` — Persistent Changes

Modifies the current ambient scope permanently (until changed or scope is popped). Use for session-level data:

```csharp
SentrySdk.ConfigureScope(scope =>
{
    scope.SetTag("tenant.id", tenantId);
    scope.User = new SentryUser
    {
        Id    = user.Id.ToString(),
        Email = user.Email
    };
    scope.Level = SentryLevel.Warning;
    scope.TransactionName = "UserCheckout";
});

// Async variant
await SentrySdk.ConfigureScopeAsync(async scope =>
{
    var user = await _context.Users.FindAsync(userId);
    scope.User = new SentryUser { Id = user.Id.ToString(), Email = user.Email };
});

// Allocation-free overload (avoids closure)
SentrySdk.ConfigureScope(
    static (scope, tenantId) => scope.SetTag("tenant.id", tenantId),
    currentTenantId);
```

### `PushScope` — Temporary Isolated Scope

Inherits parent scope data. All changes inside the `using` block are discarded when disposed:

```csharp
using (SentrySdk.PushScope())
{
    SentrySdk.ConfigureScope(scope =>
    {
        scope.SetTag("operation", "bulk-import");
        scope.User = new SentryUser { Id = userId };
    });

    SentrySdk.CaptureException(new Exception("Scoped error"));
} // scope is popped here — tags/user cleared
```

### Inline scope callback (preferred for single events)

The `configureScope` callback on capture methods is the preferred pattern for one-off enrichment without needing a `using` block:

```csharp
// Only this event carries the tag
SentrySdk.CaptureException(ex, scope =>
{
    scope.SetTag("action", "checkout");
    scope.Level = SentryLevel.Fatal;
});

// The next event is NOT affected
SentrySdk.CaptureException(otherEx);
```

### Clearing scope data

```csharp
SentrySdk.ConfigureScope(scope =>
{
    scope.User = new SentryUser();   // Clear user (e.g., on logout)
    scope.Clear();                   // Clear everything
    scope.ClearBreadcrumbs();
    scope.ClearAttachments();
});
```

### Scope decision guide

| Goal | API |
|------|-----|
| Data on ALL events (app version, build ID) | `options.DefaultTags["key"] = "value"` |
| Session/request-level data | `SentrySdk.ConfigureScope(...)` |
| One specific event only | Inline `configureScope` callback on capture |
| Temporary sub-context (batch job, etc.) | `SentrySdk.PushScope()` + `using` |

---

## Context Enrichment

### Tags (Indexed, Searchable)

Tags are **indexed** — use them for filtering, grouping, and alerting rules.

```csharp
SentrySdk.ConfigureScope(scope =>
{
    scope.SetTag("page.locale", "de-at");
    scope.SetTag("user.plan", "enterprise");

    // Set multiple at once
    scope.SetTags(new Dictionary<string, string>
    {
        ["environment"] = "staging",
        ["region"]      = "us-east-1"
    });

    // Unset a tag
    scope.UnsetTag("page.locale");
});

// Default tags for ALL events (set in options)
SentrySdk.Init(options =>
{
    options.DefaultTags["app.version"]     = "2.0.1";
    options.DefaultTags["deployment.region"] = "us-east-1";
});
```

**Tag constraints:** Keys ≤ 32 chars (`a-zA-Z`, `0-9`, `_`, `.`, `:`, `-`); values ≤ 200 chars, no newlines.

### User

```csharp
SentrySdk.ConfigureScope(scope =>
{
    scope.User = new SentryUser
    {
        Id        = "42",
        Username  = "john.doe",
        Email     = "john.doe@example.com",
        IpAddress = "{{auto}}"        // let Sentry infer from the connection
    };

    // Custom fields
    scope.User.Other["account_type"] = "premium";
    scope.User.Other["tenant_id"]    = "acme-corp";
});

// Clear user on logout
SentrySdk.ConfigureScope(scope => scope.User = new SentryUser());
```

**SentryUser fields:**

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string?` | Internal identifier |
| `Username` | `string?` | Display label |
| `Email` | `string?` | Enables Gravatars and Sentry messaging |
| `IpAddress` | `string?` | `"{{auto}}"` to infer from connection; auto-set when `SendDefaultPii = true` |
| `Other` | `IDictionary<string, string>` | Arbitrary additional user data |

### Breadcrumbs

**Manual:**

```csharp
SentrySdk.AddBreadcrumb(
    message:  "User authenticated",
    category: "auth",
    level:    BreadcrumbLevel.Info);

// With structured data
SentrySdk.AddBreadcrumb(
    message:  "User navigated to checkout",
    category: "navigation",
    type:     "navigation",
    data:     new Dictionary<string, string>
    {
        ["from"] = "/cart",
        ["to"]   = "/checkout"
    },
    level: BreadcrumbLevel.Info);

// Using Breadcrumb object
var crumb = new Breadcrumb(
    message:  "Button clicked",
    type:     "user",
    data:     new Dictionary<string, string> { ["button_id"] = "submit" },
    category: "ui.click",
    level:    BreadcrumbLevel.Info);
SentrySdk.AddBreadcrumb(crumb);
```

**BreadcrumbLevel values:** `Debug`, `Info` (default), `Warning`, `Error`, `Critical`

**Automatically captured breadcrumbs:**

| Source | Requires |
|--------|----------|
| HTTP requests | `SentryHttpMessageHandler` with `HttpClient` |
| Logs (Info+) | `Microsoft.Extensions.Logging`, Serilog, NLog, log4net |
| Database queries | EF6 or EF Core via DiagnosticSource |
| MAUI app events | Navigation, lifecycle, user interactions |

Max breadcrumbs: 100 (default). Override with `options.MaxBreadcrumbs = 50`.

### Custom Contexts (Structured, Non-Searchable)

```csharp
SentrySdk.ConfigureScope(scope =>
{
    scope.Contexts["character"] = new
    {
        Name       = "Mighty Fighter",
        Age        = 19,
        AttackType = "melee"
    };

    scope.Contexts["build"] = new
    {
        Version  = "2.0.1",
        Commit   = "abc123",
        Pipeline = "main-ci"
    };
});
```

> The key `"type"` is **reserved** — do not use it. Contexts are not searchable; use Tags for searchable data.

### Tags vs Contexts vs Extra

| Feature | Searchable? | Indexed? | Best For |
|---------|------------|---------|---------|
| **Tags** | ✅ Yes | ✅ Yes | Filtering, grouping, alerting |
| **Contexts** | ❌ No | ❌ No | Structured debug info (nested objects) |
| **Extra** (deprecated) | ❌ No | ❌ No | Prefer `Contexts` instead |
| **User** | ✅ Partially | ✅ Yes | User attribution and filtering |

---

## `BeforeSend` and Filtering Hooks

### `BeforeSend` — Modify or Drop Error Events

Called immediately before transmission — last in the processing pipeline. Return `null` to drop the event.

```csharp
SentrySdk.Init(options =>
{
    // Simple variant
    options.SetBeforeSend(@event =>
    {
        // Drop noisy exceptions
        if (@event.Exception?.Message.Contains("Noisy Exception") == true)
            return null;

        // Scrub server name for privacy
        @event.ServerName = null;

        return @event;
    });

    // Full variant with SentryHint
    options.SetBeforeSend((@event, hint) =>
    {
        if (@event.Exception is SqlException sqlEx && sqlEx.Number == 1205)
        {
            // Deadlock — enrich rather than drop
            @event.SetTag("sql.error_number", sqlEx.Number.ToString());
        }

        return @event;
    });
});
```

### `BeforeSendTransaction` — Modify or Drop Performance Events

```csharp
options.SetBeforeSendTransaction((transaction, hint) =>
{
    if (transaction.Name == "GET /health")
        return null; // Drop health-check transactions
    return transaction;
});
```

### `BeforeBreadcrumb` — Filter or Modify Breadcrumbs

```csharp
options.SetBeforeBreadcrumb(breadcrumb =>
    breadcrumb.Category == "Spammy.Logger"
        ? null          // null DROPS the breadcrumb
        : breadcrumb);  // returning it KEEPS it (optionally modified)

// Full variant with hint
options.SetBeforeBreadcrumb((breadcrumb, hint) =>
{
    if (breadcrumb.Level == BreadcrumbLevel.Debug)
        return null;
    return breadcrumb;
});
```

### `BeforeSendLog`

```csharp
options.SetBeforeSendLog(log =>
{
    if (log.Level < SentryLevel.Warning)
        return null;
    return log;
});
```

---

## Fingerprinting and Custom Grouping

All events have a fingerprint. Events with the same fingerprint group into the same issue. The default fingerprint is computed from the stack trace. Override it in `BeforeSend` or directly on a scope/event.

### Group more aggressively (collapse all matching into one issue)

```csharp
options.SetBeforeSend(@event =>
{
    if (@event.Exception is SqlConnectionException)
    {
        // All SqlConnectionExceptions → one issue
        @event.SetFingerprint(new[] { "database-connection-error" });
    }
    return @event;
});
```

### Group with greater granularity (split issues using `{{ default }}`)

```csharp
options.SetBeforeSend(@event =>
{
    if (@event.Exception is MyRpcException ex)
    {
        @event.SetFingerprint(new[]
        {
            "{{ default }}",        // keep Sentry's default hash
            ex.Function,            // split by RPC function
            ex.Code.ToString()      // split by status code
        });
    }
    return @event;
});
```

### Set fingerprint directly on scope or event

```csharp
// On scope — applies to all subsequent events in this scope
SentrySdk.ConfigureScope(scope =>
{
    scope.Fingerprint = new[] { "my-custom-fingerprint" };
});

// On a specific event
var evt = new SentryEvent(exception);
evt.Fingerprint = new[] { "{{ default }}", "additional-key" };
SentrySdk.CaptureEvent(evt);
```

### Fingerprint template variables

| Variable | Description |
|----------|-------------|
| `{{ default }}` | Sentry's normally computed hash (extend rather than replace) |
| `{{ transaction }}` | Current transaction name |
| `{{ function }}` | Top function in stack trace |
| `{{ type }}` | Exception type name |

---

## Exception Filters

### Filter by exception type

```csharp
SentrySdk.Init(options =>
{
    // Also suppresses TaskCanceledException (derives from OperationCanceledException)
    options.AddExceptionFilterForType<OperationCanceledException>();
    options.AddExceptionFilterForType<MyBusinessException>();
});
```

### Custom `IExceptionFilter`

```csharp
public class MyExceptionFilter : IExceptionFilter
{
    public bool Filter(Exception ex)
    {
        // Return true to DROP the exception (not sent to Sentry)
        return ex is MyCustomException mce && mce.IsExpected;
    }
}

SentrySdk.Init(options =>
{
    options.AddExceptionFilter(new MyExceptionFilter());
});
```

### Deduplication

```csharp
SentrySdk.Init(options =>
{
    // Default: All ^ InnerException
    options.DeduplicateMode =
        DeduplicateMode.SameEvent |
        DeduplicateMode.SameExceptionInstance;

    // Disable entirely
    options.DisableDuplicateEventDetection();
});
```

**DeduplicateMode flags:** `SameEvent`, `SameExceptionInstance`, `InnerException`, `AggregateException`, `All`

---

## Unhandled Exception Capture

### WPF

```csharp
// App.xaml.cs — must be in constructor, NOT OnStartup()
public partial class App : Application
{
    public App()
    {
        SentrySdk.Init(options =>
        {
            options.Dsn = "https://...@sentry.io/...";
            options.IsGlobalModeEnabled = true; // Required for desktop apps
            options.TracesSampleRate = 1.0;
        });

        // Hook WPF dispatcher-level unhandled exceptions
        DispatcherUnhandledException += App_DispatcherUnhandledException;
    }

    void App_DispatcherUnhandledException(
        object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        SentrySdk.CaptureException(e.Exception);
        e.Handled = true; // Prevent the WPF default crash dialog
    }
}
```

> **`IsGlobalModeEnabled = true`** is required for WPF — ensures background thread exceptions share the same scope as the UI thread.

> **Critical:** Initialize in the `App()` constructor, not `OnStartup()`. The constructor runs before any dispatcher frames, ensuring the unhandled exception hook is registered first.

### MAUI

```csharp
// MauiProgram.cs
public static MauiApp CreateMauiApp()
{
    var builder = MauiApp.CreateBuilder();
    builder
        .UseMauiApp<App>()
        .UseSentry(options =>
        {
            options.Dsn = "https://...@sentry.io/...";
            options.TracesSampleRate = 1.0;

            // Optional — all false by default (PII risk)
            options.IncludeTextInBreadcrumbs               = false;
            options.IncludeTitleInBreadcrumbs              = false;
            options.IncludeBackgroundingStateInBreadcrumbs = false;
        });
    return builder.Build();
}
```

**MAUI platform coverage:**

| Platform | Integration |
|----------|-------------|
| Android | `AppDomainUnhandledExceptionIntegration` + native Android SDK |
| iOS / Mac Catalyst | `RuntimeMarshalManagedExceptionIntegration` + native Cocoa SDK |
| Windows (WinUI) | `AppDomainUnhandledExceptionIntegration` + `WinUIUnhandledExceptionIntegration` |

### Windows Forms

```csharp
// Program.cs
[STAThread]
static void Main()
{
    Application.EnableVisualStyles();
    Application.SetCompatibleTextRenderingDefault(false);

    // REQUIRED: makes WinForms re-throw instead of swallowing exceptions
    Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException);

    using (SentrySdk.Init(options =>
    {
        options.Dsn = "https://...@sentry.io/...";
        options.IsGlobalModeEnabled = true;
        options.TracesSampleRate = 1.0;
    }))
    {
        Application.Run(new MainForm());
    }
}
```

### Console App

```csharp
// Program.cs
SentrySdk.Init(options =>
{
    options.Dsn = "https://...@sentry.io/...";
    options.TracesSampleRate = 1.0;
});

// SDK 3.31.0+ handles flush on exit automatically
// For older SDKs, wrap in: using var _ = SentrySdk.Init(...);
```

### Disabling Built-in Integrations

```csharp
SentrySdk.Init(options =>
{
    options.DisableAppDomainUnhandledExceptionCapture();
    options.DisableUnobservedTaskExceptionCapture();
    options.DisableAppDomainProcessExitFlush();
    options.DisableRuntimeMarshalManagedExceptionCapture(); // iOS/MacCatalyst
});
```

---

## Event Processors

Unlike `BeforeSend` (only one allowed), multiple event processors can be registered at different scopes:

```csharp
// Global — runs for all events
public class MyEventProcessor : ISentryEventProcessor
{
    public SentryEvent? Process(SentryEvent @event)
    {
        if (@event.Exception is BackgroundJobException)
            return null; // Drop — null discards the event

        @event.SetTag("app.layer", "background-worker");
        @event.ServerName = null; // Scrub hostname

        return @event;
    }
}

// Register globally via options
SentrySdk.Init(options =>
{
    options.AddEventProcessor(new MyEventProcessor());
});

// Register on current + following scopes
SentrySdk.ConfigureScope(scope =>
{
    scope.AddEventProcessor(new MyEventProcessor());
});

// Register for a single event only
SentrySdk.CaptureException(ex, scope =>
{
    scope.AddEventProcessor(new MyEventProcessor());
});
```

### Exception processor (runs before the main chain)

```csharp
public class MyExceptionProcessor : ISentryEventExceptionProcessor
{
    public void Process(Exception exception, SentryEvent sentryEvent)
    {
        if (exception is HttpRequestException httpEx)
        {
            sentryEvent.SetTag("http.status", httpEx.StatusCode?.ToString() ?? "unknown");
        }
    }
}

SentrySdk.Init(options =>
{
    options.AddExceptionProcessor(new MyExceptionProcessor());
});
```

**Processor execution order:**
1. `ISentryEventExceptionProcessor` — exception-specific processors
2. `ISentryEventProcessor` — general event processors
3. `SetBeforeSend` / `SetBeforeSendTransaction` — **always last**

---

## User Feedback

### Programmatic API

```csharp
// Capture an event first to get an ID
var eventId = SentrySdk.CaptureMessage("An event that will receive user feedback.");

// Submit user feedback linked to that event
SentrySdk.CaptureFeedback(
    message:           "It broke when I clicked submit.",
    contactEmail:      "user@example.com",
    name:              "Jane Doe",
    associatedEventId: eventId);
```

**Full signature:**

```csharp
SentryId SentrySdk.CaptureFeedback(
    string message,
    string? contactEmail      = null,
    string? name              = null,
    string? replayId          = null,
    string? url               = null,
    SentryId? associatedEventId = null,
    Scope? scope              = null,
    SentryHint? hint          = null)
```

**Using `SentryFeedback` object:**

```csharp
var feedback = new SentryFeedback(
    message:           "The checkout button is broken.",
    contactEmail:      "user@example.com",
    name:              "John Smith",
    associatedEventId: SentrySdk.LastEventId);

SentrySdk.CaptureFeedback(feedback);
```

> **Validation:** Sentry rejects feedback with invalid email addresses. Pre-validate email format before calling the API.

### Crash-Report Modal (JavaScript widget on error pages)

For ASP.NET Core web apps, show the browser-based report dialog on error response pages:

```html
<!-- Include Sentry JS SDK -->
<script
  src="https://browser.sentry-cdn.com/10.40.0/bundle.min.js"
  crossorigin="anonymous">
</script>

<!-- Show dialog with the server-side event ID -->
<script>
  Sentry.init({ dsn: "https://...@sentry.io/..." });
  Sentry.showReportDialog({ eventId: "@ViewBag.SentryEventId" });
</script>
```

```csharp
// In your error controller or exception handler middleware
ViewBag.SentryEventId = SentrySdk.LastEventId;
```

---

## Error Capture Quick Reference

### Scenario Coverage Table

| Scenario | Auto Captured? | Solution |
|----------|--------------|---------|
| Unhandled exception (all frameworks) | ✅ Yes | `AppDomain.UnhandledException` integration |
| Unobserved Task exception | ✅ Yes | `TaskScheduler.UnobservedTaskException` integration |
| ASP.NET Core request error | ✅ Yes | Sentry middleware |
| WPF `DispatcherUnhandledException` | ✅ Yes | Hook in `App()` constructor |
| MAUI unhandled exception | ✅ Yes | Platform-specific native integrations |
| WinForms unhandled exception | ✅ Yes | Requires `SetUnhandledExceptionMode(ThrowException)` |
| `try/catch` with graceful return | ❌ No | `SentrySdk.CaptureException(ex)` before return |
| `try/catch` with re-throw | ✅ Yes | Bubbles to unhandled exception handler |
| Background thread exception | ✅ Yes | `IsGlobalModeEnabled = true` for desktop apps |

### API Quick Reference

```csharp
// ── Capture ───────────────────────────────────────────────────────────────
SentrySdk.CaptureException(ex)
SentrySdk.CaptureException(ex, scope => { scope.SetTag("key", "val"); })
SentrySdk.CaptureMessage("text")
SentrySdk.CaptureMessage("text", SentryLevel.Warning)

// ── User ──────────────────────────────────────────────────────────────────
SentrySdk.ConfigureScope(scope => scope.User = new SentryUser { Id = "42", Email = "..." });
SentrySdk.ConfigureScope(scope => scope.User = new SentryUser()); // clear on logout

// ── Tags (searchable) ─────────────────────────────────────────────────────
SentrySdk.ConfigureScope(scope => scope.SetTag("key", "value"));
SentrySdk.ConfigureScope(scope => scope.UnsetTag("key"));

// ── Contexts (structured, non-searchable) ─────────────────────────────────
SentrySdk.ConfigureScope(scope => scope.Contexts["name"] = new { Key = "value" });

// ── Breadcrumbs ───────────────────────────────────────────────────────────
SentrySdk.AddBreadcrumb(message: "...", category: "auth", level: BreadcrumbLevel.Info);

// ── Scope isolation ───────────────────────────────────────────────────────
using (SentrySdk.PushScope())
{
    SentrySdk.ConfigureScope(scope => scope.SetTag("key", "value"));
    SentrySdk.CaptureException(ex);
} // tag is cleared after this block

// ── Fingerprinting ────────────────────────────────────────────────────────
SentrySdk.ConfigureScope(scope => scope.Fingerprint = new[] { "group-key" });
// In BeforeSend: @event.SetFingerprint(new[] { "{{ default }}", "extra-dim" });

// ── Hooks (in SentrySdk.Init) ─────────────────────────────────────────────
options.SetBeforeSend((@event, hint) => @event)         // return null to drop
options.SetBeforeSendTransaction((txn, hint) => txn)
options.SetBeforeBreadcrumb((crumb, hint) => crumb)     // return null to drop
options.AddExceptionFilterForType<OperationCanceledException>()

// ── Flush ─────────────────────────────────────────────────────────────────
SentrySdk.Flush(TimeSpan.FromSeconds(5));
await SentrySdk.FlushAsync(TimeSpan.FromSeconds(5));
```

---

## Configuration Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Dsn` | `string` | — | DSN from Sentry project settings; also reads `SENTRY_DSN` env var |
| `Release` | `string?` | — | App release version; also reads `SENTRY_RELEASE` |
| `Environment` | `string?` | — | Deployment environment; also reads `SENTRY_ENVIRONMENT` |
| `SampleRate` | `float` | `1.0` | Error event sampling rate (0–1) |
| `TracesSampleRate` | `double` | `0` | Transaction sampling rate (0–1) |
| `AttachStacktrace` | `bool` | `true` | Attach stack traces to message events too |
| `SendDefaultPii` | `bool` | `false` | Include IP, username, headers |
| `MaxBreadcrumbs` | `int` | `100` | Max breadcrumbs per event |
| `IsGlobalModeEnabled` | `bool` | `false` | Singleton scope for desktop apps |
| `Debug` | `bool` | `false` | Log SDK diagnostics to console |
| `DiagnosticLevel` | `SentryLevel` | `Debug` | Min level for SDK diagnostic logs |
| `DeduplicateMode` | `DeduplicateMode` | `All ^ InnerException` | Duplicate event detection strategy |
| `MaxAttachmentSize` | `long` | `20 MiB` | Max attachment size in bytes |
| `DefaultTags` | `IDictionary<string, string>` | `{}` | Tags added to every event |
| `CacheDirectoryPath` | `string?` | `null` | Path for offline envelope caching |
| `ShutdownTimeout` | `TimeSpan` | `2s` | Flush timeout on SDK shutdown |
| `CaptureFailedRequests` | `bool` | `true` | Capture HTTP client error responses |
| `EnableLogs` | `bool` | `false` | Enable Sentry structured logging |
| `StackTraceMode` | `StackTraceMode` | `Enhanced` | `Enhanced` or `Original` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Caught exceptions not appearing in Sentry | Any `try/catch` that doesn't re-throw must call `SentrySdk.CaptureException(ex)` before returning |
| WPF exceptions from background threads missing | Set `options.IsGlobalModeEnabled = true`; initialize in `App()` constructor, not `OnStartup()` |
| WinForms exceptions not captured | Call `Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException)` before `SentrySdk.Init` |
| Events dropped after process exit (console/CLI) | SDK 3.31.0+ handles this automatically; on older versions wrap `Init` result in `using var _ = SentrySdk.Init(...)` |
| Stack traces show minified/optimized frames | Enable symbol upload via MSBuild properties (`SentryOrg`, `SentryProject`, `SentryAuthToken`) |
| Duplicate events in Sentry | Check `DeduplicateMode`; `AggregateException` wrapping can cause same exception to appear multiple times |
| Missing user data on events | For ASP.NET Core, enable `SendDefaultPii = true` or register a custom `ISentryUserFactory`; for desktop apps ensure `IsGlobalModeEnabled = true` |
| `OperationCanceledException` flooding Sentry | Filter with `options.AddExceptionFilterForType<OperationCanceledException>()` |
| Events not sent before Lambda/Azure Functions cold start ends | Call `await SentrySdk.FlushAsync(TimeSpan.FromSeconds(5))` at the end of your handler |
| SDK reports `IsEnabled = false` | DSN not set or set to empty string; check `SENTRY_DSN` env var or options initialization order |
