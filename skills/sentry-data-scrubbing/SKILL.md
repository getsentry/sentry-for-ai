---
name: sentry-data-scrubbing
description: Improve data scrubbing and PII handling in Sentry. Use when a user wants to avoid sending personal or sensitive data, configure beforeSend filtering, or tune server-side scrubbing rules.
license: Apache-2.0
category: improve-setup
parent: sentry-improve-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Improve My Setup](../sentry-improve-setup/SKILL.md) > Data Scrubbing / PII

# Data Scrubbing & PII

> **Stub — flesh out.**

## What this covers

Controlling what personal or sensitive data reaches Sentry — a common compliance requirement.

## Two layers

- **In code (agent-doable):** `sendDefaultPii` (off = don't attach request/user PII by default),
  and `beforeSend` / `beforeSendTransaction` hooks to strip or redact fields before sending.
- **Server-side (UI):** Sentry's data scrubbing rules and sensitive-field settings scrub on
  ingest. The agent can explain and link these; configuration is in project settings.

## Best practices

- Decide what's sensitive (tokens, emails, request bodies, headers) and scrub at the earliest
  layer.
- Pair with `sentry-logging` PII guidance — logs are an easy place to leak data.

## Verify

Trigger an event and confirm the sensitive fields are absent/redacted in the event detail.
