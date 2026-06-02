# Event Catalog Template

Use this template before instrumenting code. Define ownership, levels, required
attributes, and sampling per operation.

## Catalog Record

```text
Operation:
Runtime:
Boundary owner:
Primary event(s):
Why this event exists:

Outcomes:
- Success event name + level:
- Partial/degraded event name + level:
- Failure event name + level:

Required attributes (always):
- service
- environment
- version
- region
- commit_hash

Domain attributes (operation-specific):
- user_id / org_id / project_id
- route or procedure name
- entity ids (order.id, payment.id, deploy.id)
- job_id (for async/background operations)
- result/status keys
- error keys (error.type, error.code) when relevant

Tracing/timing policy:
- do_not_log_trace_fields: true
- do_not_log_timing_fields: true

Identity handling:
- set_user_boundary:
- set_user_id_source:
- set_user_payload: id only
- clear_user_when:
- app_user_scope_attrs (for example account.plan_tier, account.role):

Sampling policy:
- success:
- warn/degraded:
- error/fatal:

Alert/search intent:
- Primary query filters (message/event name + attributes):
- Alert trigger conditions:

Sensitive-data notes:
- set_user_fields_allowed: id only
- allowed_app_user_scope_attrs:
- Fields to mask/omit:

Owner/team:
Verification notes:
```

## Naming Guidance

- Prefer stable `snake_case` event names.
- Name the domain action and outcome (`payment_capture_failed`).
- Avoid vague names like `request_complete` without domain context.
- Keep event names durable across refactors.

## Attribute Guidance

- Keep attributes flat and scalar.
- Use consistent key namespaces (`order.id`, `payment.provider`,
  `result.status`, `error.type`).
- Include IDs responders actually pivot on.
- Do not place custom attributes under reserved prefixes.

## Minimal Example

```text
Operation: POST /checkout
Runtime: server
Boundary owner: checkout route handler
Primary event(s): checkout_completed, checkout_failed
Why this event exists: explain conversion failures and provider outages

Outcomes:
- Success event name + level: checkout_completed (info)
- Partial/degraded event name + level: checkout_fallback_applied (warn)
- Failure event name + level: checkout_failed (error)

Required attributes (always):
- service=web
- environment=prod
- version=2026.05.18
- region=us-east-1
- commit_hash=abc1234

Domain attributes (operation-specific):
- org_id
- user_id
- project_id
- order.id
- payment.provider
- retry_count
- error.type (failure only)
- result.status
- route.name

Identity handling:
- set_user_boundary: route handler after auth
- set_user_id_source: session.user.id
- set_user_payload: id only
- clear_user_when: unauthenticated path/logout
- app_user_scope_attrs: account.plan_tier, account.role

Tracing/timing policy:
- do_not_log_trace_fields: true
- do_not_log_timing_fields: true

Sampling policy:
- success: 1%
- warn/degraded: 100%
- error/fatal: 100%

Alert/search intent:
- Primary query filters: message (event name), org_id, payment.provider, error.type
- Alert trigger conditions: checkout_failed rate spike by provider
```
