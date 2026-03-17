#!/bin/bash
# Sentry AI monitoring hook for Claude Code
# Captures hook events and sends them to Sentry as gen_ai spans.
#
# Supports two modes (set via SENTRY_CLAUDE_MODE env var):
#   batch    (default) — logs events to JSONL, processes at session end
#   realtime          — POSTs events to a local collector server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load config if SENTRY_DSN not already in env
if [ -z "${SENTRY_DSN:-}" ] && [ -f "${HOME}/.config/sentry-claude/config" ]; then
  set -a
  . "${HOME}/.config/sentry-claude/config"
  set +a
fi

# Auto-install collector dependencies on first run
if [ ! -d "${SCRIPT_DIR}/node_modules/@sentry/node" ]; then
  (cd "$SCRIPT_DIR" && npm install --no-fund --no-audit --silent 2>/dev/null) || true
fi

# Read hook event JSON from stdin
INPUT=$(cat | tr -d '\n')

# Skip if no Sentry DSN configured
[ -z "${SENTRY_DSN:-}" ] && exit 0

# Extract fields using sed (no jq dependency)
SESSION_ID=$(echo "$INPUT" | sed -n 's/.*"session_id" *: *"\([^"]*\)".*/\1/p')
EVENT_NAME=$(echo "$INPUT" | sed -n 's/.*"hook_event_name" *: *"\([^"]*\)".*/\1/p')

[ -z "$SESSION_ID" ] && exit 0

# Add Unix timestamp with millisecond precision to the event JSON
# macOS date(1) lacks %N, so use perl Time::HiRes for fractional seconds
TIMESTAMP=$(perl -e 'use Time::HiRes qw(time); printf "%.3f\n", time')
TIMESTAMPED="${INPUT%\}},\"_ts\":${TIMESTAMP}}"

MODE="${SENTRY_CLAUDE_MODE:-batch}"

if [ "$MODE" = "realtime" ]; then
  PORT="${SENTRY_COLLECTOR_PORT:-9876}"
  BASE="http://127.0.0.1:${PORT}"

  # On SessionStart, ensure the collector server is running
  if [ "$EVENT_NAME" = "SessionStart" ]; then
    if ! curl -sf "${BASE}/health" > /dev/null 2>&1; then
      nohup node "$SCRIPT_DIR/sentry-collector.mjs" --serve > /tmp/claude-sentry-server.log 2>&1 &
      for i in 1 2 3; do
        sleep 0.5
        curl -sf "${BASE}/health" > /dev/null 2>&1 && break
      done
    fi
  fi

  # POST event to collector
  curl -sf -X POST -H "Content-Type: application/json" \
    -d "$TIMESTAMPED" "${BASE}/hook" > /dev/null 2>&1 || true

else
  # Batch mode: append to session-specific JSONL file
  LOGFILE="/tmp/claude-sentry-${SESSION_ID}.jsonl"
  echo "$TIMESTAMPED" >> "$LOGFILE"

  # On SessionEnd, process the collected events
  if [ "$EVENT_NAME" = "SessionEnd" ]; then
    node "$SCRIPT_DIR/sentry-collector.mjs" --batch "$LOGFILE" 2>>/tmp/claude-sentry-debug.log || true
  fi
fi
