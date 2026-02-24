# Agent Instructions

## Project Overview
Sentry plugin for AI coding assistants (Claude Code, Cursor). Provides MCP server integration, slash commands, and skills.

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: (the agent model's name and attribution byline)
```

## Plugin Structure
```
.agents/                # Shared skills and commands
  commands/             #   Slash commands (/seer)
  skills/               #   Setup and review skills
.claude-plugin/         # Claude Code plugin metadata
.cursor-plugin/         # Cursor plugin metadata
```

Skills use YAML frontmatter with `allowed-tools` — this is required by Cursor and harmless in Claude Code. Keep it in all skill files.

## Skills

### Sentry Code Review
Analyze and resolve Sentry bot comments on GitHub PRs. See `.agents/skills/sentry-code-review/SKILL.md`

### Sentry Setup Skills
- **AI Monitoring** - Instrument OpenAI/Anthropic/Vercel AI/LangChain/Google GenAI. See `.agents/skills/sentry-setup-ai-monitoring/SKILL.md`
- **iOS (Swift)** - Setup Sentry in iOS/Swift apps with error monitoring, tracing, session replay, logging, and profiling. See `.agents/skills/sentry-ios-swift-setup/SKILL.md`
- **Logging** - Configure structured logging (JS/Python/Ruby). See `.agents/skills/sentry-setup-logging/SKILL.md`
- **Metrics** - Setup counters/gauges/distributions. See `.agents/skills/sentry-setup-metrics/SKILL.md`
- **Tracing** - Enable performance monitoring and distributed tracing. See `.agents/skills/sentry-setup-tracing/SKILL.md`

## Commands
| Command | Description |
|---------|-------------|
| `/seer <query>` | Natural language Sentry environment queries |

## MCP Server
Sentry MCP server configured at `https://mcp.sentry.dev/mcp`. Two config files exist:
- `.mcp.json` — canonical (Claude Code format)
- `mcp.json` — symlink to `.mcp.json` (Cursor format)

## Key Conventions
- All setup skills must **detect platform/SDK before suggesting configuration** — never assume
- Sentry code review skill only processes comments from `sentry[bot]`, ignores other bots
- GitHub CLI (`gh`) required for PR-related skills
- Avoid emojis in skill/command content — keep output platform-neutral
