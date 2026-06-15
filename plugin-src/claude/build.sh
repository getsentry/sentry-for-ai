#!/usr/bin/env bash
#
# build.sh — Build the Claude Code distribution of the Sentry plugin.
#
# Claude consumes the plugin at the dist branch ROOT (its
# `.claude-plugin/marketplace.json` uses `source: "./"`) and HONORS
# `disable-model-invocation`, so the skill-tree routing works natively. No skill
# mutation is needed: this copies the manifest (from alongside this script) plus
# the shared content from the repo root.
#
# Claude's MCP server is declared inline in `plugin.json` (`mcpServers`), so no
# `.mcp.json` is shipped here; the root `mcp.json` only feeds the Cursor and
# Codex builds.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../.." && pwd)"
cd "$REPO_ROOT"

mkdir -p "$TARGET_DIR/.claude-plugin"

cp "$SRC_DIR/plugin.json" "$TARGET_DIR/.claude-plugin/plugin.json"
cp "$SRC_DIR/marketplace.json" "$TARGET_DIR/.claude-plugin/marketplace.json"
rsync -a skills/ "$TARGET_DIR/skills/"
rsync -a commands/ "$TARGET_DIR/commands/"
rsync -a assets/ "$TARGET_DIR/assets/"
cp SKILL_TREE.md "$TARGET_DIR/SKILL_TREE.md"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Claude dist into $TARGET_DIR (root plugin)."
