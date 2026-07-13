#!/usr/bin/env bash
#
# verify-install.sh — Live-install and basic runtime validation of the built
# Codex distribution using the real `codex` CLI.
#
# Proves that `codex plugin marketplace add` + `codex plugin add` succeed
# for the special Codex layout (plugins/sentry/ + .agents/plugins/marketplace.json
# + the agents/openai.yaml transforms for hidden skills).
#
# Usage: verify-install.sh <TARGET_DIR>   (a tree produced by build.sh)

set -euo pipefail

TARGET_DIR="${1:?usage: verify-install.sh <TARGET_DIR>}"

echo "=== Ensuring codex CLI is available ==="
if ! command -v codex >/dev/null 2>&1; then
    echo "codex CLI not found; installing via official installer..."
    CODEX_NON_INTERACTIVE=1 curl -fsSL https://chatgpt.com/codex/install.sh | sh
fi

export PATH="$HOME/.codex/packages/standalone/current/bin:$HOME/.local/bin:$PATH"
hash -r 2>/dev/null || true

codex --version || true

echo "=== Clean any previous test marketplace (harmless if absent) ==="
codex plugin marketplace remove sentry-plugin-marketplace 2>/dev/null || true

echo "=== Live marketplace add from $TARGET_DIR ==="
codex plugin marketplace add "$TARGET_DIR"

echo "=== Live plugin add ==="
codex plugin add sentry@sentry-plugin-marketplace

echo "=== Introspection via codex CLI ==="
codex plugin list | grep -A2 -B2 'sentry-plugin-marketplace' | cat || true

# Note: Many Codex prompt invocations are sensitive to TTY/PTY.
# The marketplace add + plugin add + list above are the primary signals
# that the agent's own plugin system accepted and registered the bundle.
# A best-effort prompt can be added here later with `script` if desired.

echo "=== Codex verify-install complete ==="
