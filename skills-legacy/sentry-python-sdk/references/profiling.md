# Profiling — Sentry Python SDK

> Minimum SDK: `sentry-sdk` 1.18.0+ (transaction-based); 2.24.1+ (continuous / session-based)

## Configuration

| Option | API | Min SDK | Purpose |
|--------|-----|---------|---------|
| `profiles_sample_rate` | Transaction-based (legacy) | 1.18.0 | Fraction of transactions to profile; relative to `traces_sample_rate` |
| `profile_session_sample_rate` | Continuous (new) | 2.24.1 | Fraction of sessions to profile; evaluated once per process start |
| `profile_lifecycle` | Continuous (new) | 2.24.1 | `"trace"` = SDK auto-manages; `"manual"` = explicit start/stop |

Profiling requires `traces_sample_rate > 0` (or `traces_sampler`) to be set.

## API Comparison

| | `profiles_sample_rate` (transaction-based) | `profile_session_sample_rate` (continuous) |
|--|---------------------------------------------|---------------------------------------------|
| **Min SDK** | 1.18.0 | 2.24.1 |
| **Evaluated** | Per transaction | Once per process/deployment start |
| **Max duration** | 30 seconds per transaction | Unlimited |
| **Requires** | `traces_sample_rate` | `profile_lifecycle` + `traces_sample_rate` |
| **Use when** | Simple setup, short-lived transactions | Long-running apps, background services |

## Code Examples

### Transaction-based profiling (simple / legacy)

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,   # relative to traces_sample_rate
    # e.g. profiles_sample_rate=0.5 → profiles 50% of sampled transactions
)
```

Profiles start when the transaction starts and stop when it ends or after **30 seconds**, whichever is first.

### Continuous profiling — auto-managed (`profile_lifecycle="trace"`)

SDK automatically starts and stops the profiler around active spans.

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    traces_sample_rate=1.0,
    profile_session_sample_rate=1.0,   # evaluated once at process start
    profile_lifecycle="trace",          # SDK manages start/stop automatically
)
```

### Continuous profiling — manual control (`profile_lifecycle="manual"`)

Full programmatic control over profiler lifetime.

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    traces_sample_rate=1.0,
    profile_session_sample_rate=1.0,
    profile_lifecycle="manual",
)

# Application startup
sentry_sdk.profiler.start_profiler()

# ... application runs ...

# Application shutdown
sentry_sdk.profiler.stop_profiler()
```

### Production-recommended setup (continuous)

```python
import sentry_sdk
import signal

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    environment="production",
    release="my-app@2.0.0",
    traces_sample_rate=0.1,             # sample 10% of transactions
    profile_session_sample_rate=1.0,    # profile all sampled sessions
    profile_lifecycle="trace",
)
```

## Best Practices

- Use continuous profiling (`profile_session_sample_rate` + `profile_lifecycle`) for long-running services and production workloads
- Use transaction-based (`profiles_sample_rate`) for simple setups or short-lived scripts
- `profile_session_sample_rate` is evaluated **once at process start** — changing it requires a restart
- `"trace"` and `"manual"` profile lifecycles are mutually exclusive; do not mix them
- Reduce `traces_sample_rate` in production (e.g., `0.1`) — profiling overhead is low but not zero
- Python's GIL means the profiler captures the thread holding the GIL; async I/O wait time appears as near-zero CPU — this is expected

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No profiles appearing | Verify `traces_sample_rate > 0` and profiling options are set correctly |
| Profiles cut off at 30s | Switch to continuous profiling (`profile_session_sample_rate`) |
| `profile_session_sample_rate` has no effect | Check SDK version is ≥ 2.24.1; ensure `profile_lifecycle` is also set |
| Profiler not stopping | In `"manual"` mode, call `sentry_sdk.profiler.stop_profiler()` on shutdown |
| Async functions show no CPU time | Expected — Python profiler only captures GIL-holding time, not async I/O wait |
