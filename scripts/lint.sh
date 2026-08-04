#!/usr/bin/env bash
# ============================================================
# lint.sh — the lint entrypoint, wrapping prek
# ============================================================
# prek (https://github.com/j178/prek) runs the hooks in
# .pre-commit-config.yaml: Markdown formatting via flowmark, file hygiene,
# workflow schema checks, and this repo's own skill-tree and built-link
# validators. Most of them fix rather than report, so a non-zero exit usually
# means files were rewritten and are waiting to be reviewed and staged.
#
# Usage:
#   scripts/lint.sh                        # every hook over every file
#   scripts/lint.sh run --files a.md b.md  # scope to some files
#   scripts/lint.sh run flowmark           # one hook by id
#   scripts/lint.sh install                # install the git pre-commit hook
#
# With no arguments this runs `prek run --all-files`; anything else is passed
# to prek verbatim.
#
# Requirements: uv (for uvx)

set -euo pipefail

PREK_VERSION="0.4.12"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ $# -eq 0 ]]; then
  set -- run --all-files
fi

exec uvx --quiet --from "prek==${PREK_VERSION}" prek "$@"
