---
name: sentry-setup-logs-javascript
description: Configure JavaScript/TypeScript Sentry Logs after basic SDK setup. Use when adding or improving operation-boundary logs for debugging and operations with structured attributes, event catalogs, sampling, and sensitive data controls.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
compatibility: >-
  JavaScript-platform Sentry SDK 9.41.0+ for Logs; 10.32.0+ recommended for
  scope.setAttributes on logs. Browser Logs require NPM SDK, not loader/CDN.
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > JavaScript Logs

# Structured Sentry Logs Instrumentation (JavaScript/TypeScript)

## Use

Use for JS/TS apps already sending Sentry Logs that need high-signal, queryable,
operation-level instrumentation.

Docs: [JavaScript Logs](https://docs.sentry.io/platforms/javascript/logs/),
[Tracing](https://docs.sentry.io/platforms/javascript/tracing/)

## Non-negotiables

- Complete the requested scope end-to-end unless the user explicitly asks for
  plan-only or audit-only: map operations, implement structured logs, validate,
  then summarize.
- Default to one boundary-owned wide event per operation outcome (success,
  degraded, or failure). Avoid scattered success logs.
- Log decisions and surprises at operation boundaries; avoid routine internal
  step narration.
- Use structured attributes with business and environment context (`user_id`,
  `org_id`, `project_id`, `service`, `version`, `environment`, `region`,
  `commit_hash`).
- Follow Phase 2 identity policy for `Sentry.setUser` and app user metadata.
- Follow Phase 2 trace/timing policy: keep trace/span/timing out of log
  payloads. Replace useful existing timing log fields with span attributes or
  custom spans instead of dropping the signal.
- Use levels intentionally (`debug`, `info`, `warn`, `error`, `fatal`) and keep
  failure coverage unsampled.
- Keep logs safe: never emit secrets, auth material, or unnecessary PII.
- Prefer metrics for trend/count questions; use logs for event explanation.
- Enforce formatting/lint policy for all emitted logger calls.
- Modify only logging-related code in this workflow unless user asks broader
  refactors.

## Structured Log Formatting Rules

Every `Sentry.logger.*(...)` call must follow:

1. Required stable message/event string as first argument.
2. Optional inline attribute object as second argument.
3. Dot-notation attribute keys with `snake_case` segments (`order.id`,
   `result.status`, `error.type`).
4. Flat scalar values only (`string | number | boolean`).
5. No nested objects, arrays, spread props, or computed keys.
6. No custom reserved prefixes (`sentry.*`, `browser.*`, `server.*`, `user.*`).
7. No sensitive keys (`password`, `token`, `authorization`, `cookie`, `secret`,
   API key material).

When existing logs contain useful JSON/object payloads, flatten selected scalar
facts into dotted attributes. Drop or redact sensitive, bulky, unstable, or
unbounded fields.

```javascript
Sentry.logger.info("Order created", {
  "order.id": order.id,
  "order.total": order.total,
  "result.status": "created",
});
```

Reserved-prefix checks apply to custom attributes, not to `Sentry.setUser`.

Lint enforcement in touched logging scope (ESLint):

- Copy/configure the local plugin (docs: `../sentry-logs-migration-javascript/references/eslint-plugin-sentry-structured-logs.md`, asset: `../sentry-logs-migration-javascript/assets/eslint/sentry-structured-logs-plugin.mjs`).
- `sentry-structured-logs/require-message-and-flat-attrs`
- `sentry-structured-logs/no-reserved-attr-keys`
- `sentry-structured-logs/no-sensitive-attr-keys`

Rollout default: keep `require-message-and-flat-attrs` at `warn` initially, then
promote to `error` when conventions stabilize.

## Phase 0: Operation and Decision Map

Before editing, map operations and where decisions/surprises happen.

1. Pick high-impact flows first (auth, checkout, billing, permissions, export,
   background processing, customer-facing failures).
2. For each flow, capture:
   - operation boundary (route handler, action, job processor, command)
   - identity boundary (where user ID first becomes known and where to clear it)
   - key decision points (allow/deny, retry/give-up, fallback chosen)
   - surprise conditions (unexpected empty result, degraded dependency)
   - completion outcomes (success/partial/failure)
   - existing timing fields that should become span instrumentation
3. Ensure logs answer: what happened, to whom, why, and outcome.

Deliver a compact operation map before adding logs.

## Phase 1: Event Catalog Design

Design events before writing code. Prefer stable, searchable message names, for
example `payment_capture_failed` or `deploy_started`.

Reference:

- [Event catalog template](references/event-catalog-template.md)

For each operation, define:

- event name(s)
- owner boundary
- level per outcome
- required attributes
- sampling policy
- alert/search intent
- wide-event owner (single boundary event per operation outcome)

Attribute conventions:

- dotted key namespaces for domain grouping (`order.id`, `payment.provider`)
- stable IDs for entity pivots (`user_id`, `org_id`, `project_id`, `job_id`)
- consistent key names across runtimes for reliable querying

## Phase 2: Context Placement

Set reusable context on scope before leaf logs emit.

- Global scope: stable app context (service, version, runtime, environment,
  region, commit hash).
- Isolation scope: page/job context (route/procedure, tenant/org/user, job IDs).
- `withScope`: temporary branch/dependency context for one operation segment.
- Inline log attributes: facts unique to one emitted event.

Identity placement rules:

- At the first authenticated boundary, set `Sentry.setUser({ id })`; on
  anonymous or cleared paths, call `Sentry.setUser(null)`.
- Never include additional `setUser` properties (no email, username, ip_address,
  or arbitrary key/value pairs).
- Put app-specific user metadata on scope attributes (`account.plan_tier`,
  `account.role`, `account.segment`), not `user.*`.
- Do not set user context in shared helpers; boundary code owns user identity.

Tracing owns correlation and timing. Do not add trace/span/timing fields to log
payloads for that purpose. When timing information already exists in logs, move
it into tracing rather than deleting the signal.

Timing migration rules:

- If an active span already represents the operation, add useful metrics with
  `Sentry.getActiveSpan()?.setAttribute(...)` or `setAttributes(...)`.
- If existing code manually measures an operation with `Date.now()`,
  `performance.now()`, or start/end variables, replace that measurement with
  `Sentry.startSpan(...)` around the operation.
- If callback-style instrumentation cannot fit the code shape, use
  `Sentry.startSpanManual(...)` or `Sentry.startInactiveSpan(...)` deliberately
  and end the span exactly once.
- Do not use deprecated `Sentry.setMeasurement()` for new migrations; use span
  attributes.

Before:

```javascript
const startedAt = performance.now();
const result = await exportReport({ format });

Sentry.logger.info("report_export_completed", {
  report_id: result.reportId,
  "result.status": "completed",
  duration_ms: performance.now() - startedAt,
});
```

After:

```javascript
const result = await Sentry.startSpan(
  { name: "Export report", op: "report.export" },
  () => exportReport({ format }),
);

Sentry.logger.info("report_export_completed", {
  "report.id": result.reportId,
  "result.status": "completed",
});
```

## Phase 3: Boundary Instrumentation

Add high-signal logs at operation boundaries and decision points:

- Use a middleware/wrapper pattern where possible: boundary infrastructure owns
  base context + wide-event emission, handlers add business context.
- Emit one wide completion/failure event at the boundary, then add separate
  warn/error events only for independent signals.

- request/job start and completion (including slow/partial outcomes)
- external API failure/retry/give-up
- queue consumed/failed/dead-lettered
- auth/permission deny decisions
- explicit state transitions (`payment_authorized`, `sync_completed`)
- degraded fallback chosen (`search_fallback_cache`)

Avoid routine internal-step narration such as function entry, loop counters, and
parse confirmations unless temporarily debugging.

## Phase 4: Levels and Sampling

Apply level policy intentionally:

- `debug`: temporary/deep diagnostics, usually disabled or dropped in prod
- `info`: durable business/system milestones worth querying
- `warn`: unusual but handled situations requiring attention
- `error`: failed operations needing investigation
- `fatal`: process or operation cannot continue safely

Sampling defaults:

- 100% failures (`error`/`fatal`)
- 100% `warn` until noise is characterized, then tune carefully
- sampled high-volume success paths (for example 1%)

Do not sample away critical failure evidence.

## Phase 5: Sensitive Data Controls

Before rollout, enforce data safety:

1. Remove or mask secrets, auth artifacts, and unnecessary PII.
2. Add `beforeSendLog` filtering/redaction for centralized protection.
3. Verify with fixture values in non-production:
   - allowed business attributes remain
   - blocked keys/values are absent
   - no credentials/session material appears in emitted logs

## Phase 6: Validation and Review Loop

Use this checklist for each operation after instrumentation:

```text
Task Progress:
- [ ] Select operation boundaries
- [ ] Define event catalog (name, owner, level, attrs, sampling)
- [ ] Set scope context before event emission
- [ ] Add boundary decision/surprise logs (no internal-step narration)
- [ ] Keep one boundary-owned wide completion/failure event
- [ ] Enforce formatting: required message, dot-notation keys, snake_case segments
- [ ] Keep logger attrs inline, flat, and scalar (no spread/computed/nested values)
- [ ] Flatten useful JSON/object payloads
- [ ] Follow Phase 2 identity policy (`setUser` + app user metadata placement)
- [ ] Follow Phase 2 trace/timing policy (replace useful timing log fields with spans)
- [ ] Apply level and sampling policy
- [ ] Add redaction/drop logic for sensitive data
- [ ] Validate logs answer what happened, to whom, and why
- [ ] Verify query filters for org/user/project/job/event
- [ ] Confirm failures are unsampled and complete
- [ ] Capture follow-up metric/span/alert tasks
```

Before adding or keeping a log, ask:

- "When this fires 10,000 times, will I still want it?"
- "Can I filter it by useful fields?"
- "Would this be better as a span, metric, or error event?"

Finalize with a concise summary: operations instrumented, event names/owners,
required attributes, sampling policy, redaction safeguards, and follow-up
metric/span/alert tasks.
