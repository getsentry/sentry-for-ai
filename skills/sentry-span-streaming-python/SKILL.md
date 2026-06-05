---
name: sentry-span-streaming-python
description: Migrate Python SDK to Sentry span streaming (span-first trace lifecycle). Use when asked to "enable span streaming", "migrate to span streaming", "use trace_lifecycle stream", or switch from transaction-based to streamed span delivery in a Python project.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Span Streaming (Python)

# Sentry Span Streaming Migration (Python)

Migrate from the default transaction-based trace lifecycle (`static`) to span streaming (`stream`), where spans are sent individually as they complete instead of being batched into a transaction at the end.

This skill covers the Python SDK. For JavaScript, see [Span Streaming (JavaScript)](../sentry-span-streaming-js/SKILL.md).

## Invoke This Skill When

- User asks to "enable span streaming" or "migrate to span streaming" in a Python project
- User wants to switch from transaction-based to streamed span delivery
- User mentions `trace_lifecycle`, `sentry_sdk.traces`, or the new `start_span` API
- User wants lower latency span delivery or per-span processing

---

### Detect Environment

```bash
# Find sentry_sdk.init calls
grep -rn "sentry_sdk\.init\|sentry_sdk\.init(" --include="*.py" -l 2>/dev/null | head -20

# Find existing start_span / start_transaction / start_child usage
grep -rn "start_span\|start_transaction\|start_child" --include="*.py" -l 2>/dev/null | head -20

# Find trace decorator usage
grep -rn "@trace\|from sentry_sdk import trace\|from sentry_sdk.tracing import trace" --include="*.py" -l 2>/dev/null | head -20

# Find continue_trace usage
grep -rn "continue_trace" --include="*.py" -l 2>/dev/null | head -20

# Find before_send_transaction usage
grep -rn "before_send_transaction" --include="*.py" -l 2>/dev/null | head -20

# Find direct Span / Transaction class imports
grep -rn "from sentry_sdk.tracing import\|from sentry_sdk import.*Span\|from sentry_sdk import.*Transaction" --include="*.py" -l 2>/dev/null | head -20

# Find set_data / set_tag / set_context on spans
grep -rn "set_data\|set_tag\|set_context" --include="*.py" -l 2>/dev/null | head -20
```

### Parallelization

After detecting the environment, assess how many files need changes. If the codebase has many files to migrate (e.g. dozens of files with `start_span`, `start_transaction`, `set_data`, etc.), launch subagents to handle independent migration tasks in parallel — for example, one subagent per migration category (span creation, span data, trace propagation) or per module/package. Each subagent should receive the relevant migration rules from this skill and operate on a distinct set of files.

### Enable Span Streaming

**Prerequisites:** `sentry-sdk` `>=2.62.0` with tracing enabled (`traces_sample_rate` or `traces_sampler` configured).

Add `trace_lifecycle` to `_experiments` in `sentry_sdk.init()`:

```python
import sentry_sdk

# Before
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
)

# After
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
    _experiments={
        "trace_lifecycle": "stream",
    },
)
```

Span streaming requires using the new `sentry_sdk.traces.start_span` API. The legacy `sentry_sdk.start_span` and `sentry_sdk.start_transaction` APIs will not stream spans.

### Migrate Span Creation

#### `start_span`

Replace `sentry_sdk.start_span()` with `sentry_sdk.traces.start_span()`:

```python
import sentry_sdk

# Before
with sentry_sdk.start_span(name="flow.checkout") as span:
    ...

# After
with sentry_sdk.traces.start_span(name="flow.checkout") as span:
    ...
```

Or change the import:

```python
# Before
from sentry_sdk import start_span

# After
from sentry_sdk.traces import start_span
```

The new API accepts:
- `name` (required)
- `attributes` — key-value pairs (see Migrate Span Data below)
- `parent_span` — explicit parent span; defaults to the currently active span
- `active` — defaults to `True`; if `False`, the span won't become other spans' parent automatically

The `description` argument no longer exists — use `name` instead. The `op` argument is no longer supported — use the `sentry.op` attribute instead:

```python
# Before
with sentry_sdk.start_span(op="http.client", description="GET /api/users") as span:
    ...

# After
with sentry_sdk.traces.start_span(
    name="GET /api/users",
    attributes={"sentry.op": "http.client"},
) as span:
    ...
```

#### `start_transaction`

