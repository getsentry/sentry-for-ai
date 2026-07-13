#!/usr/bin/env bash
#
# build.sh — Build the Cursor distribution of the Sentry plugin.
#
# Like Claude, Cursor consumes the plugin at the dist branch ROOT
# (`.cursor-plugin/marketplace.json` uses `source: "./"`). Cursor expects the MCP
# config as `mcp.json` (no leading dot), which is the repo's source-of-truth name,
# so it copies straight through. Claude and Codex emit the dotted `.mcp.json` from
# the same source. No skill mutation: copies the manifest (from alongside this
# script) plus the shared content from the repo root.
#
# Note: Cursor documents honoring `disable-model-invocation`, but a known Cursor
# bug currently hides plugin-delivered skills entirely. We ship the field
# as-authored; that is a Cursor-side issue, not a packaging one.
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

mkdir -p "$TARGET_DIR/.cursor-plugin"

cp "$SRC_DIR/plugin.json" "$TARGET_DIR/.cursor-plugin/plugin.json"
cp "$SRC_DIR/marketplace.json" "$TARGET_DIR/.cursor-plugin/marketplace.json"
copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"
copy_skill_tree "$CONTENT_ROOT" "$TARGET_DIR/SKILL_TREE.md"
rsync -a assets/ "$TARGET_DIR/assets/"
cp mcp.json "$TARGET_DIR/mcp.json"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Cursor dist into $TARGET_DIR (root plugin, content from $CONTENT_ROOT)."
