#!/usr/bin/env bash
#
# build.sh — Build the Grok distribution of the Sentry plugin.
#
# Grok plugins put their components at the repo ROOT (skills/ and a
# `.mcp.json` file Grok auto-discovers). The plugin manifest lives at
# `.grok-plugin/plugin.json` — that is where the xAI plugin marketplace scanner
# (generate-plugin-index.py) looks for it. A marketplace catalog also lives at
# `.grok-plugin/marketplace.json` whose `source: "./"` points back at this same
# root. This differs from Claude (`.claude-plugin/`) and Codex (`plugins/sentry/`).
# No skill mutation is needed; skills ship as-authored.
#
# MCP is a root `.mcp.json`, built from the repo's `mcp.json` source of truth.
#
# Skill content (skills/, references/, SKILL_TREE.md) is read from
# CONTENT_ROOT, defaulting to the repo root. Point it at an alternate tree (e.g.
# CONTENT_ROOT=skills-next) to build a different skill set with the same steps.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/build-common.sh"
resolve_content_root "$REPO_ROOT"

mkdir -p "$TARGET_DIR/.grok-plugin"

cp "$SRC_DIR/plugin.json" "$TARGET_DIR/.grok-plugin/plugin.json"
cp "$SRC_DIR/marketplace.json" "$TARGET_DIR/.grok-plugin/marketplace.json"
copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"
copy_skill_tree "$CONTENT_ROOT" "$TARGET_DIR/SKILL_TREE.md"
rsync -a assets/ "$TARGET_DIR/assets/"
cp mcp.json "$TARGET_DIR/.mcp.json"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Grok dist into $TARGET_DIR (root plugin, content from $CONTENT_ROOT)."
