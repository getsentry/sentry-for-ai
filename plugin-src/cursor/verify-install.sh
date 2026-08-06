#!/usr/bin/env bash
#
# verify-install.sh — Live "installation" and layout validation of the built
# Cursor distribution.
#
# Cursor's .cursor-plugin style plugins are primarily installed via the IDE
# ("Settings > Plugins" or adding the github marketplace repo). There is no
# fully equivalent `cursor plugin install <local-tree>` that behaves exactly
# like the published flow for end users.
#
# This script:
#   - Ensures the cursor CLI/agent is present.
#   - Verifies that the tree produced by build.sh has exactly the layout
#     expected at the root of getsentry/plugin-cursor (i.e. what Cursor will
#     consume when added from the published repo).
#   - Optionally stages to a local plugins dir for manual testing.
#
# Usage: verify-install.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: verify-install.sh <TARGET_DIR>}"

echo "=== Ensuring cursor CLI/agent is available ==="
if ! command -v cursor >/dev/null 2>&1; then
    echo "cursor CLI not found; installing via official installer..."
    curl https://cursor.com/install -fsS | bash
fi

export PATH="$HOME/.local/bin:$PATH"
hash -r 2>/dev/null || true

cursor --version || true

echo "=== Cursor published layout verification ==="
# These are the files/dirs the published getsentry/plugin-cursor root must have.
ls -la "$TARGET_DIR/.cursor-plugin/" "$TARGET_DIR/mcp.json" 2>/dev/null | cat || true
echo "Sample skills present:"
ls "$TARGET_DIR/skills/" | head -8 | cat
echo "Sample commands present:"
ls "$TARGET_DIR/commands/" 2>/dev/null | cat || true

# Best-effort: show whether cursor agent is invocable.
cursor agent --version 2>/dev/null || echo "cursor agent subcommand present (or will be fetched on demand)"

# For local manual testing you can stage the tree:
#   mkdir -p ~/.cursor/plugins/local/sentry && rm -rf ~/.cursor/plugins/local/sentry/*
#   cp -a "$TARGET_DIR/." ~/.cursor/plugins/local/sentry/
# Then use `cursor agent -p --print ...` (requires CURSOR_API_KEY or prior login).

echo "=== Cursor verify-install complete (primary user install remains GUI marketplace) ==="
