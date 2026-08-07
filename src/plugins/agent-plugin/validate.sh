#!/usr/bin/env bash
#
# validate.sh — Validate the portable Agent Plugins distribution.
#
# The published schemas enforce the closed manifest and MCP configuration
# shapes. Structural checks enforce package containment and the Agent Skills
# frontmatter and naming constraints against the emitted, hydrated skills.
#
# Usage: validate.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"
SCHEMA_BASE="https://agent-plugins.org/schemas/1.0.0"

uvx check-jsonschema --schemafile "$SCHEMA_BASE/plugin.schema.json" \
    "$TARGET_DIR/plugin.json"
uvx check-jsonschema --schemafile "$SCHEMA_BASE/mcp.schema.json" \
    "$TARGET_DIR/mcp.json"

python3 - "$TARGET_DIR" <<'PY'
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve(strict=True)

for required, kind in (("plugin.json", "file"), ("mcp.json", "file"), ("skills", "directory")):
    path = root / required
    valid = path.is_file() if kind == "file" else path.is_dir()
    if not valid:
        raise SystemExit(f"{required} must be a {kind}")
    if not path.resolve().is_relative_to(root):
        raise SystemExit(f"{required} resolves outside the plugin root")

for path in root.rglob("*"):
    if not path.resolve().is_relative_to(root):
        raise SystemExit(f"package path resolves outside the plugin root: {path}")

skills = root / "skills"
for skill in skills.iterdir():
    if not skill.is_dir():
        continue

    definition = skill / "SKILL.md"
    if not definition.is_file():
        continue
    if not definition.resolve().is_relative_to(root):
        raise SystemExit(f"SKILL.md resolves outside the plugin root: {skill.name}")

    lines = definition.read_text().splitlines()
    if not lines or lines[0] != "---":
        raise SystemExit(f"SKILL.md has no YAML frontmatter: {skill.name}")

    try:
        end = lines.index("---", 1)
    except ValueError:
        raise SystemExit(f"SKILL.md has unterminated YAML frontmatter: {skill.name}")

    fields = {}
    for line in lines[1:end]:
        match = re.match(r"^([a-z-]+):(?:\s+(.*))?$", line)
        if match:
            fields[match.group(1)] = match.group(2) or ""

    name = fields.get("name", "")
    description = fields.get("description", "")
    if name != skill.name:
        raise SystemExit(f"skill name must match its directory: {skill.name}")
    if not re.fullmatch(r"(?!.*--)[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?", name):
        raise SystemExit(f"invalid Agent Skill name: {name!r}")
    if not 1 <= len(description) <= 1024:
        raise SystemExit(f"skill description must be 1-1024 characters: {skill.name}")
    if not any(line.strip() for line in lines[end + 1:]):
        raise SystemExit(f"SKILL.md body is empty: {skill.name}")
PY

echo "Validated Agent Plugins dist at $TARGET_DIR."
