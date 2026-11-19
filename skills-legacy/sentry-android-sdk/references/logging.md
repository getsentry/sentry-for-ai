# Logging — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android:8.12.0`  
> **Status:** Stable  
> **Enabled by default:** No — must opt in explicitly  
> **Docs:** https://docs.sentry.io/platforms/android/logs/

---

## Overview

Sentry Structured Logs capture application log events as searchable, filterable records in the Sentry Logs UI. Unlike breadcrumbs (which are attached to errors), structured logs are standalone events with typed attributes and are queryable independently.

Logging is **opt-in** — the feature is entirely inert until `options.logs.isEnabled = true` is set.

---

## Enabling Logs

**Code (preferred — allows dynamic configuration):**

```kotlin
SentryAndroid.init(this) { options ->
    options.dsn = "https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID"
    options.logs.isEnabled = true
}
```

**AndroidManifest.xml:**

```xml
<application>
    <meta-data
        android:name="io.sentry.logs.enabled"
        android:value="true" />
</application>
```

---

## Configuration

```kotlin
SentryAndroid.init(this) { options ->
    options.logs.isEnabled = true

    // Optional: filter or mutate logs before they are sent
    options.logs.setBeforeSend { event ->
        // Drop TRACE logs in production
        if (!BuildConfig.DEBUG && event.level == SentryLogLevel.TRACE) {
            return@setBeforeSend null  // null = drop the event
        }
        // Redact PII
        val body = event.body ?: return@setBeforeSend event
        if (body.contains("password", ignoreCase = true)) {
            event.setBody("[REDACTED]")
        }
        event
    }
}
```

### Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logs.isEnabled` | `Boolean` | `false` | Master switch — must be `true` for all logging features |
| `logs.setBeforeSend` | `BeforeSendLogCallback?` | `null` | Filter or mutate log events before transmission. Return `null` to drop. |

---

## Code Examples

### Basic Level Methods

```kotlin
import io.sentry.Sentry
import io.sentry.SentryLogLevel
import io.sentry.SentryAttribute
import io.sentry.SentryAttributes
import io.sentry.logger.SentryLogParameters

// Six log levels — all accept printf-style format strings
Sentry.logger().trace("Entering %s.%s()", className, methodName)
Sentry.logger().debug("Cache lookup for key: %s", cacheKey)
Sentry.logger().info("User %s logged in", userId)
Sentry.logger().warn("Rate limit approaching: %d / %d requests used", current, max)
Sentry.logger().error("Payment failed after %d retries", retries)
Sentry.logger().fatal("Database unavailable: %s", host)
```

**Java:**

```java
Sentry.logger().info("User %s logged in", userId);
Sentry.logger().error("Payment failed after %d retries", retries);
```

### Structured Attributes

Attach typed key-value pairs to make log events queryable by attribute values in Sentry:

```kotlin
Sentry.logger().log(
    SentryLogLevel.INFO,
    SentryLogParameters.create(
        SentryAttributes.of(
            SentryAttribute.stringAttribute("user.id",        userId),
            SentryAttribute.stringAttribute("order.id",       orderId),
            SentryAttribute.stringAttribute("payment.method", "card"),
            SentryAttribute.booleanAttribute("is_retry",       false),
            SentryAttribute.integerAttribute("item_count",     3),
            SentryAttribute.doubleAttribute("total_usd",       49.99)
        )
    ),
    "Checkout completed for user %s",
    userId
)
```

**Attribute factory methods:**

```kotlin
SentryAttribute.stringAttribute("key",  "value")     // String
SentryAttribute.booleanAttribute("key",  true)        // Boolean
SentryAttribute.integerAttribute("key",  42)          // Int / Long
SentryAttribute.doubleAttribute("key",   3.14)        // Double / Float
SentryAttribute.named("key", anyObject)               // type inferred at runtime
```

**From a map:**

```kotlin
val attrs = SentryAttributes.fromMap(mapOf(
    "user.id"    to userId,
    "request.id" to requestId,
    "duration"   to durationMs
))
Sentry.logger().log(SentryLogLevel.INFO, SentryLogParameters.create(attrs), "API call completed")
```

### Custom Timestamp (Backfilling)

