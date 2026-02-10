# Sentry Claude Code Plugin

Official Sentry integration plugin for Claude Code. Query your Sentry environment in natural language, analyze issues, monitor performance, and automatically resolve bugs detected in pull requests.

## Installation

### From Claude Marketplace

```bash
/plugin marketplace update claude-plugins-official
/plugin install sentry
```

Restart Claude Code to activate the plugin, then verify:

```bash
/help           # Should show /seer and /getIssues commands
/mcp            # Should show sentry MCP server
```

### From Local Source

```bash
git clone https://github.com/getsentry/sentry-for-claude.git
cd sentry-for-claude

/plugin marketplace add /path/to/sentry-for-claude
/plugin install sentry@local
```

## Slash Commands

### `/seer <query>`

Ask questions about your Sentry environment in natural language.

```
/seer What are the top errors in the last 24 hours?
/seer Show me all critical issues in mobile-app
/seer Which issues are affecting the most users?
/seer What's the request latency for the api-gateway application?
```

### `/getIssues [project]`

Fetch the 10 most recent issues from Sentry.

```
/getIssues                  # All projects
/getIssues my-project       # Specific project
```

## Sub-Agents

### issue-summarizer

Analyzes multiple Sentry issues in parallel. Invoked automatically when you ask Claude to analyze or summarize issues across a project.

```
Can you analyze the recent issues in my-project and summarize the user impact?
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

The plugin automatically configures the Sentry MCP server on install. No additional setup required beyond restarting Claude Code.

The `sentry-code-review` skill requires GitHub CLI:

```bash
brew install gh    # macOS, or https://cli.github.com/
gh auth login
```

## Plugin Structure

```
sentry-for-claude/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Marketplace listing
├── .claude/
│   └── settings.json         # Claude Code settings
├── .mcp.json                 # MCP server configuration
├── AGENTS.md                 # Agent instructions
├── commands/
│   ├── seer.md               # /seer command
│   └── getIssues.md          # /getIssues command
├── agents/
│   └── issue-summarizer.md   # Issue analysis agent
└── skills/
    ├── sentry-code-review/
    ├── sentry-ios-swift-setup/
    ├── sentry-setup-ai-monitoring/
    ├── sentry-setup-logging/
    ├── sentry-setup-metrics/
    └── sentry-setup-tracing/
```

## License

MIT
