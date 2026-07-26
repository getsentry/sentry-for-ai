#!/usr/bin/env bash
#
# build-common.sh — Shared helpers for the per-agent plugin builders.
#
# Each src/plugins/<agent>/build.sh sources this for the steps that are identical
# across agents: resolving the content root and assembling the skill tree (copy +
# reference hydration) and SKILL_TREE.md. Agent-specific bits — manifest
# locations, the MCP file, Codex's subdir layout and skill transform — stay
# inline in each builder.
#
# Source it after cd-ing to the repo root:
#   source "$REPO_ROOT/scripts/build-common.sh"
#   resolve_content_root "$REPO_ROOT/src"

# Directory holding this file and its sibling scripts (hydrate-references.py).
_BUILD_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve CONTENT_ROOT to an absolute path, defaulting to the given content root
# (the repo's src/ dir), so a relative override resolves predictably.
#   resolve_content_root <content_root>   -> sets global CONTENT_ROOT
resolve_content_root() {
    CONTENT_ROOT="$(cd "${CONTENT_ROOT:-$1}" && pwd)"
}

# Copy the skill tree from a content root into <dest>, then hydrate each skill's
# declared shared references and strip the build-time manifests. Copy and
# hydration are paired here so the two can never drift apart. The hydration step
# only runs (and only spawns uv) when some skill actually declares references.
#   copy_skills <content_root> <dest_skills_dir>
copy_skills() {
    rsync -a "$1/skills/" "$2/"
    if compgen -G "$1/skills/*/references.yml" > /dev/null; then
        uv run --script "$_BUILD_COMMON_DIR/hydrate-references.py" \
            --references "$1/references" --skills-source "$1/skills" --skills-output "$2"
    fi
}

# Fail the build if any skill points at a Markdown file that isn't in the built
# tree. A skill only ships what its references.yml declares, so a reference that
# links a sibling the manifest omits reads fine in the source repo and dangles in
# every published plugin. Run this last — after both the skills and SKILL_TREE.md
# are in place — and pass the directory breadcrumbs resolve against, so
# `../../SKILL_TREE.md` from skills/<name>/SKILL.md is checked where it lands.
#   check_skill_links <plugin_root>
check_skill_links() {
    python3 - "$1" <<'PY'
import os, re, sys

root = sys.argv[1]
broken = []
for dirpath, _, filenames in os.walk(root):
    for filename in filenames:
        if not filename.endswith(".md"):
            continue
        path = os.path.join(dirpath, filename)
        with open(path, encoding="utf-8") as handle:
            body = handle.read()
        # Local links to .md files; skip URLs and pure anchors.
        for match in re.finditer(r"\]\((?!https?://|#)([^)#]+\.md)", body):
            target = os.path.normpath(os.path.join(dirpath, match.group(1)))
            if not os.path.exists(target):
                broken.append(f"  {os.path.relpath(path, root)} -> {match.group(1)}")

if broken:
    print(f"ERROR: {len(broken)} skill link(s) point outside the built tree:", file=sys.stderr)
    print("\n".join(sorted(broken)), file=sys.stderr)
    print(
        "\nAdd the target to the skill's references.yml, or drop the link.",
        file=sys.stderr,
    )
    sys.exit(1)
PY
}

# Copy SKILL_TREE.md from a content root, if present.
#   copy_skill_tree <content_root> <dest_path>
copy_skill_tree() {
    if [[ -f "$1/SKILL_TREE.md" ]]; then
        cp "$1/SKILL_TREE.md" "$2"
    fi
}
