# SDK Skill Philosophy

Guide for authoring SDK skill bundles — a new pattern that ships complete, opinionated Sentry setup wizards alongside each SDK.

## The Vision

SDK skills are **living documentation bundles**. Instead of a flat SKILL.md that covers one feature, an SDK skill covers everything a project needs: error monitoring, tracing, profiling, logging, session replay, and more. The agent acts as an expert who reads the project, makes opinionated recommendations, and guides the user through each feature — loading deep-dive references as needed.

## Bundle Architecture

```
skills/
  sentry-<platform>-sdk/
    SKILL.md                    # Main wizard
    references/
      error-monitoring.md       # Deep dive: errors, panics, wrapping
      tracing.md                # Deep dive: spans, distributed tracing
      profiling.md              # Deep dive: continuous profiling
      logging.md                # Deep dive: structured logs
      metrics.md                # Deep dive: counters, gauges, distributions
      crons.md                  # Deep dive: cron job monitoring
      session-replay.md         # Deep dive: replay (frontend only)
```

The main `SKILL.md` is the wizard — it stays lean. References are loaded conditionally based on what the user wants to configure.

**Loading a reference in SKILL.md:**
```markdown
Read ${SKILL_ROOT}/references/tracing.md for detailed tracing setup steps.
```

## Feature Pillars

Each SDK supports a subset of Sentry's pillars:

| Pillar | Backend SDKs | Frontend SDKs |
|--------|-------------|---------------|
| Error Monitoring | ✅ Always | ✅ Always |
| Tracing/Performance | ✅ Common | ✅ Common |
| Profiling | ✅ Some | ✅ Some |
| Logging | ✅ Common | ✅ Common |
| Metrics | ✅ Some | ✅ Some |
| Crons | ✅ Backend only | ❌ |
| Session Replay | ❌ | ✅ Frontend only |
| AI Monitoring | ✅ Some | ✅ Some |

Only include reference files for pillars the SDK actually supports. If a feature is experimental or beta, mark it clearly in the reference header.

## The Wizard Flow

The main SKILL.md implements a four-phase wizard:

### Phase 1: Detect

Scan the project to understand the stack:

```markdown
## Phase 1: Detect

Run these commands to understand the project:
- `cat go.mod` / `cat package.json` — identify language and framework
- `grep -r "sentry" go.mod package.json 2>/dev/null` — check if Sentry is already installed
- `ls frontend/ web/ client/ 2>/dev/null` — detect companion frontend/backend
```

### Phase 2: Recommend

Present opinionated feature recommendations based on what you found. Don't ask open-ended "what do you want?" — lead with a concrete proposal:

```markdown
## Phase 2: Recommend

Based on what I found, here's what I recommend setting up:

**Recommended (core coverage):**
- ✅ Error monitoring — captures panics, exceptions, and unhandled errors
- ✅ Tracing — your app has HTTP handlers; distributed tracing will show latency across services
- ✅ Logging — you're using zap; Sentry can capture structured logs automatically

**Optional (enhanced observability):**
- ⚡ Profiling — low-overhead CPU/memory profiling in production
- ⚡ Metrics — custom counters and gauges for business KPIs
- ⚡ Crons — detect silent failures in scheduled jobs

Shall I set up everything recommended, or customize the list?
```

Recommendation logic:
- **Error monitoring**: Always recommend — this is the baseline
- **Tracing**: Recommend when HTTP handlers, APIs, gRPC, or queues are detected
- **Profiling**: Recommend for production apps where perf matters
- **Logging**: Recommend when the app already uses a logging library
- **Metrics**: Recommend for apps tracking business events or SLOs
- **Crons**: Recommend when cron/scheduler patterns are detected
- **Session Replay**: Recommend for frontend apps, never for backend

### Phase 3: Guide

#### Wizard-First for Framework SDKs