Replace `sentry_sdk.start_transaction()` with `sentry_sdk.traces.start_span()`:

```python
import sentry_sdk

# Before
with sentry_sdk.start_transaction(name="flow.checkout") as transaction:
    ...

# After
with sentry_sdk.traces.start_span(name="flow.checkout", parent_span=None) as span:
    ...
```

Setting `parent_span=None` forces the span to become a root span, which is the equivalent of starting a transaction in the legacy API.

#### `start_child`

`span.start_child()` no longer exists. Start a new span while the parent is active — it becomes a child automatically:

```python
import sentry_sdk

# Before
with sentry_sdk.start_span(name="outer") as parent:
    with parent.start_child(op="db", description="SELECT") as child:
        ...

# After
with sentry_sdk.traces.start_span(name="outer") as parent:
    with sentry_sdk.traces.start_span(
        name="SELECT",
        attributes={"sentry.op": "db"},
    ):
        ...
```

To control parentage explicitly (e.g. make a span a sibling rather than a child), use `parent_span`:

```python
with sentry_sdk.traces.start_span(name="outer") as span:
    with sentry_sdk.traces.start_span(name="child 1"):
        with sentry_sdk.traces.start_span(name="child 2", parent_span=span):
            # "child 2" is a sibling of "child 1", not its child
            ...
```

#### `@trace` Decorator

Replace `sentry_sdk.trace` with `sentry_sdk.traces.trace`:

```python
# Before
from sentry_sdk import trace

@trace
def checkout():
    ...

# After — just change the import
from sentry_sdk.traces import trace

@trace
def checkout():
    ...
```

The new decorator also accepts optional `name` (defaults to the function name), `attributes`, and `active` arguments:

```python
from sentry_sdk.traces import trace

@trace(name="checkout", attributes={"flow.pipeline": "legacy"})
def checkout():
    ...
```

#### `get_current_span`

Replace `sentry_sdk.get_current_span()` with `sentry_sdk.traces.get_current_span()`:

```python
# Before
from sentry_sdk import get_current_span

span = get_current_span()

# After
from sentry_sdk.traces import get_current_span

span = get_current_span()
```

#### `Span` and `Transaction` Classes

If the code imports `Span` or `Transaction` directly (e.g. for type annotations), replace both with `StreamedSpan`:

```python
# Before
from sentry_sdk.tracing import Span, Transaction

def process(span: Span) -> None:
    ...

# After
from sentry_sdk.traces import StreamedSpan

def process(span: StreamedSpan) -> None:
    ...
```

### Migrate Span Data

In span streaming mode, spans have no contexts, data, or tags. Everything is a span attribute. Attribute keys are strings; values must be `int`, `bool`, `str`, `float`, or an array of these types. `None` is not supported. Unsupported types (e.g. objects) are cast to string.

#### Replace `set_data`

```python
# Before
span.set_data("flow.step", "submit_payment")

# After
span.set_attribute("flow.step", "submit_payment")
```

#### Replace `set_tag`

```python
# Before
span.set_tag("http.status_code", 201)

# After
span.set_attribute("http.response.status_code", 201)
```

#### Replace `set_context`

Dictionaries are not supported as attribute values. Flatten them into separate attributes:

```python
# Before
span.set_context("flow", {"id": "123456789", "pipeline": "legacy"})

# After
span.set_attributes({"flow.id": "123456789", "flow.pipeline": "legacy"})
```

#### Scope-Level Tags

Tags set on the scope with `sentry_sdk.set_tag()` are not applied to streaming spans. Use `sentry_sdk.set_attribute()` to apply data to spans:

```python
import sentry_sdk

sentry_sdk.set_tag("region", "Europe")       # applied to errors and other tag-supporting telemetry
sentry_sdk.set_attribute("region", "Europe")  # applied to spans, logs, metrics
```

#### Bulk Operations

```python
with sentry_sdk.traces.start_span(name="flow.checkout") as span:
    span.set_attribute("flow.version", "0.35")
    span.set_attributes({"flow.conversion": 1.0, "flow.use_new_pipeline": True})
    span.remove_attribute("flow.conversion")
```

#### Span Status

Status can only be `ok` (default) or `error`:

```python
from sentry_sdk.traces import start_span

with start_span(name="process") as span:
    try:
        ...
    except Exception:
        span.status = "error"
```

### Migrate Trace Propagation

