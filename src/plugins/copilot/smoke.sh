#!/usr/bin/env bash
# Install a built Copilot marketplace and verify its discovered components.
# Usage: smoke.sh <TARGET_DIR>

set -euo pipefail

TARGET_DIR="$(cd "${1:?usage: smoke.sh <TARGET_DIR>}" && pwd)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

export COPILOT_HOME="$WORK_DIR/home"
export COPILOT_CACHE_HOME="$WORK_DIR/cache"
cd "$WORK_DIR"

copilot --no-auto-update plugin marketplace add "$TARGET_DIR"
copilot --no-auto-update plugin install sentry@sentry-copilot-marketplace
copilot --no-auto-update plugin list --json > plugins.json
copilot --no-auto-update skill list --json > skills.json
copilot --no-auto-update mcp get sentry --json > mcp.json

python3 - "$TARGET_DIR" <<'PYTHON'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
manifest = json.loads((root / "plugin.json").read_text())
plugins = json.loads(pathlib.Path("plugins.json").read_text())
skills = json.loads(pathlib.Path("skills.json").read_text())
servers = json.loads(pathlib.Path("mcp.json").read_text())

plugin = next(p for p in plugins if p["name"] == "sentry"
              and p.get("marketplace") == "sentry-copilot-marketplace")
assert plugin["enabled"], "Sentry plugin is disabled"
assert plugin["version"] == manifest["version"], "Installed version differs from build"

expected = {p.parent.name for p in (root / "skills").glob("*/SKILL.md")}
assert expected, "Built plugin contains no skills"
discovered = {s["name"] for s in skills if s["source"] == "plugin" and s["enabled"]}
assert discovered == expected, f"Skill discovery differs: {discovered ^ expected}"

server = servers["sentry"]
expected_server = json.loads((root / "mcp.json").read_text())["mcpServers"]["sentry"]
assert server["enabled"], "Sentry MCP server is disabled"
assert server["source"] == "plugin", "Sentry MCP server did not come from the plugin"
assert server["sourcePlugin"] == manifest["name"], "Unexpected MCP source plugin"
assert server["type"] == "http", "Sentry MCP server must use HTTP"
assert server["url"] == expected_server["url"], "MCP endpoint differs from build"
print(f"Verified Sentry marketplace install, {len(expected)} skills, and MCP configuration.")
PYTHON
