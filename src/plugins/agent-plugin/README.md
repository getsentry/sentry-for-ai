# Sentry Agent Plugin

The portable Sentry plugin conforming to the
[Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification).
It teaches compatible clients how to set up Sentry, debug production issues, and
configure application monitoring.

> [!IMPORTANT]
> This repository is generated.
> It is built from [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai)
> and includes every skill in that library.
> Do not edit files here; make changes in that repository and they will be rebuilt into
> this one.

## Install

Install `getsentry/agent-plugin` using an
[Agent Plugins-compatible client](https://agent-plugins.org/compatible-clients).

## What’s included

- The full, hydrated Sentry skill library as standard Agent Skills.
- The hosted [Sentry MCP server](https://mcp.sentry.dev) configured with the standard
  Streamable HTTP transport.
