#!/usr/bin/env bash
# Install a built plugin into the current Antigravity profile and verify discovery.
# Usage: smoke.sh <TARGET_DIR>

set -euo pipefail

TARGET_DIR="$(cd "${1:?usage: smoke.sh <TARGET_DIR>}" && pwd)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

export AGY_CLI_DISABLE_AUTO_UPDATE=true

agy plugin validate "$TARGET_DIR" --strict --json
agy plugin install "$TARGET_DIR"
agy plugin list --json > "$WORK_DIR/plugins.json"

python3 - "$TARGET_DIR" "$WORK_DIR/plugins.json" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
manifest = json.loads((root / "plugin.json").read_text())
plugins = json.loads(pathlib.Path(sys.argv[2]).read_text())
plugin = next(p for p in plugins if p["name"] == manifest["name"])

assert plugin["enabled"], "Sentry plugin is disabled"
assert plugin["version"] == manifest["version"], "Installed version differs from build"

expected = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
assert expected, "Built plugin contains no skills"
discovered = set(plugin["skills"])
assert discovered == expected, f"Skill discovery differs: {discovered ^ expected}"

config = json.loads((root / "mcp_config.json").read_text())
assert set(plugin["mcpServers"]) == set(config["mcpServers"]), "MCP discovery differs"
installed = pathlib.Path(plugin["path"])
assert json.loads((installed / "mcp_config.json").read_text()) == config, "Installed MCP configuration differs from build"

print(f"Verified Sentry {plugin['version']} install, {len(expected)} skills, and MCP configuration.")
PY
