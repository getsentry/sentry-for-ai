#!/usr/bin/env bash
#
# validate.sh - Validate the built OpenCode V2 beta distribution before publishing.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

for f in "$TARGET_DIR/.sentry-opencode-v2" "$TARGET_DIR/opencode.json" "$TARGET_DIR/SKILL_TREE.md" "$TARGET_DIR/README.md" "$TARGET_DIR/LICENSE"; do
    [ -f "$f" ] || { echo "missing required file: $f" >&2; exit 1; }
done
grep -qx '2' "$TARGET_DIR/.sentry-opencode-v2"

jq -e '
    .["$schema"] == "https://opencode.ai/config.json" and
    .skills == ["./skills"] and
    .mcp.servers.sentry.type == "remote" and
    .mcp.servers.sentry.url == "https://mcp.sentry.dev/mcp?utm_source=plugin"
' "$TARGET_DIR/opencode.json" >/dev/null

cmp "$REPO_ROOT/src/SKILL_TREE.md" "$TARGET_DIR/SKILL_TREE.md"

SOURCE_SKILL_COUNT="$(find "$REPO_ROOT/src/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
TARGET_SKILL_COUNT="$(find "$TARGET_DIR/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
[ "$TARGET_SKILL_COUNT" -eq "$SOURCE_SKILL_COUNT" ] || {
    echo "skill count mismatch: expected $SOURCE_SKILL_COUNT, found $TARGET_SKILL_COUNT" >&2
    exit 1
}

SOURCE_HIDDEN_COUNT="$(grep -Rl '^disable-model-invocation: true$' "$REPO_ROOT/src/skills" --include=SKILL.md | wc -l | tr -d ' ')"
TARGET_HIDDEN_COUNT="$(grep -Rl '^  opencode/autoinvoke: "false"$' "$TARGET_DIR/skills" --include=SKILL.md | wc -l | tr -d ' ')"
[ "$TARGET_HIDDEN_COUNT" -eq "$SOURCE_HIDDEN_COUNT" ] || {
    echo "hidden skill metadata mismatch: expected $SOURCE_HIDDEN_COUNT, found $TARGET_HIDDEN_COUNT" >&2
    exit 1
}
if grep -R '^disable-model-invocation:' "$TARGET_DIR/skills" --include=SKILL.md; then
    echo "V2 bundle still contains disable-model-invocation" >&2
    exit 1
fi

"$REPO_ROOT/scripts/build-skill-tree.sh" --check

python3 - "$TARGET_DIR/skills" <<'PY'
from pathlib import Path
import re
import sys

skills_dir = Path(sys.argv[1])
missing = []
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

# The V2 beta has no dedicated config validator. The structural checks above
# enforce its config contract; this smoke check also verifies the pinned beta
# CLI can start its standalone API from the generated checkout.
if command -v opencode2 >/dev/null 2>&1; then
    WORK="$(mktemp -d)"
    trap 'rm -rf "$WORK"' EXIT
    mkdir -p "$WORK/home"
    (
        cd "$TARGET_DIR"
        HOME="$WORK/home" \
        XDG_CONFIG_HOME="$WORK/config" \
        XDG_DATA_HOME="$WORK/data" \
        XDG_CACHE_HOME="$WORK/cache" \
            opencode2 api --standalone GET /api/skill > "$WORK/skills.json"
    )
    jq -e '.data | type == "array"' "$WORK/skills.json" >/dev/null
fi

echo "Validated OpenCode V2 bundle at $TARGET_DIR."
