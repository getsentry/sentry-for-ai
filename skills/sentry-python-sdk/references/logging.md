# Logging — Sentry Python SDK

> Minimum SDK: `sentry-sdk` 2.35.0+ for structured Sentry Logs (`enable_logs=True`)

## Two Logging Systems

| System | Produces | Requires |
|--------|----------|---------|
| **Sentry Structured Logs** | Searchable log records in Sentry Logs UI | `enable_logs=True` + `sentry_sdk.logger.*` |
| **LoggingIntegration (classic)** | Breadcrumbs and/or error events from stdlib `logging` | Auto-enabled by default |

These run simultaneously. They are **not** mutually exclusive.

## Configuration

```python
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
import logging

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    enable_logs=True,                    # required for structured Sentry Logs
    integrations=[
        LoggingIntegration(
            sentry_logs_level=logging.INFO,   # stdlib records → Sentry Logs (requires enable_logs=True)
            level=logging.INFO,               # stdlib records → breadcrumbs
            event_level=logging.ERROR,        # stdlib records → Sentry error events
        ),
    ],
)
```

### `LoggingIntegration` parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| `sentry_logs_level` | `INFO` | Records ≥ level → **structured Sentry Logs** (needs `enable_logs=True`) |
| `level` | `INFO` | Records ≥ level → **breadcrumbs** (attached to next error event) |
| `event_level` | `ERROR` | Records ≥ level → standalone **Sentry error events** |

## Code Examples

### Sentry Structured Logs — direct API

```python
import sentry_sdk
from sentry_sdk import logger as sentry_logger

sentry_sdk.init(dsn="...", enable_logs=True)

sentry_logger.trace("Starting database connection {database}", database="users")
sentry_logger.debug("Cache miss for user {user_id}", user_id=123)
sentry_logger.info("Updated global cache")
sentry_logger.warning("Rate limit reached for endpoint {endpoint}", endpoint="/api/results/")
sentry_logger.error(
    "Failed to process payment. Order: {order_id}. Amount: {amount}",
    order_id="or_2342",
    amount=99.99,
)
sentry_logger.fatal("Database {database} connection pool exhausted", database="users")
```

Template `{attribute_name}` placeholders become **individually searchable attributes** in the Sentry Logs UI.

### Extra structured attributes

```python
from sentry_sdk import logger as sentry_logger

sentry_logger.error(
    "Payment processing failed",
    attributes={
        "payment.provider": "stripe",
        "payment.method": "credit_card",
        "payment.currency": "USD",
        "user.subscription_tier": "premium",
    },
)
```

### stdlib `logging` → Sentry Logs

```python
import logging
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

sentry_sdk.init(
    dsn="...",
    enable_logs=True,
    integrations=[LoggingIntegration(sentry_logs_level=logging.INFO)],
)

logger = logging.getLogger(__name__)
logger.info("User signed in", extra={"user_id": 42, "region": "eu-west-1"})
# extra fields become searchable attributes on the log entry
```

### Loguru integration

```python
import sentry_sdk
from loguru import logger

# LoguruIntegration auto-activates when loguru is installed
sentry_sdk.init(dsn="...", enable_logs=True)

logger.info("Application started")
logger.error("Critical failure in payment module")
```

Manual configuration for full control:

```python
import sentry_sdk
from sentry_sdk.integrations.loguru import LoguruIntegration, LoggingLevels

sentry_sdk.init(
    dsn="...",
    enable_logs=True,
    integrations=[
        LoguruIntegration(
            sentry_logs_level=LoggingLevels.INFO.value,    # → structured logs
            level=LoggingLevels.INFO.value,                # → breadcrumbs
            event_level=LoggingLevels.ERROR.value,         # → error events
        )
    ],
)
```

### `before_send_log` hook — filter and modify

```python
import sentry_sdk
from typing import Optional

def before_log(log, hint) -> Optional[dict]:
    # Drop all INFO logs
    if log["severity_text"] == "info":
        return None
    # Add custom attribute
    log["attributes"]["processed_by"] = "before_log"
    return log

sentry_sdk.init(dsn="...", enable_logs=True, before_send_log=before_log)
```

### `Log` object schema

| Key | Type | Description |
|-----|------|-------------|
| `severity_text` | `str` | `"trace"` / `"debug"` / `"info"` / `"warning"` / `"error"` / `"fatal"` |
| `severity_number` | `int` | 1–24 (OpenTelemetry spec) |
| `body` | `str` | Rendered message string |
| `attributes` | `dict` | Custom key-value pairs |
| `time_unix_nano` | `int` | Unix epoch in nanoseconds |
| `trace_id` | `str \| None` | Associated trace ID |

### Suppress noisy loggers

```python
from sentry_sdk.integrations.logging import ignore_logger

ignore_logger("a.spammy.logger")
ignore_logger("boto3.*")   # glob patterns supported
```

## Decision Table

| Goal | Tool |
|------|------|
| Searchable structured records in Sentry Logs UI | `sentry_sdk.logger.*` + `enable_logs=True` |
| Bridge existing stdlib `logging` to Sentry Logs | `LoggingIntegration(sentry_logs_level=...)` + `enable_logs=True` |
| Bridge loguru to Sentry Logs | `LoguruIntegration(sentry_logs_level=...)` + `enable_logs=True` |
| Breadcrumbs for error context | `LoggingIntegration(level=logging.INFO)` (default) |
| Auto-create error events from log calls | `LoggingIntegration(event_level=logging.ERROR)` (default) |
| Drop/modify a log before sending | `before_send_log` callback |

## Automatically Added Attributes

Every log record receives these automatically:

| Attribute | Source |
|-----------|--------|
| `sentry.environment` | `init(environment=...)` |
| `sentry.release` | `init(release=...)` |
| `sentry.sdk.name` / `sentry.sdk.version` | SDK metadata |
| `server.address` | hostname |
| `sentry.message.template` | Original template string |
| `sentry.message.parameter.*` | Template placeholder values |
| `user.id`, `user.name`, `user.email` | Active scope user (if set) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `sentry_sdk.logger.*` calls have no effect | Ensure `enable_logs=True` is set in `sentry_sdk.init()` |
| stdlib logs not appearing as Sentry Logs | Set `sentry_logs_level` in `LoggingIntegration` and `enable_logs=True` |
| Logger's own level filters out records | SDK respects the logger's configured level — set it to `logging.INFO` or lower |
| Too many log records hitting quota | Use `before_send_log` to filter by severity or attribute |
| Loguru not auto-activating | Verify `loguru` is installed; or add `LoguruIntegration()` explicitly |
