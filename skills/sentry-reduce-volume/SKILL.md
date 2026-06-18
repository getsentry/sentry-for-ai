---
name: sentry-reduce-volume
description: Reduce Sentry event volume and manage quota. Use when a user is exceeding quota or wants to cut noise — via sampling, inbound filters, and spike protection.
license: Apache-2.0
category: improve-setup
parent: sentry-improve-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Improve My Setup](../sentry-improve-setup/SKILL.md) > Reduce Volume / Quota

# Reduce Volume & Manage Quota

> **Stub — flesh out.**

## What this covers

Cutting event/span volume so you stay within quota and reduce noise.

## Levers

- **In code (agent-doable):** lower `tracesSampleRate` or use a `tracesSampler` to down-sample hot
  paths; filter unwanted errors in `beforeSend`; tune which errors are captured.
- **Server-side (UI):** inbound data filters (browser extensions, known bots, legacy browsers,
  specific error messages), rate limits per key, and spike protection. Agent explains + links.

## Best practices

- Sample spans aggressively, errors less so — errors are usually what you can't afford to miss.
- Identify the top noisy issues first (via the MCP / `/seer`) and filter those specifically.

## Verify

Compare event volume before/after; confirm the noisy sources are filtered.
