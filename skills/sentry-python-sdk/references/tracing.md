# Tracing — Sentry Python SDK

> Minimum SDK: `sentry-sdk` 0.11.2+ for basic tracing; 2.x for `update_current_span()` and enhanced `@trace`

## Configuration

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `traces_sample_rate` | `float` | `None` | Fraction of transactions to trace (0.0–1.0); `None` disables tracing |
| `traces_sampler` | `callable` | `None` | Per-transaction sampling function; overrides `traces_sample_rate` |
| `trace_propagation_targets` | `list` | all origins | URLs to inject `sentry-trace` / `baggage` headers into |
| `functions_to_trace` | `list` | `[]` | Fully-qualified function names to auto-wrap with spans |
| `instrumenter` | `str` | `"sentry"` | Set to `"otel"` to use OpenTelemetry bridge |

## Code Examples

### Enable tracing

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    traces_sample_rate=1.0,   # 1.0 = 100% of transactions; reduce in production
)
```

### Custom spans with context manager

```python
import sentry_sdk

# Top-level transaction
with sentry_sdk.start_transaction(op="task", name="Process Order"):
    with sentry_sdk.start_span(name="Validate Items") as span:
        span.set_data("item_count", len(items))
        validate(items)

    with sentry_sdk.start_span(name="Charge Card"):
        charge_card(order)
```

### `@sentry_sdk.trace` decorator

```python
import sentry_sdk

# Simple decorator — uses function name as span name
@sentry_sdk.trace
def process_payment(order_id: str):
    ...

# With custom op, name, and attributes (SDK 2.35.0+)
@sentry_sdk.trace(op="payment", name="Charge Customer", attributes={"version": 2})
def charge_customer(amount: int):
    ...

# Static / class methods — decorator order matters!
class PaymentService:
    @staticmethod
    @sentry_sdk.trace          # MUST come AFTER @staticmethod
    def process():
        ...

    @classmethod
    @sentry_sdk.trace          # MUST come AFTER @classmethod
    def batch_process(cls):
        ...
```

### Adding data to spans

```python
import sentry_sdk

with sentry_sdk.start_span(name="db-query") as span:
    span.set_data("db.system", "postgresql")
    span.set_data("db.table", "orders")
    span.set_data("row_count", 42)
    span.set_data("cache_hit", False)
    # Only primitive types: str, int, float, bool, or homogeneous lists
```

### Accessing the active span/transaction

```python
import sentry_sdk

# Get active span
span = sentry_sdk.get_current_span()
if span:
    span.set_data("key", "value")

# Get active transaction
txn = sentry_sdk.get_current_scope().transaction
if txn:
    txn.set_tag("order.type", "subscription")

# Update active span in-place (SDK 2.x)
sentry_sdk.update_current_span(
    op="http.client",
    name="POST /api/charge",
    attributes={"http.status_code": 200},
)
```

### Auto-trace multiple functions without decorators

```python
import sentry_sdk

sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    functions_to_trace=[
        {"qualified_name": "myapp.billing.processor.charge_card"},
        {"qualified_name": "myapp.billing.processor.BillingService.validate"},
    ],
)
# No changes to the functions themselves required
```

### Dynamic sampling with `traces_sampler`

```python
import sentry_sdk

def traces_sampler(sampling_context):
    # Honour parent's sampling decision in distributed traces
    parent = sampling_context.get("parent_sampled")
    if parent is not None:
        return float(parent)

    op = sampling_context["transaction_context"].get("op", "")

    if op == "http.server":
        name = sampling_context["transaction_context"].get("name", "")
        if name in ("/health", "/ping", "/readyz"):
            return 0          # drop health checks
        return 0.5            # sample 50% of HTTP requests
    elif op == "task":
        return 0.1            # sample 10% of background tasks
    else:
        return 0.01           # default 1%

