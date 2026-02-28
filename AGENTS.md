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
commands/               # Slash commands (/seer)
skills/                 # Setup and review skills
.agents/                # Symlinks to commands/ and skills/
.claude-plugin/         # Claude Code plugin metadata
.cursor-plugin/         # Cursor plugin metadata
```

Skills use YAML frontmatter with `allowed-tools` — this is required by Cursor and harmless in Claude Code. Keep it in all skill files.

## Skills

### SDK Skills (Full Platform Bundles)
| Skill | Description |
|-------|-------------|
| `sentry-cocoa-sdk` | Full setup wizard for Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) |
| `sentry-dotnet-sdk` | Full setup wizard for .NET (ASP.NET Core, MAUI, WPF, WinForms, Azure Functions) |
| `sentry-go-sdk` | Full setup wizard for Go (net/http, Gin, Echo, Fiber) |
| `sentry-nextjs-sdk` | Full setup wizard for Next.js (App Router + Pages Router) |
| `sentry-python-sdk` | Full setup wizard for Python (Django, Flask, FastAPI, Celery) |
| `sentry-react-native-sdk` | Full setup wizard for React Native and Expo |
| `sentry-react-sdk` | Full setup wizard for React (Router v5-v7, TanStack, Redux) |
| `sentry-ruby-sdk` | Full setup wizard for Ruby (Rails, Sinatra, Sidekiq) |
| `sentry-svelte-sdk` | Full setup wizard for Svelte/SvelteKit |

### Setup Skills
| Skill | Description |
|-------|-------------|
| `sentry-setup-ai-monitoring` | Instrument OpenAI/Anthropic/Vercel AI/LangChain/Google GenAI |
| `sentry-otel-exporter-setup` | Setup OTel Collector with Sentry Exporter |

### Workflow Skills
| Skill | Description |
|-------|-------------|
| `sentry-code-review` | Analyze and resolve Sentry bot comments on GitHub PRs |
| `sentry-pr-code-review` | Review PRs for issues detected by Seer Bug Prediction |
| `sentry-fix-issues` | Find and fix Sentry issues using MCP |
| `sentry-create-alert` | Create Sentry alerts using the workflow engine API |

### Authoring Skills
| Skill | Description |
|-------|-------------|
| `sentry-sdk-skill-creator` | Create a complete SDK skill bundle for any new platform |

## Commands
| Command | Description |
|---------|-------------|
| `/seer <query>` | Natural language Sentry environment queries |

## MCP Server
Sentry MCP server configured at `https://mcp.sentry.dev/mcp`. Two config files exist:
- `.mcp.json` — Claude Code format
- `mcp.json` — Cursor format

## Key Conventions
- All setup skills must **detect platform/SDK before suggesting configuration** — never assume
- Sentry code review skill only processes comments from `sentry[bot]`, ignores other bots
- GitHub CLI (`gh`) required for PR-related skills
- Avoid emojis in skill/command content — keep output platform-neutral