Many Sentry SDKs ship with a CLI wizard (`npx @sentry/wizard@latest -i <integration>`) that scaffolds the entire setup in one command. **When a wizard integration exists for the target framework, the skill must present it as the primary recommended path — before any manual instructions.**

Why this matters:
- The wizard walks through **authentication interactively** — it opens the browser for login, lets the user select their Sentry org and project, and creates/downloads the auth token automatically. No manual token creation or copy-pasting from the Sentry dashboard.
- The wizard configures **source map upload** automatically — without source maps, production stack traces show minified garbage. This is the single most common setup mistake in frontend projects.
- The wizard handles framework-specific wiring (hook files, config plugins, build tool plugins) that's easy to get wrong manually.
- The wizard creates a test page/component for immediate verification.

**Pattern for skills with wizard support:**

```markdown
### Option 1: Wizard (Recommended)

\`\`\`bash
npx @sentry/wizard@latest -i <framework>
\`\`\`

The wizard walks you through login, org/project selection, and auth token
setup interactively. It then handles installation, SDK initialization,
source map upload configuration, and creates a test page for verification.
Skip to [Verification](#verification) after running it.

### Option 2: Manual Setup

[Full manual instructions follow here...]
```

**When to include a wizard option:**
- The SDK docs page shows a wizard command for the framework
- During research (Phase 2), verify wizard support by checking `https://docs.sentry.io/platforms/<platform>/` for wizard instructions

**Known wizard integrations** (verify during research — this list may be outdated):

| Wizard `-i` flag | Framework |
|-----------------|-----------|
| `nextjs` | Next.js |
| `sveltekit` | SvelteKit |
| `remix` | Remix |
| `nuxt` | Nuxt |
| `reactNative` | React Native / Expo |
| `angular` | Angular |
| `vue` | Vue |
| `flutter` | Flutter |
| `apple` | iOS / macOS (Cocoa) |
| `android` | Android |
| `dotnet` | .NET |

> **Important:** Even when the wizard is available, the skill must still include full manual setup instructions. The wizard may not cover all configuration options, and some users work in environments where interactive CLIs aren't practical (CI, Docker, restricted shells). The manual path is the fallback, not an afterthought — it must be complete.

#### Source Maps: The Non-Negotiable for Frontend

Source map upload is **critical** for any frontend or mobile SDK. Without it, error stack traces in Sentry show minified/bundled code that's unreadable.

