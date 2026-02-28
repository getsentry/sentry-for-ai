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

### SDK Skills (Full Platform Bundles)

Comprehensive setup wizards that scan your project, recommend features, and guide through full SDK installation.

| Skill | Platforms |
|-------|-----------|
| `sentry-cocoa-sdk` | iOS, macOS, tvOS, watchOS, visionOS (Swift, UIKit, SwiftUI) |
| `sentry-dotnet-sdk` | ASP.NET Core, MAUI, WPF, WinForms, Azure Functions, Blazor, gRPC |
| `sentry-go-sdk` | Go (net/http, Gin, Echo, Fiber) |
| `sentry-nextjs-sdk` | Next.js App Router + Pages Router, Vercel |
| `sentry-python-sdk` | Python (Django, Flask, FastAPI, Celery, Starlette, AIOHTTP) |
| `sentry-react-native-sdk` | React Native, Expo managed/bare |
| `sentry-react-sdk` | React 16+, React Router v5-v7, TanStack Router, Redux |
| `sentry-ruby-sdk` | Ruby, Rails, Sinatra, Rack, Sidekiq |
| `sentry-svelte-sdk` | Svelte, SvelteKit |

### Setup Skills

| Skill | Description |
|-------|-------------|
| `sentry-setup-ai-monitoring` | Setup Sentry AI Agent Monitoring for OpenAI, Anthropic, LangChain, etc. |
| `sentry-otel-exporter-setup` | Setup OTel Collector with Sentry Exporter |

### Workflow Skills

| Skill | Description |
|-------|-------------|
| `sentry-code-review` | Analyze and fix bugs detected by Sentry in GitHub PR comments |
| `sentry-pr-code-review` | Review PRs for issues detected by Seer Bug Prediction |
| `sentry-fix-issues` | Find and fix Sentry issues using MCP |
| `sentry-create-alert` | Create Sentry alerts using the workflow engine API |

### Authoring Skills

| Skill | Description |
|-------|-------------|
| `sentry-sdk-skill-creator` | Create a complete SDK skill bundle for any new platform |

## Configuration

The plugin automatically configures the Sentry MCP server on install. No additional setup required beyond restarting your editor.

Workflow skills (`sentry-code-review`, `sentry-pr-code-review`) require GitHub CLI:

```bash
brew install gh    # macOS, or https://cli.github.com/
gh auth login
```

## Plugin Structure

```
sentry-for-ai/
├── commands/
│   └── seer.md                         # /seer slash command
├── skills/
│   ├── sentry-code-review/             # Workflow: Sentry bot PR review
│   ├── sentry-pr-code-review/          # Workflow: Seer Bug Prediction review
│   ├── sentry-fix-issues/              # Workflow: Fix Sentry issues via MCP
│   ├── sentry-create-alert/            # Workflow: Create alerts via API
│   ├── sentry-cocoa-sdk/               # SDK: Apple platforms
│   ├── sentry-dotnet-sdk/              # SDK: .NET
│   ├── sentry-go-sdk/                  # SDK: Go
│   ├── sentry-nextjs-sdk/              # SDK: Next.js
│   ├── sentry-python-sdk/              # SDK: Python
│   ├── sentry-react-native-sdk/        # SDK: React Native / Expo
│   ├── sentry-react-sdk/               # SDK: React
│   ├── sentry-ruby-sdk/                # SDK: Ruby / Rails
│   ├── sentry-svelte-sdk/              # SDK: Svelte / SvelteKit
│   ├── sentry-setup-ai-monitoring/     # Setup: AI agent monitoring
│   ├── sentry-otel-exporter-setup/     # Setup: OTel Collector
│   └── sentry-sdk-skill-creator/       # Authoring: Create new SDK skills
├── .agents/                            # Symlinks to commands/ and skills/
├── .claude-plugin/                     # Claude Code plugin metadata
│   ├── plugin.json
│   └── marketplace.json
├── .cursor-plugin/                     # Cursor plugin metadata
│   ├── plugin.json
│   └── marketplace.json
├── .mcp.json                           # MCP server config (Claude Code)
├── mcp.json                            # MCP server config (Cursor)
├── AGENTS.md                           # Agent instructions
├── CLAUDE.md -> AGENTS.md
└── assets/
    └── logo.svg
```

## License

MIT
