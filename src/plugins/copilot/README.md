# Sentry Plugin for GitHub Copilot

Set up Sentry, debug production issues, and configure application monitoring with GitHub
Copilot CLI and GitHub Copilot in VS Code.

> [!IMPORTANT]
> This repository is generated from
> [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai).
> Make changes in that source repository; its builds publish this distribution.

## Install

### GitHub Copilot CLI

```bash
copilot plugin marketplace add getsentry/plugin-copilot
copilot plugin install sentry@sentry-copilot-marketplace
```

Run `copilot plugin list` to check the installation.
To update:

```bash
copilot plugin marketplace update sentry-copilot-marketplace
copilot plugin update sentry@sentry-copilot-marketplace
```

See the
[Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

### GitHub Copilot in VS Code

Add the marketplace in VS Code settings:

```json
{
  "chat.plugins.marketplaces": ["getsentry/plugin-copilot"]
}
```

Open the Extensions view, search for `@agentPlugins`, and install **sentry** from
**sentry-copilot-marketplace**.

Enable plugin support with `chat.plugins.enabled`. VS Code also discovers plugins
installed through Copilot CLI.

See
[Agent plugins in VS Code](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

## What’s included

- The full Sentry skill library, with shared references bundled into each skill.
- The hosted [Sentry MCP server](https://mcp.sentry.dev), configured with Streamable
  HTTP transport. Authenticate with Sentry when prompted by your client.

The package follows [Agent Plugins 1.0](https://agent-plugins.org/specification).
