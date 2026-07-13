# Sentry for Codex

The Sentry plugin for Codex. It teaches Codex how to use Sentry: SDK setup
wizards for any platform, production issue debugging via the Sentry MCP server,
code review with Sentry context, and monitoring configuration.

> [!IMPORTANT]
> This repository is generated. It is built from
> [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) and
> includes every skill in that library. Do not edit files here; make changes in
> that repository and they will be rebuilt into this one.

## Install

```bash
codex plugin marketplace add getsentry/plugin-codex
codex plugin add sentry@sentry-plugin-marketplace
```

## What's included

- The full Sentry skill library (SDK setup wizards, debugging and code-review
  workflows, feature setup).
- The hosted [Sentry MCP server](https://mcp.sentry.dev) for querying your
  Sentry environment.

A few entry-point skills are always available; the rest are hidden behind them
using Codex's `agents/openai.yaml` (`policy.allow_implicit_invocation: false`)
and surface on demand, so they do not crowd the model's context.
