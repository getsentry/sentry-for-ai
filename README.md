# Sentry for AI

Your AI coding assistant already knows how to write code. This plugin teaches it Sentry — how to set it up, how to find and fix production issues, and how to get the most out of every feature.

Whether you're adding Sentry to a new project, debugging a spike in errors, or configuring alerts, just ask. The plugin gives your assistant the context it needs to do it right.

Supports **Claude Code** and **Cursor**.

## What You Can Do

**Set up Sentry in any project** — SDK setup wizards that detect your stack, recommend the right features, and walk through the full installation. No copy-pasting from docs.

```
Add Sentry to my Next.js app
Set up Sentry in my Rails project
Add error monitoring to my iOS app
```

**Find and fix production issues** — Query your Sentry environment, triage errors, and fix them in place.

```
/seer What are the top errors in the last 24 hours?
/seer Which issues are affecting the most users?
Fix the recent Sentry errors
```

**Review code with Sentry context** — Automatically resolve bugs that Sentry or Seer flag in pull request comments.

```
Review PR #118 and fix the Sentry comments
```

**Configure monitoring** — Set up alerts, instrument AI/LLM calls, connect OpenTelemetry pipelines.

```
Create a Slack alert for new high-priority issues
Monitor my OpenAI calls with Sentry
Set up OTel Collector with Sentry exporter
```

## Installation

### Claude Code

```bash
claude plugin install sentry
```

Restart Claude Code to activate, then verify:

```bash
/help           # Should show /seer command
/mcp            # Should show sentry MCP server
```

### Cursor

Search for **Sentry** in Cursor Settings > Extensions and install.

### From Source

```bash
git clone https://github.com/getsentry/sentry-for-ai.git

# Claude Code
claude plugin install file:///path/to/sentry-for-ai

# Cursor
# Add the plugin path in Cursor Settings > Extensions > Install from path
```

## Installing Skills Without the Plugin

If you want to install individual Sentry skills directly into your project without the full plugin, use [dotagents](https://dotagents.sentry.dev):

### Quick Start

1. **Initialize dotagents in your project:**

```bash
npx @sentry/dotagents init
```

This creates an `agents.toml` file and `.agents/skills/` directory.

2. **Add Sentry skills:**

```bash
# Install all Sentry skills
npx @sentry/dotagents add getsentry/sentry-for-ai --all

# Or install specific skills
npx @sentry/dotagents add getsentry/sentry-for-ai --skill sentry-nextjs-sdk
npx @sentry/dotagents add getsentry/sentry-for-ai --skill sentry-python-sdk
npx @sentry/dotagents add getsentry/sentry-for-ai --skill sentry-fix-issues
```

3. **Install dependencies:**

```bash
npx @sentry/dotagents install
```

### Dotagents Commands

| Command | Description |
|---------|-------------|
| `init` | Create `agents.toml` and `.agents/skills/` directory |
| `add <source>` | Add a skill dependency |
| `install` | Install all skills from `agents.toml` |
| `update [name]` | Update skills to latest versions |
| `list` | Show installed skills and status |
| `remove <name>` | Remove a skill |

Dotagents works with **Claude Code, Cursor, Codex, VS Code, and OpenCode** from a single `agents.toml` configuration file. Learn more at [dotagents.sentry.dev](https://dotagents.sentry.dev).

## Skills

### SDK Setup Wizards

Full platform bundles that scan your project, recommend features, and guide you through setup — error monitoring, tracing, profiling, session replay, logging, and more.

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

### Feature Setup

| Skill | Description |
|-------|-------------|
| `sentry-setup-ai-monitoring` | Instrument OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI |
| `sentry-otel-exporter-setup` | Configure OTel Collector with Sentry Exporter for multi-project routing |

### Workflow

| Skill | Description |
|-------|-------------|
| `sentry-code-review` | Fix bugs detected by Sentry in GitHub PR comments |
| `sentry-pr-code-review` | Resolve issues flagged by Seer Bug Prediction |
| `sentry-fix-issues` | Find and fix Sentry issues using MCP |
| `sentry-create-alert` | Create alerts using the Sentry workflow engine API |

### Slash Commands

| Command | Description |
|---------|-------------|
| `/seer <query>` | Ask questions about your Sentry environment in natural language |

## Prerequisites

The plugin configures the [Sentry MCP server](https://mcp.sentry.dev) automatically on install. No extra setup needed.

Some workflow skills require the [GitHub CLI](https://cli.github.com/):

```bash
brew install gh    # macOS
gh auth login
```

## Contributing

Skills follow the [Agent Skills specification](https://agentskills.io). Each skill is a directory with a `SKILL.md` file containing YAML frontmatter and markdown instructions. SDK bundles include a `references/` directory for feature-specific deep dives.

Use the `sentry-sdk-skill-creator` skill to scaffold new SDK bundles — it handles research, writing, and validation.

## License

MIT
