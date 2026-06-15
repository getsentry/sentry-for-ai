#!/usr/bin/env bash
#
# build.sh — Build the Codex distribution of the Sentry plugin.
#
# Codex differs from Claude/Cursor in two ways this transform handles:
#
#   1. Layout — the plugin must live in a SUBDIR (`plugins/sentry/`) referenced
#      by a marketplace catalog at `.agents/plugins/marketplace.json`. Codex
#      cannot treat the repo/branch root as the plugin (Claude/Cursor can).
#
#   2. Hidden skills — Codex's validator REJECTS `disable-model-invocation` in
#      SKILL.md frontmatter. Its native equivalent is a per-skill
#      `agents/openai.yaml` carrying `policy.allow_implicit_invocation: false`.
#      For every skill the source marks `disable-model-invocation: true`, we
#      strip that line and emit an `agents/openai.yaml` that hides it. The
#      router skills (which lack the field) stay implicitly invocable. This
#      reproduces the skill-tree routing with Codex's own mechanism, fully
#      bundled, with no skills.sentry.dev dependency.
#
# Source lives alongside this script (plugin.json, marketplace.json) and is
# assembled into the `.codex-plugin/` layout here; shared content (skills/,
# assets/, mcp.json, SKILL_TREE.md) comes from the repo root. Codex expects the
# MCP config as `.mcp.json`, so the source `mcp.json` is emitted under that name.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../.." && pwd)"
cd "$REPO_ROOT"

PLUGIN_NAME="sentry"
PLUGIN="$TARGET_DIR/plugins/$PLUGIN_NAME"

mkdir -p "$PLUGIN/.codex-plugin" "$TARGET_DIR/.agents/plugins"

cp "$SRC_DIR/plugin.json" "$PLUGIN/.codex-plugin/plugin.json"
cp "$SRC_DIR/marketplace.json" "$TARGET_DIR/.agents/plugins/marketplace.json"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

cp mcp.json "$PLUGIN/.mcp.json"
cp SKILL_TREE.md "$PLUGIN/SKILL_TREE.md"
rsync -a assets/ "$PLUGIN/assets/"
rsync -a skills/ "$PLUGIN/skills/"

# Per-skill transform: strip the rejected field + emit agents/openai.yaml for
# every hidden leaf (skills the source marked disable-model-invocation: true).
python3 "$SRC_DIR/hide-skills.py" "$PLUGIN/skills"

echo "Built Codex dist into $TARGET_DIR (plugins/$PLUGIN_NAME)."
