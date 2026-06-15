#!/usr/bin/env bash
#
# validate.sh — Validate the built Grok distribution before publishing.
#
# Grok has no published JSON Schema. We always run structural checks (the two
# manifests are valid JSON and the marketplace catalog is present), and when the
# `grok` CLI is available (local dev) we additionally run its native
# `grok plugin validate`. CI runners do not have the grok CLI, so the structural
# checks are the gate there.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"

for f in "$TARGET_DIR/plugin.json" "$TARGET_DIR/.grok-plugin/marketplace.json"; do
    [ -f "$f" ] || { echo "missing required file: $f" >&2; exit 1; }
    jq empty "$f"
done

if command -v grok >/dev/null 2>&1; then
    grok plugin validate "$TARGET_DIR"
fi

echo "Validated Grok dist at $TARGET_DIR."
