#!/usr/bin/env bash
#
# build-common.sh — Shared helpers for the per-agent plugin builders.
#
# Each src/plugins/<agent>/build.sh sources this for the steps that are identical
# across agents: resolving the content root and assembling the skill tree (copy +
# reference hydration), SKILL_TREE.md, and the manifest and MCP config. Agent-specific
# bits — file locations, Codex's subdir layout and skill transform — stay inline in
# each builder.
#
# Source it after cd-ing to the repo root:
#   source "$REPO_ROOT/scripts/build-common.sh"
#   resolve_content_root "$REPO_ROOT/src"

# Directory holding this file and its sibling scripts (hydrate-references.py).
_BUILD_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The one release version every agent's manifest ships. Resolved from this
# script's location rather than CONTENT_ROOT: the version belongs to the plugin
# metadata, so a build over an alternate content tree still stamps it.
_PLUGIN_VERSION_FILE="$_BUILD_COMMON_DIR/../src/plugins/version.json"

# Resolve CONTENT_ROOT to an absolute path, defaulting to the given content root
# (the repo's src/ dir), so a relative override resolves predictably.
#   resolve_content_root <content_root>   -> sets global CONTENT_ROOT
resolve_content_root() {
    CONTENT_ROOT="$(cd "${CONTENT_ROOT:-$1}" && pwd)"
}

# Copy the skill tree from a content root into <dest>, then hydrate each skill's
# declared shared references and strip the build-time manifests. Copy and
# hydration are paired here so the two can never drift apart. The hydration step
# only runs (and only spawns uv) when some skill actually declares references.
#   copy_skills <content_root> <dest_skills_dir>
copy_skills() {
    rsync -a "$1/skills/" "$2/"
    if compgen -G "$1/skills/*/references.yml" > /dev/null; then
        uv run --script "$_BUILD_COMMON_DIR/hydrate-references.py" \
            --references "$1/references" --skills-source "$1/skills" --skills-output "$2"
    fi
}

# Copy SKILL_TREE.md from a content root, if present.
#   copy_skill_tree <content_root> <dest_path>
copy_skill_tree() {
    if [[ -f "$1/SKILL_TREE.md" ]]; then
        cp "$1/SKILL_TREE.md" "$2"
    fi
}

# Write an agent's plugin manifest to its built location with the release version
# stamped over the `0.0.0` placeholder the source manifests carry.
# src/plugins/version.json holds the single value, so all distributions version in
# lockstep and a release bumps one file.
#
# Set PLUGIN_VERSION to stamp something else. The develop deploy uses it to label
# a build that is not a release with scripts/dev-version.sh output.
# Inline `mcpServers` (Claude) get the install_mcp_config headers too.
#   install_plugin_manifest <src_manifest> <dest_manifest> <plugin_name>
install_plugin_manifest() {
    _stamp_plugin_json manifest "$1" "$2" "$3"
}

# Write an MCP config with the distribution name and plugin version stamped into
# each server's X-Sentry-Plugin / X-Sentry-Plugin-Version headers, so MCP
# telemetry can tell plugins and releases apart. Headers rather than the URL: the
# URL is the OAuth resource, and changing it can force a re-auth.
#   install_mcp_config <src_mcp_json> <dest_mcp_json> <plugin_name>
install_mcp_config() {
    _stamp_plugin_json mcp "$1" "$2" "$3"
}

_stamp_plugin_json() {
    python3 - "$1" "$2" "$3" "${4:?plugin name required}" "$_PLUGIN_VERSION_FILE" <<'PY'
import json
import os
import sys

kind, source, dest, plugin_name, version_file = sys.argv[1:6]

version = os.environ.get("PLUGIN_VERSION")
if not version:
    with open(version_file) as f:
        version = json.load(f)["version"]

with open(source) as f:
    data = json.load(f)

if kind == "manifest":
    data["version"] = version

servers = data.get("mcpServers", {})
if kind == "mcp" and not servers:
    raise SystemExit(f"{source} declares no mcpServers")
# Codex's manifest points `mcpServers` at its .mcp.json path instead of inlining.
if isinstance(servers, dict):
    for server in servers.values():
        headers = server.setdefault("headers", {})
        headers["X-Sentry-Plugin"] = plugin_name
        headers["X-Sentry-Plugin-Version"] = version

with open(dest, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
}