sentry_sdk.init(dsn="...", traces_sampler=traces_sampler)
```

### Auto-instrumented frameworks

| Framework | Auto-enabled | What is traced |
|-----------|-------------|----------------|
| Django | ✅ | Requests, DB queries (ORM), cache, signals |
| Flask | ✅ | Requests, Jinja2 rendering |
| FastAPI / Starlette | ✅ | Requests, background tasks |
| Celery | ✅ | Task execution, queue operations |
| SQLAlchemy | ✅ | All queries as spans + breadcrumbs |
| Redis | ✅ | All commands as spans + breadcrumbs |
| PyMongo | ✅ | All queries (covers mongoengine, Motor) |
| requests / httpx | ✅ | Outbound HTTP calls with trace propagation |

### Database auto-instrumentation

```python
import sentry_sdk
from sentry_sdk.integrations.redis import RedisIntegration

# SQLAlchemy — auto-enabled, no config needed
sentry_sdk.init(dsn="...", traces_sample_rate=1.0)
# All queries appear as spans automatically

# Redis — with optional cache monitoring
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    send_default_pii=True,       # enables full command data in spans
    integrations=[
        RedisIntegration(
            max_data_size=1024,                         # truncate large values
            cache_prefixes=["mycache:", "template."],   # appears in cache dashboard
        ),
    ],
)
```

### Distributed tracing

Frameworks propagate `sentry-trace` and `baggage` headers automatically. For manual HTTP calls:

```python
import sentry_sdk

# Outgoing: inject headers into arbitrary request
headers = {}
headers["sentry-trace"] = sentry_sdk.get_traceparent()
headers["baggage"] = sentry_sdk.get_baggage()
make_request(url="https://internal-api.example.com", headers=headers)

# Incoming: continue a trace from arbitrary headers
incoming_headers = get_headers_from_request()
transaction = sentry_sdk.continue_trace(incoming_headers)  # does NOT start it
with sentry_sdk.start_transaction(transaction):
    handle_request()

# Browser: inject into HTML meta tags for JS frontend pickup
meta = f'<meta name="sentry-trace" content="{sentry_sdk.get_traceparent()}">'
meta += f'<meta name="baggage" content="{sentry_sdk.get_baggage()}">'
```

### Limit propagation targets

```python
import sentry_sdk, re

sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    trace_propagation_targets=[
        "localhost",
        "https://api.myservice.com",
        re.compile(r"^https://internal\."),
    ],
    # Set to [] to disable outgoing propagation entirely
)
```

### OpenTelemetry bridge

```python
# pip install "sentry-sdk[opentelemetry]"
import sentry_sdk
from opentelemetry import trace
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk.trace import TracerProvider
from sentry_sdk.integrations.opentelemetry import SentrySpanProcessor, SentryPropagator

sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    instrumenter="otel",      # disables built-in Sentry auto-instrumentation
)

provider = TracerProvider()
provider.add_span_processor(SentrySpanProcessor())
trace.set_tracer_provider(provider)
set_global_textmap(SentryPropagator())

# Use OTel API as normal — spans appear in Sentry
tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("my-operation"):
    do_work()
```

## Best Practices

- Use `traces_sampler` instead of `traces_sample_rate` for production — it lets you drop health checks, adjust by route, and honour distributed trace decisions
- Always finish spans — unfinished spans are silently dropped
- Use `span.set_data()` not `span.set_tag()` for span-level data (tags are for scope-level filtering)
- Set `trace_propagation_targets` to avoid leaking `sentry-trace` headers to third-party services
- Add `sentry-trace` and `baggage` to your CORS allowlist when tracing browser-to-backend flows

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions appearing | Verify `traces_sample_rate > 0` or `traces_sampler` returns non-zero |
| Spans not linked to transaction | Ensure spans are created inside an active `start_transaction()` context |
| Distributed traces broken | Check that `sentry-trace` and `baggage` headers pass through proxies/gateways |
| `description=` deprecation warning | Replace `description=` with `name=` in `start_span()` calls |
| OTel spans not appearing | Ensure `SentrySpanProcessor` is added to `TracerProvider` before creating spans |
| `@sentry_sdk.trace` on static method fails | Put `@sentry_sdk.trace` AFTER `@staticmethod` / `@classmethod` |
