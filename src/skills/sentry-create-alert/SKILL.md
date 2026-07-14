---
name: sentry-create-alert
description: Create Sentry alerts using the workflow engine API. Use when asked to create alerts, set up notifications, configure issue priority alerts, or build workflow automations. Supports email, Slack, PagerDuty, Discord, and other notification actions.
license: Apache-2.0
---

# Create Sentry Alert

Create alerts via Sentry's workflow engine API.

**Note:** This API is currently in **beta** and may be subject to change. It is part of New Monitors and Alerts and may not be viewable in the legacy Alerts UI.

## Invoke This Skill When

- User asks to "create a Sentry alert" or "set up notifications"
- User wants to be emailed or notified when issues match certain conditions
- User mentions priority alerts, de-escalation alerts, or workflow automations
- User wants to configure Slack, PagerDuty, or email notifications for Sentry issues

## Prerequisites

- `curl` available in shell
- Sentry org auth token with `alerts:write` scope (also accepts `org:admin` or `org:write`)

## Phase 1: Gather Configuration

Ask the user for any missing details:

| Detail | Required | Example |
|--------|----------|---------|
| Org slug | Yes | `sentry`, `my-org` |
| Auth token | Yes | `sntryu_...` (needs `alerts:write` scope) |
| Region | Yes (default: `us`) | `us` → `us.sentry.io`, `de` → `de.sentry.io` |
| Alert name | Yes | `"High Priority De-escalation Alert"` |
| Trigger events | Yes | Which issue events fire the workflow |
| Conditions | Optional | Filter conditions before actions execute |
| Action type | Yes | `email`, `slack`, or `pagerduty` |
| Action target | Yes | User email, team, channel, or service |

## Phase 2: Look Up IDs

Use these API calls to resolve names to IDs as needed.

```bash
API="https://{region}.sentry.io/api/0/organizations/{org}"
AUTH="Authorization: Bearer {token}"

# Find user ID by email
curl -s "$API/members/" -H "$AUTH" | python3 -c "
import json,sys
for m in json.load(sys.stdin):
  if m.get('email')=='USER_EMAIL' or m.get('user',{}).get('email')=='USER_EMAIL':
    print(m['user']['id']); break"

# List teams
curl -s "$API/teams/" -H "$AUTH" | python3 -c "
import json,sys
for t in json.load(sys.stdin):
  print(t['id'], t['slug'])"

# List integrations (for Slack/PagerDuty)
curl -s "$API/integrations/" -H "$AUTH" | python3 -c "
import json,sys
for i in json.load(sys.stdin):
  print(i['id'], i['provider']['key'], i['name'])"
```

## Phase 3: Build Payload

### Trigger Events

Pick which issue events fire the workflow. Use `logicType: "any-short"` (triggers must always use this).

| Type | Fires when |
|------|-----------|
| `first_seen_event` | New issue created |
| `regression_event` | Resolved issue recurs |
| `reappeared_event` | Archived issue reappears |
| `issue_resolved_trigger` | Issue is resolved |

### Filter Conditions

Conditions that must pass before actions execute. Use `logicType: "all"`, `"any-short"`, or `"none"`.

**The `comparison` field is polymorphic** — its shape depends on the condition `type`:

| Type | `comparison` format | Description |
|------|---------------------|-------------|
| `issue_priority_greater_or_equal` | `75` (bare integer) | Priority >= Low(25)/Medium(50)/High(75) |
| `issue_priority_deescalating` | `true` (bare boolean) | Priority dropped below peak |
| `event_frequency_count` | `{"value": 100, "interval": "1hr"}` | Event count in time window |
| `event_unique_user_frequency_count` | `{"value": 50, "interval": "1hr"}` | Affected users in time window |
| `tagged_event` | `{"key": "level", "match": "eq", "value": "error"}` | Event tag matches |
| `assigned_to` | `{"targetType": "Member", "targetIdentifier": 123}` | Issue assigned to target |
| `level` | `{"level": 40, "match": "gte"}` | Event level (fatal=50, error=40, warning=30) |
| `age_comparison` | `{"time": "hour", "value": 24, "comparisonType": "older"}` | Issue age |
| `issue_category` | `{"value": 1}` | Category (1=Error, 6=Feedback) |
| `issue_occurrences` | `{"value": 100}` | Total occurrence count |

