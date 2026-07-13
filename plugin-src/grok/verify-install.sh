#!/usr/bin/env bash
#
# verify-install.sh — Live-install and basic runtime validation of the built
# Grok distribution using the real `grok` CLI.
#
# Proves that `grok plugin install`, manifest parsing, skill/command registration,
# and basic loading work against the exact tree shape that will be published.
#
# Usage: verify-install.sh <TARGET_DIR>   (a tree produced by build.sh)
#
# The script is idempotent-ish for the CLI install and safe to run locally or in CI.
# It will attempt to install the grok CLI if not already on PATH.

set -euo pipefail

TARGET_DIR="${1:?usage: verify-install.sh <TARGET_DIR>}"

echo "=== Ensuring grok CLI is available ==="
if ! command -v grok >/dev/null 2>&1; then
    echo "grok CLI not found; installing via official installer..."
    curl -fsSL https://x.ai/cli/install.sh | bash
fi

# Common install locations
export PATH="$HOME/.local/bin:$HOME/.grok/bin:$PATH"
hash -r 2>/dev/null || true

grok --version || true

echo "=== Live install from $TARGET_DIR (local path) ==="
grok plugin install "$TARGET_DIR" --trust

echo "=== Introspection via grok CLI ==="
grok plugin list | cat
grok plugin details sentry | cat
grok plugin validate "$TARGET_DIR"

echo "=== Best-effort functional smoke test (prompt, no MCP) ==="
# Use script(1) to give the agent a PTY (many CLIs behave better non-interactively this way).
# Fall back gracefully if script is unavailable.
if command -v script >/dev/null 2>&1; then
    PROMPT_OUT=$(script -q -c \
        'grok -p "Name the three primary Sentry router skills (sentry-sdk-setup etc) from the loaded plugin. Output only the names as a comma separated list." ' \
        /dev/null 2>&1 | cat) || true
else
    echo "(no script(1); running prompt directly)"
    PROMPT_OUT=$(grok -p \
        'Name the three primary Sentry router skills (sentry-sdk-setup etc) from the loaded plugin. Output only the names as a comma separated list.' \
        2>&1 | cat) || true
fi
echo "$PROMPT_OUT" | grep -E 'sentry-sdk-setup|sentry-workflow|sentry-feature-setup' \
    || echo "::warning::Grok prompt check did not surface expected skill names (auth or model availability may be limited)"

echo "=== Grok verify-install complete ==="
