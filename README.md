# Sentry for AI

> [!IMPORTANT]
> **This is a skill _source_ repository — not something you install directly.**
> The skills here are built from this source into installable plugins for
> [Claude Code](https://github.com/getsentry/plugin-claude),
> [Cursor](https://github.com/getsentry/plugin-cursor),
> [Codex](https://github.com/getsentry/plugin-codex), and
> [Grok](https://github.com/getsentry/plugin-grok) — install one of those, not
> this repo. They're also served over HTTP at
> [skills.sentry.dev](https://skills.sentry.dev) for agents to fetch directly.
> In the future we may also publish the skills as a generic, standalone skills
> repository.

Your AI coding assistant already knows how to write code. This plugin teaches it Sentry — how to set it up, how to find and fix production issues, and how to get the most out of every feature.

Whether you're adding Sentry to a new project, debugging a spike in errors, or configuring alerts, just ask. The plugin gives your assistant the context it needs to do it right.

Supports [**Claude Code**](https://github.com/getsentry/plugin-claude), [**Cursor**](https://github.com/getsentry/plugin-cursor), [**Codex**](https://github.com/getsentry/plugin-codex), and [**Grok**](https://github.com/getsentry/plugin-grok).

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

## Distribution

This repository is the single source of truth for all skills, but it is not
itself an installable plugin. Each assistant needs the plugin in a slightly
different shape, so the per-agent plugins are **built** from it by the build
scripts under `plugin-src/<agent>/build.sh`. CI runs these on every push and
deploys each result to its own **distribution repository**, whose root is
exactly that agent's plugin:

| Agent       | Distribution repository                                                  |
| ----------- | ------------------------------------------------------------------------ |
| Claude Code | [`getsentry/plugin-claude`](https://github.com/getsentry/plugin-claude)  |
| Cursor      | [`getsentry/plugin-cursor`](https://github.com/getsentry/plugin-cursor)  |
| Codex       | [`getsentry/plugin-codex`](https://github.com/getsentry/plugin-codex)    |
| Grok        | [`getsentry/plugin-grok`](https://github.com/getsentry/plugin-grok)      |

These repositories are generated; do not edit them. Each one's README has the
install instructions for that agent.

The skill library is also browsable at [skills.sentry.dev](https://skills.sentry.dev)
and available through the [`skills.sh`](https://www.skills.sh/getsentry/sentry-for-ai)
installer.

### Build it yourself

Each `plugin-src/<agent>/build.sh` takes an output directory and writes that
agent's plugin into it (the Codex build moves the plugin under `plugins/sentry/`
and swaps the skill tree's `disable-model-invocation` flags for Codex's
`agents/openai.yaml` policy):

```bash
git clone https://github.com/getsentry/sentry-for-ai.git
cd sentry-for-ai
plugin-src/codex/build.sh /tmp/sentry-codex   # or plugin-src/{claude,cursor,grok}
```

To build any target locally, run `plugin-src/<agent>/build.sh <output-dir>`
(`claude`, `cursor`, `codex`, or `grok`).

## Skills

### SDK Setup Wizards

Full platform bundles that scan your project, recommend features, and guide you through setup — error monitoring, tracing, profiling, session replay, logging, and more.

| Skill | Platforms |
|-------|-----------|
| `sentry-android-sdk` | Android (Jetpack Compose, Views, OkHttp, Room, Fragment, Timber) |
| `sentry-cocoa-sdk` | iOS, macOS, tvOS, watchOS, visionOS (Swift, UIKit, SwiftUI) |
| `sentry-dotnet-sdk` | ASP.NET Core, MAUI, WPF, WinForms, Azure Functions, Blazor, gRPC |
| `sentry-go-sdk` | Go (net/http, Gin, Echo, Fiber) |
| `sentry-nestjs-sdk` | NestJS (Express, Fastify, GraphQL, Microservices, WebSocket) |
| `sentry-nextjs-sdk` | Next.js App Router + Pages Router, Vercel |
| `sentry-node-sdk` | Node.js, Bun, Deno (Express, Fastify, Koa, Hapi, NestJS, Connect, Bun.serve, Deno.serve) |
| `sentry-php-sdk` | PHP (Laravel, Symfony) |
| `sentry-python-sdk` | Python (Django, Flask, FastAPI, Celery, Starlette, AIOHTTP) |
| `sentry-react-native-sdk` | React Native, Expo managed/bare |
| `sentry-react-sdk` | React 16+, React Router v5-v7 non-framework mode, TanStack Router, Redux |
| `sentry-react-router-framework-sdk` | React Router Framework mode (`@sentry/react-router`) |
| `sentry-tanstack-start-sdk` | TanStack Start React |
| `sentry-ruby-sdk` | Ruby, Rails, Sinatra, Rack, Sidekiq |
| `sentry-svelte-sdk` | Svelte, SvelteKit |

### Feature Setup

| Skill | Description |
|-------|-------------|
| `sentry-setup-ai-monitoring` | Instrument OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI |
| `sentry-otel-exporter-setup` | Configure OTel Collector with Sentry Exporter for multi-project routing |
| `sentry-instrumentation-guide` | Decide which signal to reach for — error vs span vs log vs metric, and what to instrument where |

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
