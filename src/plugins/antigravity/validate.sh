#!/usr/bin/env bash
# Validate the built package against the Antigravity publishing guide.
# Usage: validate.sh <TARGET_DIR>

set -euo pipefail

TARGET_DIR="${1:?usage: validate.sh <TARGET_DIR>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SRC_DIR/../../.."

python3 - "$TARGET_DIR" <<'PY'
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve(strict=True)

for path in root.rglob("*"):
    if not path.resolve().is_relative_to(root):
        raise SystemExit(f"package path resolves outside the plugin root: {path}")

with (root / "plugin.json").open() as f:
    manifest = json.load(f)

for field in ("name", "displayName", "description", "version", "logo"):
    value = manifest.get(field)
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"{field} must be a nonempty string")

if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", manifest["name"]) or len(manifest["name"]) > 64:
    raise SystemExit("name must be lowercase kebab-case with at most 64 characters")

# Develop builds carry the shared release pipeline's SemVer prerelease stamp.
if not re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-dev\.[0-9]+\.g[0-9a-f]+)?", manifest["version"]):
    raise SystemExit("version must be a release version or a develop build stamp")

author = manifest.get("author")
if not isinstance(author, dict) or not author.get("name"):
    raise SystemExit("author.name is required")

prompts = manifest.get("suggestedPrompts")
if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3:
    raise SystemExit("suggestedPrompts must contain 1-3 prompts")
if any(not isinstance(prompt, str) or not prompt.strip() for prompt in prompts):
    raise SystemExit("suggestedPrompts entries must be nonempty strings")

logo = root / manifest["logo"]
if not logo.resolve().is_relative_to(root) or not logo.is_file():
    raise SystemExit("logo must reference a bundled file")

for required in ("README.md", "LICENSE"):
    if not (root / required).is_file():
        raise SystemExit(f"{required} is required")

if not list((root / "skills").glob("*/SKILL.md")):
    raise SystemExit("package must contain Agent Skills")
if list((root / "skills").glob("*/references.yml")):
    raise SystemExit("skill references must be hydrated before publishing")

with (root / "mcp_config.json").open() as f:
    servers = json.load(f)["mcpServers"]

with open("mcp.json") as f:
    source = json.load(f)["mcpServers"]["sentry"]

if servers != {"sentry": {"serverUrl": source["url"]}}:
    raise SystemExit("MCP configuration must use serverUrl for the Sentry endpoint")
PY

echo "Validated Antigravity dist at $TARGET_DIR."
