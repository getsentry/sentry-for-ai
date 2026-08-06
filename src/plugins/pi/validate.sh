#!/usr/bin/env bash
#
# validate.sh — Validate the built Pi distribution before publishing.
#
# Pi packages have no separate plugin or marketplace schema. Validate the npm
# package manifest, required resources, skill-tree metadata, installable tarball,
# and extension load path. The extension smoke test runs Pi in offline print
# mode without sending a prompt, so it loads resources but makes no model or MCP
# request.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

for f in \
    "$TARGET_DIR/package.json" \
    "$TARGET_DIR/extensions/sentry-mcp.ts" \
    "$TARGET_DIR/README.md" \
    "$TARGET_DIR/LICENSE"; do
    [ -f "$f" ] || { echo "missing required file: $f" >&2; exit 1; }
done

jq -e '
    (.keywords | index("pi-package")) and
    (.pi.extensions == ["./extensions/sentry-mcp.ts"]) and
    (.pi.skills == ["./skills"]) and
    (.dependencies["pi-mcp-adapter"] | type == "string") and
    (.peerDependencies["@earendil-works/pi-coding-agent"] == "*") and
    (.peerDependenciesMeta["@earendil-works/pi-coding-agent"].optional == true)
' "$TARGET_DIR/package.json" >/dev/null

[ -f "$TARGET_DIR/SKILL_TREE.md" ] || {
    echo "missing required skill tree: $TARGET_DIR/SKILL_TREE.md" >&2
    exit 1
}
cmp "$REPO_ROOT/src/SKILL_TREE.md" "$TARGET_DIR/SKILL_TREE.md"

SOURCE_SKILL_COUNT="$(find "$REPO_ROOT/src/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
TARGET_SKILL_COUNT="$(find "$TARGET_DIR/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
[ "$TARGET_SKILL_COUNT" -eq "$SOURCE_SKILL_COUNT" ] || {
    echo "skill count mismatch: expected $SOURCE_SKILL_COUNT, found $TARGET_SKILL_COUNT" >&2
    exit 1
}

"$REPO_ROOT/scripts/build-skill-tree.sh" --check

python3 - "$TARGET_DIR/skills" <<'PY'
from pathlib import Path
import re
import sys

skills_dir = Path(sys.argv[1])
missing: list[str] = []
for skill_file in skills_dir.glob("*/SKILL.md"):
    for link in re.findall(r"\]\(([^)]+\.md(?:#[^)]*)?)\)", skill_file.read_text()):
        path = link.split("#", 1)[0]
        if path.startswith(("http://", "https://")):
            continue
        if not (skill_file.parent / path).is_file():
            missing.append(f"{skill_file}: {path}")
if missing:
    raise SystemExit("missing packaged skill references:\n" + "\n".join(missing))
PY

SMOKE_DIR="$(mktemp -d)"
trap 'rm -rf "$SMOKE_DIR"' EXIT
rsync -a "$TARGET_DIR/" "$SMOKE_DIR/"
(
    cd "$SMOKE_DIR"
    npm pack --dry-run --json >/dev/null
    npm install --ignore-scripts --no-audit --no-fund --no-package-lock
    PI_OFFLINE=1 PI_CODING_AGENT_DIR="$(mktemp -d)" \
        pi --no-context-files --no-skills --extension ./extensions/sentry-mcp.ts --no-session --print
    PI_OFFLINE=1 PI_CODING_AGENT_DIR="$(mktemp -d)" \
        pi --no-context-files --no-skills \
        --extension ./node_modules/pi-mcp-adapter/index.ts \
        --extension ./extensions/sentry-mcp.ts \
        --no-session --print

    cat > assert-sentry-extension.ts <<'TS'
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export default function assertSentryExtension(pi: ExtensionAPI) {
  pi.on("session_start", () => {
    const toolNames = pi.getAllTools().map((tool) => tool.name);
    for (const expected of ["mcp", "sentry_mcp"]) {
      if (!toolNames.includes(expected)) {
        throw new Error(`missing ${expected}: ${toolNames.join(",")}`);
      }
    }
  });
}
TS
    PI_OFFLINE=1 PI_CODING_AGENT_DIR="$(mktemp -d)" \
        pi --no-context-files --no-skills \
        --extension ./node_modules/pi-mcp-adapter/index.ts \
        --extension ./extensions/sentry-mcp.ts \
        --extension ./assert-sentry-extension.ts \
        --no-session --print
)

echo "Validated Pi package at $TARGET_DIR."
