# Sentry Plugin for AI Coding Assistants

Official Sentry integration plugin for AI coding assistants. Query your Sentry environment in natural language, analyze issues, monitor performance, and automatically resolve bugs detected in pull requests.

Supports **Claude Code** and **Cursor**.

## Installation

### Claude Code

**From Marketplace:**

```bash
/install-plugin sentry
```

Restart Claude Code to activate, then verify:

```bash
/help           # Should show /seer command
/mcp            # Should show sentry MCP server
```

**From Local Source:**

```bash
git clone https://github.com/getsentry/sentry-for-ai.git
cd sentry-for-ai

/install-plugin file:///path/to/sentry-for-ai
```

### Cursor

**From Marketplace:**

Search for "Sentry" in Cursor Settings > Extensions and install.

**From Local Source:**

```bash
git clone https://github.com/getsentry/sentry-for-ai.git
```

Add the plugin path in Cursor Settings > Extensions > Install from path.

## Slash Commands

### `/seer <query>`

Ask questions about your Sentry environment in natural language.

```
/seer What are the top errors in the last 24 hours?
/seer Show me all critical issues in mobile-app
/seer Which issues are affecting the most users?
/seer What's the request latency for the api-gateway application?
```

## Skills

### sentry-code-review

Analyzes and fixes bugs detected by Sentry in GitHub Pull Request comments. Requires [GitHub CLI](https://cli.github.com/) (`gh auth login`).

```
Review PR #118 and fix the Sentry comments
```

### Setup Skills

| Skill | Description |
|-------|-------------|
| `sentry-ios-swift-setup` | Setup Sentry in iOS/Swift apps with error monitoring, tracing, session replay, logging, and profiling |
| `sentry-setup-ai-monitoring` | Setup Sentry AI Agent Monitoring for OpenAI, Anthropic, LangChain, etc. |
| `sentry-setup-logging` | Setup Sentry Logging for JavaScript, Python, and Ruby projects |
| `sentry-setup-metrics` | Setup Sentry Metrics (counters, gauges, distributions) |
| `sentry-setup-tracing` | Setup Sentry Tracing and Performance Monitoring |

## Configuration

The plugin automatically configures the Sentry MCP server on install. No additional setup required beyond restarting your editor.

The `sentry-code-review` skill requires GitHub CLI:

```bash
brew install gh    # macOS, or https://cli.github.com/
gh auth login
```

## Plugin Structure

```
sentry-for-ai/
├── .agents/
│   ├── commands/
│   │   └── seer.md               # /seer command
│   └── skills/
│       ├── sentry-code-review/
│       ├── sentry-ios-swift-setup/
│       ├── sentry-setup-ai-monitoring/
│       ├── sentry-setup-logging/
│       ├── sentry-setup-metrics/
│       └── sentry-setup-tracing/
├── .claude-plugin/                # Claude Code plugin metadata
│   ├── plugin.json
│   └── marketplace.json
├── .cursor-plugin/                # Cursor plugin metadata
│   ├── plugin.json
│   └── marketplace.json  -> ../.claude-plugin/marketplace.json
├── .claude/
│   └── settings.json              # Claude Code permissions
├── .mcp.json                      # MCP server config (canonical)
├── mcp.json -> .mcp.json          # MCP server config (Cursor symlink)
├── AGENTS.md                      # Agent instructions
├── CLAUDE.md -> AGENTS.md
└── assets/
    └── logo.svg
```

## License

MIT