```kotlin
val ts = SentryAutoDateProvider().now()
Sentry.logger().log(
    SentryLogLevel.INFO,
    SentryLogParameters.create(
        ts,
        SentryAttributes.of(
            SentryAttribute.stringAttribute("event", "purchase_complete"),
            SentryAttribute.stringAttribute("order.id", orderId)
        )
    ),
    "Order %s fulfilled",
    orderId
)
```

### Production Pattern — Screen Lifecycle

```kotlin
class ProductDetailActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val productId = intent.getStringExtra("product_id")

        Sentry.logger().info(
            SentryLogParameters.create(
                SentryAttributes.of(
                    SentryAttribute.stringAttribute("screen", "ProductDetail"),
                    SentryAttribute.stringAttribute("product.id", productId ?: "unknown")
                )
            ),
            "Screen opened: ProductDetail"
        )
    }
}
```

### Production Pattern — API Call Logging

```kotlin
suspend fun fetchUserProfile(userId: String): UserProfile {
    Sentry.logger().debug("Fetching profile for user %s", userId)
    val t0 = SystemClock.elapsedRealtime()

    return try {
        val profile = api.getUser(userId)
        Sentry.logger().info(
            SentryLogParameters.create(
                SentryAttributes.of(
                    SentryAttribute.stringAttribute("user.id", userId),
                    SentryAttribute.integerAttribute("duration_ms", (SystemClock.elapsedRealtime() - t0).toInt())
                )
            ),
            "Profile fetch succeeded for user %s",
            userId
        )
        profile
    } catch (e: Exception) {
        Sentry.logger().error(
            SentryLogParameters.create(
                SentryAttributes.of(
                    SentryAttribute.stringAttribute("user.id", userId),
                    SentryAttribute.integerAttribute("duration_ms", (SystemClock.elapsedRealtime() - t0).toInt()),
                    SentryAttribute.stringAttribute("error", e.message ?: "unknown")
                )
            ),
            "Profile fetch failed for user %s",
            userId
        )
        throw e
    }
}
```

---

## Timber Integration

`SentryTimberIntegration` bridges Timber logs into the Sentry Logs pipeline. Requires `sentry-android-timber`.

**Dependency:**

```groovy
implementation("io.sentry:sentry-android-timber:8.33.0")
```

**Setup:**

```kotlin
SentryAndroid.init(this) { options ->
    options.logs.isEnabled = true

    options.addIntegration(
        SentryTimberIntegration(
            minEventLevel      = SentryLevel.ERROR,      // Timber.e() → Sentry error events
            minBreadcrumbLevel = SentryLevel.INFO,       // Timber.i() → breadcrumbs
            minLogsLevel       = SentryLogLevel.DEBUG,   // Timber.d() → Sentry structured logs
        )
    )
}

// Plant Timber separately — SDK does not plant for you
if (BuildConfig.DEBUG) Timber.plant(Timber.DebugTree())
```

**Timber priority → SentryLogLevel mapping:**

| Timber Priority | `SentryLogLevel` |
|-----------------|-----------------|
| `Log.VERBOSE` | `TRACE` |
| `Log.DEBUG` | `DEBUG` |
| `Log.INFO` | `INFO` |
| `Log.WARN` | `WARN` |
| `Log.ERROR` | `ERROR` |
| `Log.ASSERT` | `FATAL` |

Each Timber-sourced log carries `sentry.origin = "auto.log.timber"` for filtering in `beforeSend`.

---

## Logcat Auto-Integration (Gradle Plugin)

With the Sentry Android Gradle plugin, `android.util.Log` calls are bytecode-instrumented at build time and forwarded to Sentry Logs automatically — **no source code changes needed**:

```groovy
// android/build.gradle (module)
sentry {
    autoInstallation.enabled = true
    tracingInstrumentation {
        features = [InstrumentationFeature.LOGCAT]
    }
}
```

Without the plugin, only manual `Sentry.logger()` calls and the Timber integration capture logs.

---

## Auto-Attached Attributes

The SDK automatically enriches every log event with the following attributes:

