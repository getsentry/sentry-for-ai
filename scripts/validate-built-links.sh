#!/usr/bin/env bash
#
# validate-built-links.sh — Build every agent's plugin and check its links.
#
# The skills we ship are only self-contained *after* the build: references are
# hydrated in from the shared library, and each agent applies its own transform.
# So the tree worth validating is the built one, per agent — that is what a user
# installs, and it is the only place a missing reference actually shows up.
#
# Each build is well under a second and needs no network or credentials, so this
# is cheap enough to run on every pull request.
#
# Usage: validate-built-links.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

status=0

for build in src/plugins/*/build.sh; do
    agent="$(basename "$(dirname "$build")")"
    target="$WORK_DIR/$agent"
    mkdir -p "$target"

    # Builders are chatty about hydration counts; keep the signal to failures.
    if ! "$build" "$target" > "$WORK_DIR/$agent.log" 2>&1; then
        echo "error: $agent build failed" >&2
        cat "$WORK_DIR/$agent.log" >&2
        status=1
        continue
    fi

    # Agents disagree on layout (Codex nests under plugins/<name>/), so locate
    # the skills dir by finding where the SKILL.md files actually landed.
    skills_dir="$(find "$target" -name SKILL.md -exec dirname {} \; \
        | xargs -n1 dirname | sort -u | head -1)"

    if [[ -z "$skills_dir" ]]; then
        echo "error: $agent build produced no skills" >&2
        status=1
        continue
    fi

    ./scripts/validate-skill-links.py \
        --skills "$skills_dir" \
        --references src/references \
        --label "$agent" || status=1
done

exit $status
