# @sentry/ai

Install the [Sentry plugin](https://github.com/getsentry/sentry-for-ai) into your AI coding assistants.

The plugin teaches your assistant Sentry — how to set it up in any project, how to find and fix production issues, and how to configure alerts, AI monitoring, and more. This package detects which assistants you have installed and wires the plugin into each one for you.

Supports **Claude Code**, **Codex**, **Cursor**, and **Grok**.

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
npx @sentry/ai install                  # interactive — pick which agents to set up
npx @sentry/ai install --no-interactive # install into every detected agent
```

The non-interactive mode is intended for CI and unattended runs.

## What it installs

For each detected assistant, the installer runs that tool's native plugin command:

| Assistant   | How it's installed                                                            |
| ----------- | ----------------------------------------------------------------------------- |
| Claude Code | `claude plugin install sentry` from the official plugin marketplace           |
| Codex       | `codex plugin add sentry` from the Sentry plugin marketplace                  |
| Cursor      | Clones [`getsentry/plugin-cursor`](https://github.com/getsentry/plugin-cursor) into `~/.cursor/plugins/local/sentry` |
| Grok        | `grok plugin install getsentry/plugin-grok`                                   |

Each per-agent plugin is built and published from the [`sentry-for-ai`](https://github.com/getsentry/sentry-for-ai) repository, which is the source of truth for all skills.

## Removing the plugin

```bash
npx @sentry/ai remove                  # interactive — pick which agents to remove from
npx @sentry/ai remove --no-interactive # remove from every agent that has it
```

`uninstall` is an alias for `remove`. This only offers agents that currently have the plugin, and removes the Sentry plugin itself — each tool's plugin marketplace is left registered. Restart your AI tools afterward to drop the plugin.

## Requirements

- Node.js 18 or newer
- The assistant CLI you want to set up must already be installed and on your `PATH`
- `git` is required for the Cursor install

## License

MIT
