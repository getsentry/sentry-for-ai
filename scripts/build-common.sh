#!/usr/bin/env bash
#
# build-common.sh — Shared helpers for the per-agent plugin builders.
#
# Each plugin-src/<agent>/build.sh sources this for the steps that are identical
# across agents: resolving the content root and assembling the skill tree (copy +
# reference hydration), commands, and SKILL_TREE.md. Agent-specific bits —
# manifest locations, the MCP file, Codex's subdir layout and skill transform —
# stay inline in each builder.
#
# Source it after cd-ing to the repo root:
#   source "$REPO_ROOT/scripts/build-common.sh"
#   resolve_content_root "$REPO_ROOT"

# Directory holding this file and its sibling scripts (hydrate-references.py).
_BUILD_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve CONTENT_ROOT to an absolute path, defaulting to the given repo root, so
# a relative override (e.g. CONTENT_ROOT=skills-next) resolves predictably.
#   resolve_content_root <repo_root>   -> sets global CONTENT_ROOT
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

# Copy commands/ from a content root, if it has any.
#   copy_commands <content_root> <dest_commands_dir>
copy_commands() {
    if [[ -d "$1/commands" ]]; then
        rsync -a "$1/commands/" "$2/"
    fi
}

# Copy SKILL_TREE.md from a content root, if present.
#   copy_skill_tree <content_root> <dest_path>
copy_skill_tree() {
    if [[ -f "$1/SKILL_TREE.md" ]]; then
        cp "$1/SKILL_TREE.md" "$2"
    fi
}
