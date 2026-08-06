#!/usr/bin/env bash
#
# build.sh - Build the OpenCode V1 Sentry skill and MCP distribution.
#
# OpenCode discovers SKILL.md files recursively below a configured skill source.
# The distribution therefore keeps the shared skills under skills/ and includes
# a root opencode.json so the checkout is also directly runnable. The installer
# clones this tree below ~/.config/opencode/skills/sentry, where OpenCode's
# recursive global discovery finds the same files without replacing user config.
#
# V1 ignores disable-model-invocation, so skills ship as-authored. Its MCP shape
# places named servers directly below mcp; the config is generated from the
# repository's mcp.json source of truth.
#
# Usage: build.sh <TARGET_DIR>   (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/build-common.sh"
resolve_content_root "$REPO_ROOT/src"

copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"
copy_skill_tree "$CONTENT_ROOT" "$TARGET_DIR/SKILL_TREE.md"
rsync -a assets/ "$TARGET_DIR/assets/"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"
printf '1\n' > "$TARGET_DIR/.sentry-opencode-v1"

jq '{
    "$schema": "https://opencode.ai/config.json",
    skills: { paths: ["./skills"] },
    mcp: {
        sentry: {
            type: "remote",
            url: .mcpServers.sentry.url
        }
    }
}' mcp.json > "$TARGET_DIR/opencode.json"

echo "Built OpenCode V1 bundle into $TARGET_DIR (content from $CONTENT_ROOT)."
