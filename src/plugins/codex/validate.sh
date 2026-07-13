#!/usr/bin/env bash
#
# validate.sh — Validate the built Codex distribution before publishing.
#
# Codex has no published JSON Schema; OpenAI ships an authoritative validator
# script instead. We run it (pinned to a known-good commit) against the built
# plugin root. It enforces an allow-list of manifest keys — which is why the
# Codex manifest carries no `$schema` — and also checks the bundled SKILL.md /
# agents/openai.yaml files this dist generates. The validator needs PyYAML,
# supplied on the fly via `uv run --with`.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"
PLUGIN_ROOT="$TARGET_DIR/plugins/sentry"

# Pinned to openai/codex; bump the SHA to track upstream contract changes.
VALIDATOR_SHA="cdc1d592df7f066c141025cc8ae80bb3202580b6"
VALIDATOR_URL="https://raw.githubusercontent.com/openai/codex/${VALIDATOR_SHA}/codex-rs/skills/src/assets/samples/plugin-creator/scripts/validate_plugin.py"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
VALIDATOR="$WORK/validate_plugin.py"
curl -fsSL "$VALIDATOR_URL" -o "$VALIDATOR"

uv run --with pyyaml "$VALIDATOR" "$PLUGIN_ROOT"

echo "Validated Codex dist at $TARGET_DIR."
