#!/usr/bin/env bash
#
# validate.sh — Validate the built Cursor distribution before publishing.
#
# Checks the generated manifests against Cursor's published JSON Schemas. Both
# schemas set `additionalProperties: false`, so the manifests carry no `$schema`
# key (it would be rejected as an unexpected property); the schema is supplied
# explicitly here instead.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"

SCHEMA_BASE="https://raw.githubusercontent.com/cursor/plugins/refs/heads/main/schemas"

uvx check-jsonschema --schemafile "$SCHEMA_BASE/plugin.schema.json" \
    "$TARGET_DIR/.cursor-plugin/plugin.json"
uvx check-jsonschema --schemafile "$SCHEMA_BASE/marketplace.schema.json" \
    "$TARGET_DIR/.cursor-plugin/marketplace.json"

echo "Validated Cursor dist at $TARGET_DIR."
