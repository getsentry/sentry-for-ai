#!/usr/bin/env bash
#
# build.sh — Build the Pi distribution of the Sentry plugin.
#
# Pi packages put their resources at the package root and declare them in the
# `pi` section of package.json. This build ships the shared skills as-authored:
# Pi honors `disable-model-invocation`, so the skill-tree routers work natively.
#
# Pi does not have built-in MCP support. The package therefore includes a small
# extension backed by pi-mcp-adapter. It connects to Sentry's hosted MCP server
# through one namespaced `sentry_mcp` gateway, keeping the MCP catalog's tool
# schemas out of the model context until they are needed. Adapter-private tools,
# commands, and flags are namespaced so this package can coexist with a
# separately installed adapter. Runtime dependencies are
# installed by `pi install` from package.json.
#
# Skill content (skills/, references/, SKILL_TREE.md) is read from CONTENT_ROOT,
# defaulting to the repo's src/ directory. Override CONTENT_ROOT to build a
# different content tree with the same steps.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/build-common.sh"
resolve_content_root "$REPO_ROOT/src"

mkdir -p "$TARGET_DIR/extensions"

cp "$SRC_DIR/package.json" "$TARGET_DIR/package.json"
cp "$SRC_DIR/extensions/sentry-mcp.ts" "$TARGET_DIR/extensions/sentry-mcp.ts"
copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"
copy_skill_tree "$CONTENT_ROOT" "$TARGET_DIR/SKILL_TREE.md"
rsync -a assets/ "$TARGET_DIR/assets/"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Pi package into $TARGET_DIR (root package, content from $CONTENT_ROOT)."
