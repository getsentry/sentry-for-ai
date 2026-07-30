#!/usr/bin/env bash
#
# build.sh - Build the OpenCode V2 beta distribution of the Sentry plugin.
#
# V2 discovers skills recursively below skills/ and uses a different MCP shape
# from V1. It also ignores disable-model-invocation; its native replacement is
# metadata.opencode/autoinvoke: "false". prepare-skills.py performs that
# frontmatter translation for each hidden leaf after the shared skill copy.
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
python3 "$SRC_DIR/prepare-skills.py" "$TARGET_DIR/skills"
copy_skill_tree "$CONTENT_ROOT" "$TARGET_DIR/SKILL_TREE.md"
rsync -a assets/ "$TARGET_DIR/assets/"
cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp LICENSE "$TARGET_DIR/LICENSE"
printf '2\n' > "$TARGET_DIR/.sentry-opencode-v2"

jq '{
    "$schema": "https://opencode.ai/config.json",
    skills: ["./skills"],
    mcp: {
        servers: {
            sentry: {
                type: "remote",
                url: .mcpServers.sentry.url
            }
        }
    }
}' mcp.json > "$TARGET_DIR/opencode.json"

echo "Built OpenCode V2 bundle into $TARGET_DIR (content from $CONTENT_ROOT)."