`sentry_sdk.traces.continue_trace()` replaces the legacy `sentry_sdk.continue_trace()`. It is no longer a context manager — it sets the propagation context, and the next span picks it up automatically:

```python
import sentry_sdk

headers = {
    "sentry-trace": "4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1",
    "baggage": "sentry-trace_id=...",
}

# Before
with sentry_sdk.continue_trace(headers) as transaction:
    ...

# After
sentry_sdk.traces.continue_trace(headers)
with sentry_sdk.traces.start_span(name="handle request"):
    ...
```

To start a completely new trace, use `sentry_sdk.traces.new_trace()`:

```python
import sentry_sdk

with sentry_sdk.traces.start_span(name="span in trace 1"):
    ...

sentry_sdk.traces.new_trace()

with sentry_sdk.traces.start_span(name="span in trace 2"):
    # This span is the root of a new, separate trace
    ...
```

### Migrate Sampling

If you use `traces_sample_rate`, no changes are needed — it works the same way.

If you use a custom `traces_sampler`, the sampling context has a different structure in streaming mode:

```python
def traces_sampler(sampling_context):
    # sampling_context["span_context"] contains:
    #   name, trace_id, parent_span_id, parent_sampled, attributes
    if sampling_context["span_context"]["name"] in IGNORED_SPAN_NAMES:
        return 0.0
    return 1.0

sentry_sdk.init(
    traces_sampler=traces_sampler,
    _experiments={"trace_lifecycle": "stream"},
)
```

The sampling decision is made when `start_span()` is called. Child spans inherit the parent's sampling decision unless filtered by `ignore_spans`.

#### Custom Sampling Context

Custom sampling context is no longer an argument to `start_span`. Set it on the scope before starting the span:

```python
import sentry_sdk

def traces_sampler(sampling_context):
    if sampling_context["asgi_scope"].method not in ("GET", "POST"):
        return 0.0
    return 1.0

# Before
with sentry_sdk.start_span(
    name="handle request",
    custom_sampling_context={"asgi_scope": asgi_scope},
):
    ...

# After
sentry_sdk.scope.Scope.set_custom_sampling_context({"asgi_scope": asgi_scope})
with sentry_sdk.traces.start_span(name="handle request"):
    ...
```

Custom sampling context must be set **after** `continue_trace` (which resets propagation context) and **before** `start_span` (which is when sampling happens).

### Configure `ignore_spans` (Optional)

`ignore_spans` filters spans at creation time. Rules can be strings, compiled regexes, or dictionaries with `name` and/or `attributes` conditions:

```python
import re
import sentry_sdk

sentry_sdk.init(
    _experiments={
        "trace_lifecycle": "stream",
        "ignore_spans": [
            # String match against span name
            "/health",

            # Regex match against span name
            re.compile(r"/flow/.*"),

            # Match by attributes (all must match)
            {
                "attributes": {
                    "service.id": "15def9a",
                    "flow.pipeline": "legacy",
                }
            },

            # Match by name and attributes
            {
                "name": re.compile(r"/flow/.*"),
                "attributes": {
                    "service.id": re.compile(r".*\.facade"),
                },
            },
        ],
    },
)
```

Only the span name and attributes set at creation time are available for matching — attributes added later in the span's lifetime are not considered.

If an ignored span is a top-level span, its entire subtree is also ignored. If a non-top-level span is ignored, its children are not automatically ignored unless they match a rule themselves.

### Migrate `before_send_transaction`

`before_send_transaction` has no effect in streaming mode. Spans are sent individually as they complete, not batched into transactions.

**Important:** In the legacy transaction-based model, `before_send_transaction` ran after the entire transaction finished, so it had access to all data set during the span's lifetime (e.g. HTTP status codes, response sizes, final results). In streaming mode, the replacements (`ignore_spans` and `before_send_span`) can only work with attributes set at span start time. Attributes added later during the span's lifetime (like `http.response.status_code`, response body size, or other late-set data) are **not available**.

**If your `before_send_transaction` logic depends on attributes not set at span start**, that filtering logic **cannot be replicated** in streaming mode and must be removed. Consider moving such filtering to a server-side mechanism (e.g. Sentry inbound data filters or Relay rules) instead.

| Use Case | Streaming Replacement |
|---|---|
| Drop spans by name/route | Use `ignore_spans` |
| Drop/filter by late-set attributes (e.g. HTTP status code) | **Cannot be replicated** — remove the logic or use server-side filtering |
| Modify span data before send | Use `before_send_span` |
| Filter by transaction name | Use `ignore_spans` with string/regex pattern |

