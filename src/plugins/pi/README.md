# Sentry for Pi

The Sentry package for [Pi](https://pi.dev).
It teaches Pi how to use Sentry: SDK setup for supported platforms, production issue
debugging through the Sentry MCP server, and monitoring configuration.

> [!IMPORTANT]
> This repository is generated.
> It is built from [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai)
> and includes every skill in that library.
> Do not edit files here; make changes in that repository and they will be rebuilt into
> this one.

## Install

```bash
pi install git:github.com/getsentry/plugin-pi
```

Restart Pi after installation.
The first Sentry MCP operation starts browser OAuth; if you need to authenticate
explicitly, run:

```text
/sentry-mcp-auth sentry
```

## What’s included

- The full Sentry skill library for SDK setup, debugging workflows, and feature
  configuration.
- A Pi extension that connects to the hosted [Sentry MCP server](https://mcp.sentry.dev)
  through `pi-mcp-adapter`. It can coexist with a separately installed copy of the
  adapter; package-private commands use the `/sentry-mcp*` namespace.

Pi honors `disable-model-invocation`, so only the router and standalone skills are
advertised initially.
Routed leaf skills load on demand instead of crowding the model’s context.
The MCP extension follows the same approach: one `sentry_mcp` gateway discovers and
calls Sentry operations on demand, so the full MCP tool catalog does not crowd the
model’s context.

## Update or remove

```bash
pi update git:github.com/getsentry/plugin-pi
pi remove git:github.com/getsentry/plugin-pi
```
