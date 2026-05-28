---
name: sentry-logs-migration-javascript
description: Migrate TypeScript/JavaScript console.* or existing logger calls to Sentry-captured structured logs. Use when moving console output, pino, winston, consola, or custom logger calls to Sentry Logs with flow mapping, scope placement, wide events, redaction, and ESLint audit.
license: Apache-2.0
category: workflow
parent: sentry-workflow
disable-model-invocation: true
compatibility: >-
  JavaScript-platform Sentry SDK 9.41.0+ for Logs; 10.32.0+ for
  scope.setAttributes on logs; browser Logs require NPM SDK, not loader/CDN.
---

> [All Skills](../../SKILL_TREE.md) > [Workflow](../sentry-workflow/SKILL.md) > JavaScript Logs Migration

# Console and Existing Loggers to Sentry Logs

## Use

Use for JS/TS apps using `@sentry/nextjs`, `@sentry/node`, `@sentry/react`,
`@sentry/vue`, or `@sentry/browser`. For SDK installation, framework init files,
runtime boundaries, or package wiring, use the platform SDK skill first.

Docs: [JavaScript Logs](https://docs.sentry.io/platforms/javascript/logs/),
[Tracing](https://docs.sentry.io/platforms/javascript/tracing/)

Reference files:

- [Execution-flow mapping and router examples](references/execution-flow-mapping.md):
  read during Phase 0/2 for router, boundary, service-layer, and scope examples.
- [Local ESLint plugin for Sentry structured logs](references/eslint-plugin-sentry-structured-logs.md):
  read only when implementing or enforcing structured-log lint rules.

Assets:

- [Sentry structured logs ESLint plugin](assets/eslint/sentry-structured-logs-plugin.mjs):
  copy when adding the local ESLint plugin.

## Non-negotiables

- One-shot the requested scope: inventory, map, migrate, enforce lint, rerun
  audits, verify. Stop after a pilot only if asked for pilot/audit/plan-only.
- Confirm installed SDK versions support Logs/scope APIs; set
  `enableLogs: true`.
- Prefer tracing for correlation; avoid bespoke `request_id` schemes.
- Do not add timing, duration, or latency log attributes; traces/spans own
  timing data. Replace useful existing timing log fields with span attributes or
  custom spans instead of dropping the signal.
- Preserve existing production logger libraries such as `pino`, `winston`, or
  `consola`. Do not replace them with `Sentry.logger`; keep their call syntax
  and configure the appropriate Sentry integration/transport so their structured
  logs are captured.
- Map flow/boundaries before edits. Migrate by operation, route, job, command,
  or user action, not by statement.
- Prefer one wide log per operation: reusable context on scope attributes,
  one-event facts as inline log attributes.
- Only modify logging-related code: logger calls, Sentry log/scope attributes,
  redaction, temporary bridges, and scoped lint rules. Do not touch styling,
  unrelated refactors, or pre-existing bugs.
- Log attributes must be inline object literals. Build reusable context on
  Sentry scopes, not in mutable `logAttributes` objects.
- Scope and log attributes are flat scalar (`string | number | boolean`) dotted
  keys; never set `sentry.*`, `browser.*`, `server.*`, or `user.*`.
- Use `beforeSendLog` for production drops/redaction. Never log raw tokens,
  passwords, cookies, authorization headers, or secrets.
- Bridges are temporary only for call sites being moved away from `console.*` or
  deprecated wrappers. Keep durable integrations/transports for retained logger
  libraries.
- Enforce zero remaining `console.*` in governed app/shared code with ESLint.
  Scope intentional CLI/server output as documented overrides.
- Governed code means production app/shared JS/TS across browser, server, edge,
  workers, jobs, and shared clients. Exclude generated/vendor/build artifacts
  and narrowly documented CLI/user-facing terminal output.

## Phase 0: Boundary Map

Before inventory decisions or edits, map how each operation enters and moves
through the app. The file containing a log line is not the whole operation.

1. Identify runtime/router shape: package/framework config, routes, server
   entrypoints, queues, CLIs, SPA routes.
2. Trace each target log up to the durable boundary: route/action/loader/API
   handler, middleware/auth wrapper, job, scheduled task, command, or browser
   action.
3. Trace down to services/clients/repositories/helpers. Record boundary context,
   deeper facts, and completion/failure observation points.
4. Separate browser, server, edge, server-action, and worker surfaces; scopes do
   not cross runtimes automatically.

Deliver a compact boundary map with operation, runtime, entrypoint/router,
boundary, downstream path, global/isolation/nested scope, wide event, and
leaf-log actions. Use the execution-flow reference for examples.

## Phase 1: Inventory

Use ESLint as both inventory and completion audit. If `no-console` and
structured-log rules are missing, add the local plugin before the first full
inventory unless the user asked for audit-only/no-edits. Prefer the repo lint
command when it covers governed JS/TS; otherwise run:

```bash
npx eslint . --ext .js,.jsx,.ts,.tsx,.mjs,.cjs,.mts,.cts -f json --max-warnings=0
```

Search separately for `pino`, `winston`, `consola`, and custom wrappers because
`no-console` misses them. For each hit, record path, line, operation, method,
message summary, logger family, Sentry capture path, and target action:

- `delete`
- `move_to_scope`
- `move_to_capture_scope`
- `move_to_span`
- `flatten_to_attrs`
- `merge_into_wide`
- `keep`

Group hits into operation bundles before deciding what to emit. Deliver counts
by file/rule/action.

Inventory timing fields separately: `duration`, `duration_ms`, `elapsed`,
`elapsed_ms`, `latency`, `latency_ms`, `start_time`, `end_time`,
`execution_time_ms`, and similar names. Classify useful timing signals as
`move_to_span`, not as log attributes.

For existing logger libraries, inventory does not mean replacement. Confirm the
logger is captured by Sentry (`pinoIntegration`, Winston transport, Consola
reporter, or a maintained wrapper), then apply the same operation, scope,
wide-event, level, redaction, and lint rules to the retained logger calls.

## Phase 2: Boundary Map

Before each bundle, update the map only if scope placement or wide-event
ownership changes. Decide what belongs on scope, inline attributes, spans,
capture scope, or deletion.

## Attribute Placement

When Sentry captures a log or error, active scope data is merged into the event.

- Global scope: app-wide constants set at startup, such as `service`, release,
  runtime, or deployment environment.
- Isolation scope: request/process/page/job context, such as route, procedure,
  job name, tenant/org id, user tier, and `Sentry.setUser(...)`.
- Current scope: narrow branch, dependency, or single-operation context created
  with `Sentry.withScope((scope) => { ... })`.
- Inline log attributes: facts specific to that one emitted log, such as
  `result.status`, `order.id`, `retry_count`, or `error.kind`.

Prefer top-level `Sentry.setXXX(...)` helpers or
`Sentry.getIsolationScope().setAttributes(...)` for request/page/job context. In
browsers, isolation scope is effectively global, so use it only for stable
page/user context and prefer `withScope` for action-only context. Avoid
`Sentry.getCurrentScope()` for new context; use `withScope` when context should
apply only inside a callback.

## Timing Data and Span Migration

When an existing log records timing, remove the timing attribute from the log
and preserve the performance signal in tracing. Confirm tracing is configured
before adding custom spans.

- If the code already runs inside the operation span, add useful numeric facts
  to the active span with `Sentry.getActiveSpan()?.setAttribute(...)` or
  `setAttributes(...)`.
- If the code manually measures a distinct operation with `Date.now()`,
  `performance.now()`, or similar start/end variables, replace that measurement
  with `Sentry.startSpan(...)` around the operation.
- If callback-style instrumentation cannot fit the code shape, use
  `Sentry.startSpanManual(...)` or `Sentry.startInactiveSpan(...)` deliberately
  and end the span exactly once.
- Do not migrate timing fields to `Sentry.setMeasurement()`; use span attributes
  instead.

Retained logger libraries follow the same rule: keep the native logger call for
the operation outcome, but move `duration_ms`, `latency_ms`, and similar fields
to the span.

Example:

```javascript
const order = await Sentry.startSpan(
  { name: "Charge card", op: "payment.charge" },
  () => chargeCard(cart),
);

logger.info(
  { "order.id": order.id, "result.status": "completed" }, // no duration_ms
  "Checkout completed",
);
```

## Wide-Event Ownership

Choose exactly one owner for each operation result:

- Route/action/job boundary: `info` success/empty wide event, `error` failure
  wide event.
- Shared SDK/client wrapper: dependency facts only when the boundary will not
  capture them; success is `debug`/delete, failure logs only if not upstream.
- Render/component/helper: return facts, set narrow scope, or throw; do not emit
  success logs.

Do not emit both dependency and boundary success logs for the same normal path
unless both are independently searched or alerted.

Expected outcomes such as empty search results, missing CMS pages/products, and
unsupported webhook topics are not warnings unless they need operational
attention.

## Phase 3: Classify

Classify each log relative to its operation bundle:

- broad context -> `move_to_scope`
- console/error log next to `Sentry.captureException(err)` ->
  `move_to_capture_scope`
- timing, duration, latency, or elapsed fields -> `move_to_span`
- useful JSON/object payload -> `flatten_to_attrs` unless sensitive, too large,
  high-cardinality, or better owned by scope/span
- larger-operation step -> `merge_into_wide` by moving reusable context to scope
  or preserving a local value for the final inline log attributes
- independently searchable signal -> `keep`
- security-sensitive -> strip via `beforeSendLog`
- otherwise/noise -> `delete` or `trace`/`debug` if valuable and dropped in prod

Shared-service success logs default to `debug` and production drop. Promote to
`info` only for business/operational outcomes worth querying.

For large codebases, migrate high-impact paths first: auth, checkout, billing,
data export, user-visible failures, then background jobs and leaf UI.

## Phase 4: Convert

Message is required; structured data must be an inline object literal in the
logger's native structured-argument position. For `Sentry.logger`, structured
data is the second argument. For `pino`, structured data is usually the first
argument and the message is second. Do not mechanically replace
`console.log("x")` with `Sentry.logger.info("x")`, and do not mechanically
replace `pino.info(...)` or `winston.info(...)` with `Sentry.logger.info(...)`.
Design the operation event:

1. Move broad route/job/user context onto scope.
2. Use `withScope` for branch/dependency context inherited by only part of the
   operation.
3. Move timing and duration facts into spans or span attributes.
4. Emit one final completion/failure log with inline flat attributes.
5. Keep separate warn/error logs only when they are standalone signals.

Existing object payloads usually become flattened dotted attributes, not
deletions. Keep scalar facts that explain the operation, and drop/redact
sensitive, bulky, unstable, or unbounded fields.

Object payload migration:

```javascript
// Before
console.log("Order created", {
  order: { id: order.id, total: order.total },
  result: { status: "created" },
});

// After
Sentry.logger.info("Order created", {
  "order.id": order.id,
  "order.total": order.total,
  "result.status": "created",
});
```

For retained loggers, use the same flattened attributes in native arg order.

### Duplicate-Failure Guard

A failure path emits at most one log event per operation/dependency failure. Let
the catch block be the single failure logger, or log before throwing only when
no later catch logs it. Wrap/rethrow with extra data and preserve facts for the
boundary failure log's scope or inline attributes. Trace every `throw` after a
logger `error(...)` call, whether it uses `Sentry.logger`, `pino`, `winston`, or
another retained logger.

### CaptureException Precedence

When a catch block has `console.*(err)` next to `Sentry.captureException(err)`,
prefer `captureException` as the single Sentry event for real exceptions. It
preserves stack traces and issue grouping. Do not add a `Sentry.logger.error`
with the same error/context immediately before or after `captureException`.

Move useful context from the old console call onto the capture scope:

```javascript
try {
  await chargeCard(cart);
} catch (err) {
  Sentry.withScope((scope) => {
    scope.setAttributes({ "order.id": orderId, "payment.provider": "stripe" });
    Sentry.captureException(err);
  });
}
```

Use `Sentry.logger.error(...)` instead of `captureException` only for handled
non-exception operational failures, or in addition to `captureException` only
when the log is an independent searchable signal not represented by the
exception event. If this catch rethrows and an upstream boundary captures the
exception, do not add a duplicate error log here.

Scope/log attribute naming:

- quote dotted keys (`{ "order.id": order.id }`)
- use `snake_case` leaves and predictable prefixes (`order.*`, `cart.*`,
  `feature.*`, `http.*`, `error.*`)
- avoid camelCase, vague keys, nested objects, arrays, and reserved prefixes
- use `Sentry.logger.fmt` only when interpolated message values should become
  searchable `sentry.message.*` attributes

## Phase 5: Transitional Bridges

End state for `console.*`: migrated call sites use `Sentry.logger` directly or
are deleted/kept only as intentional user-facing terminal output. End state for
existing production logger libraries: call sites keep the existing logger and
emit structured, Sentry-captured logs with the same scope, wide-event, level,
and redaction policy. Use bridges only for a temporary transition, and tune
levels to avoid ingesting everything.

- `console`: `Sentry.consoleLoggingIntegration({ levels: [...] })` (SDK 10.13.0+
  for multi-arg parsing)
- Consola: `Sentry.createConsolaReporter()` (SDK 10.12.0+)
- Pino: `Sentry.pinoIntegration()` (SDK 10.18.0+)
- Winston: `Sentry.createSentryWinstonTransport(Transport, { levels: ... })`
  (SDK 9.13.0+)

Treat retained logger integrations/transports as durable Sentry capture paths,
not temporary bridges. Remove only temporary console shims, duplicate wrappers,
or compatibility bridges once their call sites have been migrated.

## Phase 6: Filter and Redact

Use `beforeSendLog` to drop noisy prod levels and remove sensitive attributes.
Return `null` to drop a log; confirm installed-SDK semantics. Verify with fake
sensitive fixture values in non-prod Sentry: allowed business keys remain,
unexpected PII does not.

## Phase 7: ESLint Completion Loop

Unless asked for audit-only/no-edits, keep ESLint policy enabled while
migrating. Ask only before installing packages, broad lint changes outside
governed JS/TS, or unrelated rule changes.

1. Add the plugin and `no-console` for all governed app/shared JS/TS files.
2. Run ESLint with `--max-warnings=0`; every `no-console` violation and
   structured-log warning/error is remaining inventory.
3. Do not scope `no-console` only to already-migrated files to keep CI green.
4. Do not add temporary disables or broad overrides for app/shared code.
5. Migrate/delete until ESLint has zero `console.*` failures and zero
   structured-log warnings/errors in governed code.
6. Use overrides only for intentional CLI/user-facing output; keep them narrow
   and commented.

Use `no-console` plus structured-log rules as CI truth. Keep local scripts
aligned with CI. The local plugin covers logger call message text, inline
attribute shape, reserved prefixes, and sensitive keys; scope attributes need
the same review/redaction policy. Configure the structured-log rules to cover
retained logger identifiers/objects such as `logger`, `appLogger`, `pinoLogger`,
or `winstonLogger` so non-console libraries are audited instead of ignored. For
`pino` or other attrs-first APIs, set the plugin's
`attributesFirstLoggerIdentifiers`/`attributesFirstLoggerObjects` options rather
than rewriting the library calls into `Sentry.logger` syntax.

Final checks: ESLint passes governed code with no broad disables; legacy logger
searches have zero unhandled findings; SDK version, `enableLogs`, tracing,
scopes, and `beforeSendLog` are verified per runtime. Existing loggers remain in
place with durable capture paths. JSON payloads are flattened or intentionally
moved to scope/span; timing fields become spans/span attributes; adjacent
`captureException` paths do not duplicate `Sentry.logger.error`; samples verify
trace correlation, expected attributes, redaction, and no PII/secrets.