**Interval options:** `"1min"`, `"5min"`, `"15min"`, `"1hr"`, `"1d"`, `"1w"`, `"30d"`

**Tag match types:** `"co"` (contains), `"nc"` (not contains), `"eq"`, `"ne"`, `"sw"` (starts with), `"ew"` (ends with), `"is"` (set), `"ns"` (not set)

Set `conditionResult` to `false` to invert (fire when condition is NOT met).

### Actions

| Type | Key Config |
|------|-----------|
| `email` | `config.targetType`: `"user"` / `"team"` / `"issue_owners"`, `config.targetIdentifier`: `<id>` |
| `slack` | `integrationId`: `<id>`, `config.targetDisplay`: `"#channel-name"` |
| `pagerduty` | `integrationId`: `<id>`, `config.targetDisplay`: `<service_name>`, `data.priority`: `"critical"` |
| `discord` | `integrationId`: `<id>`, `data.tags`: tag list |
| `msteams` | `integrationId`: `<id>`, `config.targetDisplay`: `<channel>` |
| `opsgenie` | `integrationId`: `<id>`, `data.priority`: `"P1"`-`"P5"` |
| `jira` | `integrationId`: `<id>`, `data`: project/issue config |
| `github` | `integrationId`: `<id>`, `data`: repo/issue config |

### Full Payload Structure

```json
{
  "name": "<Alert Name>",
  "enabled": true,
  "environment": null,
  "config": { "frequency": 30 },
  "triggers": {
    "logicType": "any-short",
    "conditions": [
      { "type": "first_seen_event", "comparison": true, "conditionResult": true }
    ],
    "actions": []
  },
  "actionFilters": [{
    "logicType": "all",
    "conditions": [
      { "type": "issue_priority_greater_or_equal", "comparison": 75, "conditionResult": true },
      { "type": "event_frequency_count", "comparison": {"value": 50, "interval": "1hr"}, "conditionResult": true }
    ],
    "actions": [{
      "type": "email",
      "integrationId": null,
      "data": {},
      "config": {
        "targetType": "user",
        "targetIdentifier": "<user_id>",
        "targetDisplay": null
      },
      "status": "active"
    }]
  }]
}
```

`frequency`: minutes between repeated notifications. Allowed values: `0`, `5`, `10`, `30`, `60`, `180`, `720`, `1440`.

**Structure note:** `triggers.actions` is always `[]` — actions live inside `actionFilters[].actions`.

## Phase 4: Create the Alert

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://{region}.sentry.io/api/0/organizations/{org}/workflows/" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{payload}'
```

Expect HTTP `201`. The response contains the workflow `id`.

## Phase 5: Verify

Confirm the alert was created and provide the UI link:

```
https://{org_slug}.sentry.io/monitors/alerts/{workflow_id}/
```

If the org lacks the `workflow-engine-ui` feature flag, the alert appears at:

```
https://{org_slug}.sentry.io/alerts/rules/
```

## Managing Alerts

```bash
# List all workflows
curl -s "$API/workflows/" -H "$AUTH"

# Get one workflow
curl -s "$API/workflows/{id}/" -H "$AUTH"

# Update a workflow
curl -s -X PUT "$API/workflows/{id}/" -H "$AUTH" -H "Content-Type: application/json" -d '{payload}'

# Delete a workflow
curl -s -X DELETE "$API/workflows/{id}/" -H "$AUTH"
# Expect 204
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token needs `alerts:write` scope |
| 403 Forbidden | Token must belong to the target org |
| 404 Not Found | Check org slug and region (`us` vs `de`) |
| 400 Bad Request | Validate payload JSON structure, check required fields |
| User ID not found | Verify email matches a member of the org |
