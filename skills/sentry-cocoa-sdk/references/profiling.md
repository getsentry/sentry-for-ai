# Profiling — Sentry Cocoa SDK

> Minimum SDK for UI Profiling (`configureProfiling`): `sentry-cocoa` v8.49.0+  
> Minimum SDK for stable `configureProfiling` API: v9.0.0+  
> **All legacy profiling APIs (`profilesSampleRate`, `enableAppLaunchProfiling`, continuous beta) were removed in v9.0.0.**

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configureProfiling` | `((SentryProfileOptions) -> Void)?` | `nil` | Closure to configure UI Profiling (v8.49.0+) |
| `sessionSampleRate` | `Double` (0.0–1.0) | `0` | Fraction of user sessions to profile; evaluated once per session |
| `lifecycle` | `SentryProfileLifecycle` | `.manual` | `.trace` (auto) or `.manual` (explicit start/stop) |
| `profileAppStarts` | `Bool` | `false` | Profile from the earliest possible lifecycle stage on next launch |

## Code Examples

### Basic setup — trace lifecycle (recommended)

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"

    // Tracing must be enabled for .trace lifecycle
    options.tracesSampleRate = 1.0

    options.configureProfiling = {
        $0.sessionSampleRate = 1.0   // 100% of sessions; lower for production
        $0.lifecycle = .trace        // profiler runs while a root span is active
    }
}
```

### Manual lifecycle — explicit start/stop

```swift
import Sentry

SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.configureProfiling = {
        $0.sessionSampleRate = 1.0
        $0.lifecycle = .manual   // default if omitted
    }
}

// Profile a specific operation
@IBAction func onSyncTapped() {
    SentrySDK.startProfiler()

    URLSession.shared.dataTask(with: syncRequest) { data, _, _ in
        self.processData(data)
        DispatchQueue.main.async {
            self.tableView.performBatchUpdates({
                // update cells
            }) { _ in
                SentrySDK.stopProfiler()
            }
        }
    }.resume()
}
```

### App launch profiling (trace lifecycle)

```swift
SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.tracesSampleRate = 1.0
    options.configureProfiling = {
        $0.sessionSampleRate = 1.0
        $0.lifecycle = .trace
        $0.profileAppStarts = true   // profile from earliest lifecycle stage
    }
}
```

Launch profile attaches to a special `app.launch` transaction (shown as **"launch"** in the Sentry UI). The profiler stops automatically when:
1. `SentrySDK.startWithOptions` is called, OR
2. TTID/TTFD is reached (if TTID/TTFD tracking is enabled)

### Manual lifecycle — app launch profiling

With `.manual` lifecycle, a launch profile starts on the **next app launch** and continues until you explicitly call `SentrySDK.stopProfiler()`.

### Compound sampling example

```swift
SentrySDK.start { options in
    options.dsn = "___PUBLIC_DSN___"
    options.tracesSampleRate = 0.5   // 50% of transactions traced
    options.configureProfiling = {
        $0.sessionSampleRate = 0.5   // 50% of those sessions profiled
        $0.lifecycle = .trace
        // Result: ~25% of root span creations will produce profile data (0.5 × 0.5)
    }
}
```

`sessionSampleRate` is evaluated **once per session**, not per span. The same decision applies to all profiler start attempts for the duration of that session.

## SentryProfileLifecycle Values

| Value | Behaviour |
|-------|-----------|
| `.manual` | Profiler runs only between `SentrySDK.startProfiler()` and `SentrySDK.stopProfiler()` |
| `.trace` | Profiler starts automatically when a new root span is created; stops when no root spans remain |

## Manual Profiler Control

```swift
SentrySDK.startProfiler()   // begin profiling (manual lifecycle)
SentrySDK.stopProfiler()    // end profiling and flush data to Sentry
```

## dSYM Upload Requirement

Profiling data in Sentry shows symbolicated stack frames. Without dSYM files, frames appear as memory addresses.

Upload dSYMs via the Sentry Wizard build phase (added automatically during wizard setup):

```bash
# Verify the build phase exists in Xcode:
# Target → Build Phases → "Upload Debug Symbols to Sentry"
# or manually:
sentry-cli --auth-token YOUR_TOKEN debug-files upload \
    --org YOUR_ORG \
    --project YOUR_PROJECT \
    path/to/dSYMs/
```

For CI/CD, set `SENTRY_AUTH_TOKEN` as an environment variable.

## API History / Migration

| API | Introduced | Removed | Notes |
|-----|-----------|---------|-------|
| `profilesSampleRate` | 8.12.0 | **9.0.0** | Transaction-based profiling |
| `profilesSampler` | 8.12.0 | **9.0.0** | Dynamic transaction-based profiling |
| `enableAppLaunchProfiling` | 8.21.0 | **9.0.0** | Launch profiling (old) |
| Continuous profiling beta | 8.36.0 | **9.0.0** | Standalone `startProfiler`/`stopProfiler` (old) |
| `configureProfiling` (UI Profiling) | **8.49.0** | — | **Current API** |

### Migrating from legacy `profilesSampleRate`

```swift
// BEFORE (removed in v9.0.0)
SentrySDK.start { options in
    options.tracesSampleRate = 1.0
    options.profilesSampleRate = 1.0   // ❌ no longer exists
}

// AFTER (v9.0.0+)
SentrySDK.start { options in
    options.tracesSampleRate = 1.0
    options.configureProfiling = {
        $0.sessionSampleRate = 1.0
        $0.lifecycle = .trace          // ✅ equivalent behaviour
    }
}
```

## Best Practices

- Always set `sessionSampleRate > 0` — it defaults to `0`, so no profiling data is collected unless you explicitly set it
- Use `.trace` lifecycle in production: the profiler only runs during active transactions, minimising overhead
- Use `.manual` lifecycle to profile targeted operations (e.g., a specific button tap, a batch import)
- Lower `sessionSampleRate` in production (e.g., `0.1`) — profiling adds CPU overhead on older devices
- Upload dSYMs for every build; without them, profile data shows raw addresses
- `profileAppStarts = true` is most valuable for identifying slow `+[AppDelegate application:didFinishLaunchingWithOptions:]` work
- Do not combine the old `profilesSampleRate` with `configureProfiling` — the old APIs are removed in v9.0.0

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiling data in Sentry | Verify `sessionSampleRate > 0`; it defaults to `0` |
| Profiles missing for `.trace` lifecycle | Verify `tracesSampleRate > 0`; profiles only appear when transactions are sent |
| Stack frames show memory addresses | Upload dSYMs; verify build phase runs in both Debug and Release |
| Profiling not starting on app launch | Use `profileAppStarts = true`; SDK must be initialised with `SentrySDK.startWithOptions` |
| `configureProfiling` not available | Requires v8.49.0+; check your SPM/CocoaPods version |
| Old `profilesSampleRate` not compiling | Removed in v9.0.0; migrate to `configureProfiling` |
| Manual profiler never stops | Ensure `SentrySDK.stopProfiler()` is called on all code paths, including error branches |
| Excessive CPU overhead | Lower `sessionSampleRate`; switch to `.trace` lifecycle; avoid `.manual` with long-running sessions |
