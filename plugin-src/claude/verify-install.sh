#!/usr/bin/env bash
#
# verify-install.sh — Live-install and basic runtime validation of the built
# Claude Code distribution using the real `claude` CLI.
#
# Proves that `claude plugin marketplace add`, manifest acceptance, and
# --plugin-dir loading work against the exact tree shape published to
# getsentry/plugin-claude.
#
# Usage: verify-install.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: verify-install.sh <TARGET_DIR>}"

echo "=== Ensuring claude CLI is available ==="
if ! command -v claude >/dev/null 2>&1; then
    echo "claude CLI not found; installing via official installer..."
    curl -fsSL https://claude.ai/install.sh | bash
fi

export PATH="$HOME/.local/bin:$PATH"
hash -r 2>/dev/null || true

claude --version || true

echo "=== Live marketplace add from $TARGET_DIR ==="
claude plugin marketplace add "$TARGET_DIR"

echo "=== Introspection via claude CLI ==="
claude plugin list | cat

echo "=== One-shot load test via --plugin-dir (exercises the loader) ==="
claude --plugin-dir "$TARGET_DIR" \
    -p 'List the names of the Sentry router skills only (sentry-sdk-setup, sentry-workflow, sentry-feature-setup). One line, comma separated.' \
    --safe-mode --print 2>&1 | cat

echo "=== Optional: claude's own manifest validate ==="
claude plugin validate "$TARGET_DIR/.claude-plugin/plugin.json" || true

echo "=== Claude verify-install complete ==="
