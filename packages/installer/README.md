# @sentry/ai

Install the [Sentry plugin](https://github.com/getsentry/sentry-for-ai) into your AI coding assistants.

The plugin teaches your assistant Sentry — how to set it up in any project, how to find and fix production issues, and how to configure alerts, AI monitoring, and more. This package detects which assistants you have installed and wires the plugin into each one for you.

Supports **Claude Code**, **Codex**, **Cursor**, **Grok**, **OpenCode V1**, and **OpenCode V2**.

```bash
npx @sentry/ai install
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/demo-dark.gif">
  <img src="assets/demo-light.gif" alt="Installing the Sentry plugin with npx @sentry/ai install">
</picture>

This detects the AI coding tools on your machine, lets you choose which ones to set up, and installs the Sentry plugin into each. Already have it installed? The same command updates it to the latest version.

Restart your AI tools afterward to load the plugin.

## Options

```bash
npx @sentry/ai install                         # interactive — pick which agents to set up
npx @sentry/ai install "Setup logging"         # copy a custom prompt after installation
npx @sentry/ai install --no-interactive        # install into every detected agent
```

When an instruction follows `install`, the installer offers to copy a prompt such as `The Sentry plugin has just been installed. Setup logging` after installation. Without an instruction, it offers the default get-started prompt. The non-interactive mode is intended for CI and unattended runs and skips this prompt.

## What it installs

For each detected assistant, the installer uses its native package command or installs the generated skill bundle:

| Assistant   | How it's installed                                                            |
| ----------- | ----------------------------------------------------------------------------- |
| Claude Code | `claude plugin install sentry` from the official plugin marketplace           |
| Codex       | `codex plugin add sentry` from the Sentry plugin marketplace                  |
| Cursor      | Clones [`getsentry/plugin-cursor`](https://github.com/getsentry/plugin-cursor) into `~/.cursor/plugins/local/sentry` |
| Grok        | `grok plugin install getsentry/plugin-grok`                                   |
| OpenCode V1 | Clones [`getsentry/plugin-opencode`](https://github.com/getsentry/plugin-opencode) into OpenCode's global skills and adds the V1 Sentry MCP entry |
| OpenCode V2 | Clones [`getsentry/plugin-opencode2`](https://github.com/getsentry/plugin-opencode2) into OpenCode's global skills and adds the V2 Sentry MCP entry |

Each per-agent distribution is built and published from the [`sentry-for-ai`](https://github.com/getsentry/sentry-for-ai) repository, which is the source of truth for all skills.

## Removing the plugin

```bash
npx @sentry/ai remove                  # interactive — pick which agents to remove from
npx @sentry/ai remove --no-interactive # remove from every agent that has it
```

`uninstall` is an alias for `remove`. This only offers agents that currently have the plugin, and removes the Sentry plugin itself — each tool's plugin marketplace is left registered. OpenCode's CLIs do not provide an MCP remove command, so the installer identifies the config entry to delete manually. Restart your AI tools afterward to drop the plugin.

## Requirements

- Node.js 18 or newer
- The assistant CLI you want to set up must already be installed and on your `PATH`
- `git` is required for the Cursor and OpenCode installs

OpenCode V1 and the OpenCode V2 beta use the same global config path but incompatible MCP shapes. When both `opencode` and `opencode2` are installed, the installer configures V2 only.

## License

MIT
