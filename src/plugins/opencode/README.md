# Sentry for OpenCode V1

The Sentry skill bundle for [OpenCode V1](https://opencode.ai/docs/). It teaches
OpenCode how to set up Sentry, debug production issues through the Sentry MCP server,
and configure monitoring features.

This is an installer-managed skill and MCP bundle, not an OpenCode runtime plugin.
Installation uses OpenCode’s global skill discovery and MCP configuration surfaces
separately.

> [!IMPORTANT]
> This repository is generated.
> It is built from [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai)
> and includes every skill in that library.
> Do not edit files here; make changes in that repository and they will be rebuilt into
> this one.

## Install

```bash
git clone https://github.com/getsentry/plugin-opencode.git ~/.config/opencode/skills/sentry
opencode mcp add sentry --url 'https://mcp.sentry.dev/mcp?utm_source=plugin'
```

Restart OpenCode after installation.
The first Sentry MCP operation starts browser OAuth.
You can also authenticate explicitly:

```bash
opencode mcp auth sentry
```

The generated root `opencode.json` makes this checkout directly runnable and shows the
V1 MCP shape. The commands above merge Sentry into your global config instead of
replacing any existing settings.

## What’s included

- The full hydrated Sentry skill library for SDK setup, debugging workflows, and feature
  configuration.
- A native V1 remote MCP configuration for [mcp.sentry.dev](https://mcp.sentry.dev).

OpenCode V1 ignores `disable-model-invocation`, so it advertises all bundled skills.
Skill bodies still load on demand through OpenCode’s `skill` tool.

## Update or remove

```bash
git -C ~/.config/opencode/skills/sentry pull
rm -rf ~/.config/opencode/skills/sentry
```

OpenCode V1 has no MCP remove command.
To remove Sentry completely, also delete the `mcp.sentry` entry from
`~/.config/opencode/opencode.json` or `~/.config/opencode/opencode.jsonc`.

OpenCode V1 and the OpenCode V2 beta currently write incompatible MCP shapes to the same
global config file.
Do not configure both versions in that file at the same time; use the
V2 bundle when `opencode2` is your active CLI.
