---
name: sentry-setup-claude-code-monitoring
description: Setup Sentry monitoring for Claude Code sessions. Use when the user wants to monitor Claude Code tool calls in Sentry, track what Claude Code is doing, see Claude Code activity in the AI Agents dashboard, or set up observability for their AI coding assistant.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Claude Code Monitoring

# Setup Sentry Monitoring for Claude Code

Configure the Sentry plugin hooks to capture every Claude Code tool call — Read, Edit, Bash, Grep, and more — as gen_ai spans in Sentry's AI Agents dashboard.

This is a standalone monitoring setup. It uses Claude Code's plugin hook system to capture session events and send them to Sentry via `@sentry/node`. No changes to your application code.

## Invoke This Skill When

- User asks to "monitor Claude Code" or "track Claude Code usage"
- User wants to see Claude Code activity in Sentry
- User mentions "AI Agents dashboard" for Claude Code
- User wants observability for their coding assistant sessions

## How It Works

The plugin registers hooks for four Claude Code events:

1. **SessionStart** — records the model and session ID
2. **PreToolUse** — records when a tool call begins
3. **PostToolUse** — records when a tool call completes
4. **SessionEnd** — triggers batch processing and sends spans to Sentry

Events are logged to a temporary JSONL file during the session. When the session ends, a Node.js collector script reads the file, pairs tool events, extracts token counts from the session transcript, and creates OpenTelemetry-compatible spans that appear in Sentry's AI Agents dashboard.

```
gen_ai.invoke_agent "claude-code"          (2m 4s)
├── gen_ai.execute_tool "Read"             (58ms)
├── gen_ai.execute_tool "WebFetch"         (11.3s)
└── gen_ai.execute_tool "WebFetch"         (2.3s)
```

Each session captures: model, token counts (input/output), cost, initial prompt, final response, and full tool call I/O.

There's also a **real-time mode** that starts a local HTTP collector and sends spans as they happen (set `SENTRY_CLAUDE_MODE=realtime`).

## Setup Steps

### Step 1: Check Prerequisites

Verify the user has what's needed:

```bash
# Node.js v18+ required for the collector
node --version

# Claude Code CLI should be installed
claude --version
```

If Node.js is missing or < v18, tell the user to install it first.

### Step 2: Check Current State

See if monitoring is already configured:

```bash
# Check if config file exists
cat ~/.config/sentry-claude/config 2>/dev/null || echo "config not found"

# Check if SENTRY_DSN is set in env (alternative)
echo "${SENTRY_DSN:-not set}"

# Check if collector deps are installed (auto-installed on first run)
ls "${CLAUDE_PLUGIN_ROOT}/scripts/node_modules/@sentry/node" 2>/dev/null || echo "deps not installed (will auto-install)"
```

If the config file exists with a valid DSN, tell the user they're good — just start a new `claude` session and check the AI Agents dashboard.

### Step 3: Get the Sentry DSN

Ask the user for their Sentry DSN. They need:
1. A [Sentry account](https://sentry.io/signup/)
2. A **Node.js** project (the collector uses `@sentry/node`)
3. The DSN from Project Settings > Client Keys

**Ask the user:** "What's your Sentry DSN? You can find it in your Sentry project under Settings > Client Keys (DSN)."

Do not proceed without a valid DSN. It should look like `https://<key>@<org>.ingest.sentry.io/<project>`.

### Step 4: Configure the DSN

Write the DSN to the config file. This is the recommended approach — no shell profile modifications needed.

```bash
mkdir -p ~/.config/sentry-claude
cat > ~/.config/sentry-claude/config << 'CONF'
SENTRY_DSN=<USER_DSN>
CONF
```

Replace `<USER_DSN>` with the actual DSN from step 3.

The hook script automatically sources this file if `SENTRY_DSN` is not already in the environment. Users who prefer environment variables can export `SENTRY_DSN` in their shell profile instead — the config file is only used as a fallback.

### Step 5: Verify

Tell the user:

> Monitoring is configured. Dependencies will auto-install on first use. To test it:
>
> 1. Start a **new** `claude` session (the current session won't pick up new config)
> 2. Use Claude normally — read files, run commands, edit code
> 3. End the session with `/exit`
> 4. Check the [AI Agents dashboard](https://sentry.io/orgredirect/organizations/:orgslug/insights/ai/) in Sentry
>
> You should see a `gen_ai.invoke_agent` span for your session with `gen_ai.execute_tool` child spans for each tool call, along with token counts, cost, and tool I/O.

If nothing appears:
- Confirm DSN is configured: `cat ~/.config/sentry-claude/config`
- Check for leftover JSONL files: `ls /tmp/claude-sentry-*.jsonl` (if present, SessionEnd didn't fire — use `/exit` instead of Ctrl+C)
- Try real-time mode: add `SENTRY_CLAUDE_MODE=realtime` to `~/.config/sentry-claude/config`

## Modes

| Mode | Config value | How it works | When to use |
|------|-------------|-------------|-------------|
| **Batch** (default) | `SENTRY_CLAUDE_MODE=batch` | Logs events to JSONL, sends at session end | Simple setup, no background process |
| **Real-time** | `SENTRY_CLAUDE_MODE=realtime` | Starts HTTP collector, sends spans live | Need live visibility during sessions |

## Configuration

All options go in `~/.config/sentry-claude/config` (or as environment variables):

| Variable | Default | Description |
|---------|---------|-------------|
| `SENTRY_DSN` | (required) | Your Sentry project DSN |
| `SENTRY_CLAUDE_MODE` | `batch` | `batch` or `realtime` |
| `SENTRY_COLLECTOR_PORT` | `9876` | Port for real-time collector server |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No spans in Sentry | Check `cat ~/.config/sentry-claude/config` has a valid DSN. Start a new session after configuring. |
| Spans only appear after session ends | That's batch mode (default). Add `SENTRY_CLAUDE_MODE=realtime` to config for live data. |
| `npm install` fails on first run | Ensure Node.js v18+ is installed. Check network access to npm registry. Run manually: `cd <plugin-root>/scripts && npm install` |
| Ctrl+C doesn't send data | SessionEnd hook may not fire on force-quit. Use `/exit` instead. |
| Port 9876 in use (real-time) | Add `SENTRY_COLLECTOR_PORT=<port>` to config. |
