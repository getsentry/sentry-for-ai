# Research Playbook

How to research a Sentry SDK systematically using parallel agent tasks. This is the exact pattern that produced the Go and Svelte SDK skills.

## Principles

1. **Never write skills from memory** — always research current docs first
2. **Write to files, not inline** — research is 500–1200 lines per topic; keep it out of your context
3. **Parallel where possible** — batch independent research tasks
4. **Verify the output** — check line counts, look for real headings, re-run failures
5. **Source-verify critical APIs** — after research, verify key API names against GitHub source

## Research File Location

Store all research in a persistent directory the workers can access later:

```
~/.pi/history/<project>/research/<sdk>-<topic>.md
```

Examples:
```
~/.pi/history/sentry-agent-skills/research/go-setup-config.md
~/.pi/history/sentry-agent-skills/research/go-error-monitoring.md
~/.pi/history/sentry-agent-skills/research/svelte-setup-errors.md
```

## Prompt Templates

### Batch 1: Setup & Configuration

```
Research the Sentry <Platform> SDK setup and configuration. Visit these pages
and extract ALL technical details:

1. https://docs.sentry.io/platforms/<platform>/ — main setup page
2. https://docs.sentry.io/platforms/<platform>/configuration/ — configuration
3. https://docs.sentry.io/platforms/<platform>/configuration/options/ — init options

Document:
- Installation command (package manager)
- Init function full configuration with ALL options
- Options struct/object fields with types and defaults
- Environment variables the SDK reads
- Framework integrations — how to detect and configure each
- Flush/shutdown patterns
- Debug mode
- Release/environment detection

Include exact code examples. Accuracy matters more than brevity.
```

### Batch 2: Error Monitoring

```
Research Sentry <Platform> SDK error monitoring capabilities. Visit:

1. https://docs.sentry.io/platforms/<platform>/usage/
2. https://docs.sentry.io/platforms/<platform>/enriching-events/
3. https://docs.sentry.io/platforms/<platform>/enriching-events/context/
4. https://docs.sentry.io/platforms/<platform>/enriching-events/tags/
5. https://docs.sentry.io/platforms/<platform>/enriching-events/breadcrumbs/
6. https://docs.sentry.io/platforms/<platform>/enriching-events/scopes/

Document:
- Capture APIs (captureException, captureMessage, etc.)
- Panic/exception recovery patterns
- Hub and Scope management
- Context enrichment: tags, user, breadcrumbs, extra data
- Error wrapping / error chains
- BeforeSend hooks for filtering/modifying events
- Fingerprinting and custom grouping

Include real code examples from the docs.
```

### Batch 3: Tracing + Profiling

```
Research Sentry <Platform> SDK tracing AND profiling. Visit:

1. https://docs.sentry.io/platforms/<platform>/tracing/
2. https://docs.sentry.io/platforms/<platform>/tracing/instrumentation/
3. https://docs.sentry.io/platforms/<platform>/tracing/instrumentation/custom-instrumentation/
4. https://docs.sentry.io/platforms/<platform>/distributed-tracing/
5. https://docs.sentry.io/platforms/<platform>/profiling/

For tracing: sample rates, custom spans, framework middleware, distributed tracing,
operation types, dynamic sampling.

For profiling: sample rate config, how it attaches to traces, limitations,
or if profiling was removed/is not available.

Include exact code examples.
```

### Batch 4: Logging + Metrics + Crons

```
Research Sentry <Platform> SDK logging, metrics, AND crons. Visit:

1. https://docs.sentry.io/platforms/<platform>/logs/
2. https://docs.sentry.io/platforms/<platform>/metrics/
3. https://docs.sentry.io/platforms/<platform>/crons/

For logging: enable flag, logger API, integration with popular <platform>
logging libraries, log filtering.

For metrics: counters, gauges, distributions, sets, units, attributes.
Note if metrics are GA, beta, or experimental.

For crons: check-in API, monitor config, schedule types, heartbeat patterns.

If any feature is NOT available for <platform>, explicitly note that.
Include exact code examples.
```

### Batch 5: Frontend-Specific (Session Replay + AI Monitoring)

```
Research Sentry <Platform> SDK session replay and AI monitoring. Visit:

1. https://docs.sentry.io/platforms/<platform>/session-replay/
2. https://docs.sentry.io/platforms/<platform>/session-replay/configuration/
3. https://docs.sentry.io/platforms/<platform>/session-replay/privacy/
4. https://docs.sentry.io/platforms/<platform>/guides/ai-monitoring/ (if exists)

For session replay: integration setup, sample rates, privacy masking,
network capture, canvas recording, lazy loading.

For AI monitoring: supported AI SDKs, auto vs manual instrumentation,
token tracking, prompt capture (PII considerations).

If either feature is NOT available, explicitly note that.
```

## Execution Pattern

```python
# Pseudocode for the research phase

# 1. Determine batches based on SDK type
batches = [
    ("setup-config", batch_1_prompt),
    ("error-monitoring", batch_2_prompt),
    ("tracing-profiling", batch_3_prompt),
    ("logging-metrics-crons", batch_4_prompt),
]
if is_frontend_sdk:
    batches.append(("replay-ai", batch_5_prompt))

# 2. Run all batches in parallel
for topic, prompt in batches:
    claude(
        prompt=prompt.format(platform=platform),
        outputFile=f"~/.pi/history/{project}/research/{sdk}-{topic}.md"
    )

# 3. Verify outputs
for topic, _ in batches:
    file = f"~/.pi/history/{project}/research/{sdk}-{topic}.md"
    lines = count_lines(file)
    if lines < 100:
        print(f"WARNING: {file} only has {lines} lines — re-run")

# 4. Re-run any failures
```

## Verification Research

After workers create the skill files, run one final verification:

```
Verify these specific API names and signatures against the <SDK> GitHub repo
(<repo-url>). For each, state whether it EXISTS or NOT, the correct API if
different, and the source URL:

1. <API from skill file>
2. <Config option from skill file>
3. <Integration name from skill file>
...
```

### What To Verify

| Category | Examples to check |
|----------|------------------|
| Init options | Field names, types, casing (SendDefaultPII vs SendDefaultPii) |
| Feature flags | EnableLogs, EnableTracing — do they exist? |
| Config keys | experimental.tracing, ignoreSpans — real or fabricated? |
| Deprecated APIs | configureScope → getIsolationScope |
| Removed features | Profiling in Go SDK (removed v0.31.0) |
| Minimum versions | Cross-reference changelog for when features were added |

## Common Research Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| File has 0 lines | Claude Code failed silently | Re-run the task |
| File has <100 lines | Partial failure, only process notes captured | Re-run with simpler prompt |
| APIs don't match source | Research hallucinated or used old docs | Run verification against GitHub |
| Missing framework support | Research didn't visit framework-specific pages | Add framework URLs to prompt |
| Wrong minimum versions | Docs page was out of date | Check SDK changelog on GitHub |
