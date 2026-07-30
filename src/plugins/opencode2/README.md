# Sentry for OpenCode V2

The Sentry skill bundle for the
[OpenCode V2 beta](https://opencode.ai/v2/docs/). It teaches OpenCode how to
set up Sentry, debug production issues through the Sentry MCP server, and
configure monitoring features.

> [!IMPORTANT]
> This repository is generated. It is built from
> [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) and
> includes every skill in that library. Do not edit files here; make changes in
> that repository and they will be rebuilt into this one.

## Install

```bash
git clone https://github.com/getsentry/plugin-opencode2.git ~/.config/opencode/skills/sentry
opencode2 mcp add sentry --global --url 'https://mcp.sentry.dev/mcp?utm_source=plugin'
```

Restart OpenCode after installation. The first Sentry MCP operation starts
browser OAuth. You can also authenticate explicitly:

```bash
opencode2 mcp auth sentry
```

The generated root `opencode.json` makes this checkout directly runnable and
shows the V2 MCP shape. The commands above merge Sentry into your global config
instead of replacing any existing settings.

## What's included

- The full hydrated Sentry skill library for SDK setup, debugging workflows,
  and feature configuration.
- A native V2 remote MCP configuration for
  [mcp.sentry.dev](https://mcp.sentry.dev).

Routed leaf skills use `metadata.opencode/autoinvoke: "false"`, so V2 omits
them from model-facing discovery while keeping them available for explicit
loading. Router and standalone skills remain advertised.

## Update or remove

```bash
git -C ~/.config/opencode/skills/sentry pull
rm -rf ~/.config/opencode/skills/sentry
```

The V2 beta has no MCP remove command. To remove Sentry completely, also delete
the `mcp.servers.sentry` entry from `~/.config/opencode/opencode.json` or
`~/.config/opencode/opencode.jsonc`.

OpenCode V1 and the OpenCode V2 beta currently write incompatible MCP shapes to
the same global config file. Do not configure both versions in that file at the
same time; this bundle is for the `opencode2` CLI.
