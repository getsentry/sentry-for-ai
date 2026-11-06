#!/usr/bin/env bash
#
# build.sh — Build the GitHub Copilot distribution of Sentry.
#
# Agent Plugins 1.0.0 discovers its manifest, skills, and MCP configuration at
# fixed locations in the plugin root. Shared references are hydrated so every
# emitted Agent Skill is self-contained.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/build-common.sh"
resolve_content_root "$REPO_ROOT/src"

mkdir -p "$TARGET_DIR/.github/plugin"

install_plugin_manifest "$SRC_DIR/plugin.json" "$TARGET_DIR/plugin.json" copilot
cp "$SRC_DIR/marketplace.json" "$TARGET_DIR/.github/plugin/marketplace.json"
copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"
install_mcp_config "$SRC_DIR/../agent-plugin/mcp.json" "$TARGET_DIR/mcp.json" copilot
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Copilot dist into $TARGET_DIR (root plugin, content from $CONTENT_ROOT)."