Remove the `before_send_transaction` option from `sentry_sdk.init()` after migrating its logic.

### Configure `before_send_span` (Optional)

`before_send_span` lets you modify spans before they leave the SDK, for example to sanitize sensitive values. It receives `span` and `hint` arguments and must return a span:

```python
import sentry_sdk

def postprocess_span(span, hint):
    attributes_to_sanitize = [
        "http.request.header.custom-auth",
        "http.request.header.custom-user-id",
    ]
    for attribute in attributes_to_sanitize:
        if span["attributes"].get(attribute):
            span["attributes"][attribute] = "[Sanitized]"
    return span

sentry_sdk.init(
    _experiments={
        "trace_lifecycle": "stream",
        "before_send_span": postprocess_span,
    },
)
```

`before_send_span` cannot be used to drop spans — use `ignore_spans` for that. If the callback returns anything other than a span dictionary, the return value is ignored.

### Verification

Instruct the user to verify:

1. **Check Sentry dashboard**: Spans should appear in the Traces view shortly after they complete, without waiting for the full transaction to finish
2. **Check logs**: Ensure no SDK warnings about unsupported span operations

#### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Spans not streaming | Using legacy `sentry_sdk.start_span` | Switch to `sentry_sdk.traces.start_span` |
| `AttributeError` on `start_child` | `start_child` removed in streaming mode | Use `sentry_sdk.traces.start_span` while parent is active |
| `None` attribute value rejected | `None` not supported as attribute value | Remove the attribute or use a sentinel string |
| `set_data`/`set_tag` has no effect on span | These methods don't apply to streaming spans | Use `span.set_attribute()` |
| Scope tags missing from spans | `set_tag` not applied to streaming spans | Use `sentry_sdk.set_attribute()` |
| Custom sampling context not available in `traces_sampler` | Set after `start_span` or before `continue_trace` | Set on scope after `continue_trace` but before `start_span` |
| `before_send_transaction` not called | Expected in streaming mode | Migrate logic to `before_send_span` or `ignore_spans` |
| `before_send_transaction` logic relied on late-set attributes (e.g. status code) | These attributes aren't available at span creation time | Remove the logic or use server-side filtering (Sentry inbound filters / Relay rules) |

### Quick Reference

#### Minimal Setup

```python
import sentry_sdk

sentry_sdk.init(
    dsn="__DSN__",
    traces_sample_rate=1.0,
    _experiments={
        "trace_lifecycle": "stream",
    },
)
```

#### Creating Spans

```python
from sentry_sdk.traces import start_span

with start_span(name="my operation", attributes={"sentry.op": "task"}) as span:
    span.set_attribute("result.count", 42)
```

#### Migration Checklist

- [ ] SDK version is `>=2.62.0`
- [ ] Added `_experiments={"trace_lifecycle": "stream"}` to `sentry_sdk.init()`
- [ ] `sentry_sdk.start_span()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `sentry_sdk.start_transaction()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `span.start_child()` migrated to `sentry_sdk.traces.start_span()`
- [ ] `sentry_sdk.get_current_span()` migrated to `sentry_sdk.traces.get_current_span()`
- [ ] `@sentry_sdk.trace` migrated to `@sentry_sdk.traces.trace`
- [ ] `Span` / `Transaction` class imports replaced with `StreamedSpan`
- [ ] `description` replaced with `name`
- [ ] `op` replaced with `sentry.op` attribute
- [ ] `set_data()` / `set_tag()` / `set_context()` replaced with `set_attribute()`
- [ ] Scope-level `set_tag()` supplemented with `set_attribute()` where needed
- [ ] `continue_trace` migrated to non-context-manager `sentry_sdk.traces.continue_trace()`
- [ ] `custom_sampling_context` migrated to `Scope.set_custom_sampling_context()`
- [ ] (If using `traces_sampler`) Updated to handle new `sampling_context` shape
- [ ] `before_send_transaction` logic migrated to `before_send_span` or `ignore_spans`
- [ ] `before_send_transaction` logic that depends on late-set attributes (e.g. HTTP status code) removed or moved to server-side filtering
- [ ] `before_send_transaction` removed from config
- [ ] Spans visible in Sentry dashboard
