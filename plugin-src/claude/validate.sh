#!/usr/bin/env bash
#
# validate.sh — Validate the built Claude distribution before publishing.
#
# Checks the generated manifests against Claude Code's published JSON Schemas
# (the same ones the manifests reference via their `$schema` keys for editor
# autocomplete). check-jsonschema does not read `$schema` out of the instance,
# so the schema is supplied explicitly.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"

PLUGIN_SCHEMA="https://json.schemastore.org/claude-code-plugin-manifest.json"
MARKETPLACE_SCHEMA="https://json.schemastore.org/claude-code-marketplace.json"

uvx check-jsonschema --schemafile "$PLUGIN_SCHEMA" \
    "$TARGET_DIR/.claude-plugin/plugin.json"
uvx check-jsonschema --schemafile "$MARKETPLACE_SCHEMA" \
    "$TARGET_DIR/.claude-plugin/marketplace.json"

echo "Validated Claude dist at $TARGET_DIR."
