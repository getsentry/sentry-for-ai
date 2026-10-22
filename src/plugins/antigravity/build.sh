#!/usr/bin/env bash
# Build the Google Antigravity distribution with hydrated Agent Skills.
# Usage: build.sh <TARGET_DIR> (TARGET_DIR assumed empty)

set -euo pipefail

TARGET_DIR="${1:?usage: build.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/../../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/build-common.sh"
resolve_content_root "$REPO_ROOT/src"

mkdir -p "$TARGET_DIR/assets"

install_plugin_manifest "$SRC_DIR/plugin.json" "$TARGET_DIR/plugin.json"
copy_skills "$CONTENT_ROOT" "$TARGET_DIR/skills"

python3 - "$TARGET_DIR/mcp_config.json" <<'PY'
import json
import sys

with open("mcp.json") as f:
    server = json.load(f)["mcpServers"]["sentry"]

with open(sys.argv[1], "w") as f:
    json.dump({"mcpServers": {"sentry": {"serverUrl": server["url"]}}}, f, indent=2)
    f.write("\n")
PY

cp "$SRC_DIR/README.md" "$TARGET_DIR/README.md"
cp "$SRC_DIR/assets/logo.svg" "$TARGET_DIR/assets/logo.svg"
cp LICENSE "$TARGET_DIR/LICENSE"

echo "Built Antigravity dist into $TARGET_DIR (content from $CONTENT_ROOT)."