| Attribute Key | Value | Notes |
|---------------|-------|-------|
| `sentry.origin` | `"manual"` / `"auto.log.timber"` / `"auto.log.logcat"` | Per integration |
| `sentry.message.template` | Original format string | e.g. `"User %s logged in"` |
| `sentry.message.parameter.0` … `.N` | Format argument values | |
| `sentry.sdk.name` | `"sentry.java.android"` | |
| `sentry.sdk.version` | `"8.33.0"` | |
| `sentry.environment` | Configured environment | |
| `sentry.release` | Configured release string | |
| `sentry.replay_id` | Active replay session UUID | Only when Session Replay is recording |
| `sentry._internal.replay_is_buffering` | `"true"` | Only in `onErrorSampleRate` buffer mode |
| `user.id` | From `scope.user.id` | Added regardless of `sendDefaultPii` since 8.33.0 |
| `user.name` | From `scope.user.username` | |
| `user.email` | From `scope.user.email` | |

> **8.33.0 change:** `user.id`, `user.name`, `user.email` now attach to logs regardless of
> `sendDefaultPii`. Use `beforeSend` to suppress PII if needed.

---

## Log Levels Reference

| Level | `SentryLogLevel` constant | OTel Severity | When to Use |
|-------|--------------------------|---------------|-------------|
| `trace` | `TRACE` (1) | 1 | Step-by-step internals, loop iterations |
| `debug` | `DEBUG` (5) | 5 | Development diagnostics |
| `info` | `INFO` (9) | 9 | Business events, user actions, state transitions |
| `warn` | `WARN` (13) | 13 | Recoverable errors, approaching limits |
| `error` | `ERROR` (17) | 17 | Failures requiring investigation |
| `fatal` | `FATAL` (21) | 21 | Unrecoverable failures — app or subsystem down |

---

## Batch Processing

The SDK batches log events for efficiency:

| Parameter | Value |
|-----------|-------|
| Flush delay | 5 seconds after the first queued event |
| Max batch size | 100 events per HTTP envelope |
| Max queue size | 1,000 events (events silently dropped above this) |
| Background flush | Yes — `AndroidLoggerBatchProcessor` flushes when app goes to background |

---

## Best Practices

1. **Enable in `Application.onCreate()`** — set `options.logs.isEnabled = true` before any log calls
2. **Use structured attributes** — pass typed key-value pairs instead of embedding values in message strings; they become queryable columns in the Logs UI
3. **Use `beforeSend` for level filtering** — drop `TRACE`/`DEBUG` in production to reduce quota usage
4. **Redact PII in `beforeSend`** — since 8.33.0 user attributes attach regardless of `sendDefaultPii`
5. **Prefer `Sentry.logger()` over Timber for new code** — direct API provides full type safety for attributes
6. **Plant Timber separately** — `SentryTimberIntegration` does not call `Timber.plant()`; you must do it yourself
7. **Don't call `Sentry.logger()` before `SentryAndroid.init()`** — calls before init are silently dropped
8. **Keep queue headroom** — avoid bursts that exceed 1,000 queued events; excess is silently dropped

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Verify `options.logs.isEnabled = true` is set in `SentryAndroid.init()` — the feature is disabled by default |
| Logs appearing but missing attributes | Ensure you pass a `SentryLogParameters` with `SentryAttributes.of(...)` — plain format args are not queryable as attributes |
| Timber logs not forwarded | Add `SentryTimberIntegration` to `options.addIntegration()` and plant a `Timber.DebugTree()` separately |
| Timber logs not reaching Sentry as structured logs | Check `minLogsLevel` on `SentryTimberIntegration` — default is `INFO`; set to `DEBUG` to capture debug-level logs |
| Logs disappear silently under heavy load | Queue is capped at 1,000 events; use `beforeSend` to drop verbose levels before they queue up |
| `user.id` appearing in logs unexpectedly | Since SDK 8.33.0, user fields attach regardless of `sendDefaultPii`; use `beforeSend` to strip them |
| Logcat `Log.*` calls not captured | Requires the Sentry Android Gradle plugin with `InstrumentationFeature.LOGCAT` enabled at build time |
| `beforeSend` not called | Check that `options.logs.isEnabled = true` — `beforeSend` is only invoked when the feature is enabled |
| Logs lost on crash | Known limitation: in-memory queued events may not reach Sentry before the process is killed |
