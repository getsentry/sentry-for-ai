# Sentry for Claude Code

The Sentry plugin for Claude Code. It teaches Claude how to use Sentry: SDK
setup wizards for any platform, production issue debugging via the Sentry MCP
server, code review with Sentry context, and monitoring configuration.

> [!IMPORTANT]
> This repository is generated. It is built from
> [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) and
> includes every skill in that library. Do not edit files here; make changes in
> that repository and they will be rebuilt into this one.

## Install

Inside Claude Code, run:

```
/plugins install sentry@claude-plugins-official
```

Or from your terminal:

```bash
claude plugin install sentry@claude-plugins-official
```

## What's included

- The full Sentry skill library (SDK setup wizards, debugging and code-review
  workflows, feature setup).
- The hosted [Sentry MCP server](https://mcp.sentry.dev) for querying your
  Sentry environment.

A few router skills are always available; the rest are hidden behind them with
`disable-model-invocation` and load on demand, so they do not crowd the model's
context.