Every frontend/mobile SDK skill must:
1. Present the wizard as the easiest path to get source maps working
2. Include manual source map upload instructions for the manual setup path
3. Cover the correct build tool plugin (`sentryVitePlugin`, `sentryWebpackPlugin`, `sentrySvelteKit`, etc.)
4. Document the required environment variables (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
5. Add source map troubleshooting entries to the troubleshooting table

#### Feature Reference Loading

Walk through each agreed feature, loading the relevant reference:

```markdown
## Phase 3: Guide

For each feature in the agreed list:
1. Load the reference: `Read ${SKILL_ROOT}/references/<feature>.md`
2. Follow the reference steps exactly
3. Verify the feature works before moving to the next
```

Keep the main SKILL.md free of deep implementation details — that lives in the references.

### Phase 4: Cross-Link

After completing setup, check for coverage gaps:

```markdown
## Phase 4: Cross-Link

Check for a companion frontend or backend that's missing Sentry:
- `ls frontend/ web/ client/ 2>/dev/null` + check for package.json with a JS framework
- `ls backend/ server/ api/ 2>/dev/null` + check for go.mod or requirements.txt

If found, suggest:
> I see a React frontend in `frontend/` with no Sentry. Consider running the
> `sentry-react-sdk` or `sentry-svelte-sdk` skill for full-stack coverage.
```

## Reference File Guidelines

Each reference covers **one feature pillar** and is loaded on demand. Reference files can be longer than a typical skill — they are deep dives, not wizard flows.

**Required sections for each reference:**

```markdown
# <Feature> — <Platform> SDK

> Minimum SDK: `<package>@X.Y.Z+`

## Installation

## Configuration

## Code Examples

### Basic usage

### Framework-specific notes (if applicable)

## Best Practices

## Troubleshooting

| Issue | Solution |
|-------|----------|
```

**Style rules:**
- Tables for config options, not prose lists
- One complete, working code example per use case — not multiple variations
- Note framework-specific differences (e.g., SvelteKit vs Svelte, Gin vs net/http)
- Include minimum SDK version at the top of every reference

## Error Monitoring: The Non-Negotiable Baseline

Error monitoring is not optional. Every SDK skill must:

1. Set up error monitoring in the initial `Init()` call — not as an opt-in
2. Use opinionated defaults that capture the most useful data:
   - `SendDefaultPii: true` (or platform equivalent) — includes user context
   - A sensible `TracesSampleRate` starting point (e.g., `1.0` for dev, lower for prod)
   - Automatic framework integrations (e.g., `http.Integration`, `gin.Integration`)
3. Make clear this is the baseline — everything else enhances it

```go
// Example opinionated baseline for Go
sentry.Init(sentry.ClientOptions{
    Dsn:              os.Getenv("SENTRY_DSN"),
    SendDefaultPii:   true,
    TracesSampleRate: 1.0,
    EnableTracing:    true,
})
```

Never present a minimal config that leaves users under-instrumented. The goal is full observability from day one.

## Staying Current

SDK skills ship alongside the SDK and must reflect the current API.

**In every SKILL.md and reference file:**
- State the minimum SDK version required for each feature
- Use current API names — never deprecated ones
- Mark experimental features with ⚠️ **Experimental** or 🔬 **Beta**
- Add this disclaimer in the Invoke section:

```markdown
> **Note:** SDK versions and APIs below reflect current Sentry docs.
> Always verify against [docs.sentry.io](https://docs.sentry.io) before implementing.
```

**When updating a skill:**
1. Check the SDK changelog for breaking changes since last update
2. Verify all code examples compile/run against the latest SDK version
3. Update minimum version requirements if new features raised the floor
4. Remove deprecated API usage

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Skill directory | `sentry-<platform>-sdk` | `sentry-go-sdk`, `sentry-svelte-sdk` |
| Main file | `SKILL.md` | — |
| Reference files | `<feature>.md` in `references/` | `references/tracing.md` |
| Skill `name` field | matches directory | `sentry-go-sdk` |

## Complete Skill Scaffold

```
skills/sentry-<platform>-sdk/
  SKILL.md
  references/
    error-monitoring.md
    tracing.md
    profiling.md       # if supported
    logging.md
    metrics.md         # if supported
    crons.md           # backend only
    session-replay.md  # frontend only
```

Minimal `SKILL.md` structure:

```markdown
---
name: sentry-<platform>-sdk
description: Full Sentry SDK setup for <Platform>. Use when asked to add Sentry
  to a <platform> project, install the <platform> SDK, or configure error
  monitoring, tracing, profiling, logging, or crons for <Platform>.
license: Apache-2.0
---

# Sentry <Platform> SDK

Opinionated wizard that scans your project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to <platform>" or "set up Sentry"
- User wants error monitoring, tracing, profiling, or logging in <platform>
- User mentions the <platform> Sentry SDK package name

> **Note:** SDK versions and APIs below reflect current Sentry docs at time of writing.
> Always verify against [docs.sentry.io](https://docs.sentry.io/<platform>/) before implementing.

## Phase 1: Detect
...

## Phase 2: Recommend
...

## Phase 3: Guide
### Option 1: Wizard (Recommended)  ← if wizard exists for this framework
### Option 2: Manual Setup
...

## Phase 4: Cross-Link
...
```

## See Also

- [AGENTS.md](../../../AGENTS.md) — General skill authoring guidelines and style rules
- [Agent Skills Specification](https://agentskills.io/specification)
- [Sentry Documentation](https://docs.sentry.io/)
