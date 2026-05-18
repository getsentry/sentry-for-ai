#!/usr/bin/env bash
# Smoke test for the Flue Skill Creator agent.
#
# WARNING: This is the heaviest agent — it does research, clones SDK
# repos, writes a full skill bundle. Expect runs of 5-15 minutes and
# costs of $2-$10 per run.
#
# Usage:
#   ANTHROPIC_API_KEY=... GH_TOKEN=... ./scripts/test-flue-creator.sh <platform> [prompt]
#
# Examples:
#   ./scripts/test-flue-creator.sh nuxt
#   ./scripts/test-flue-creator.sh remix "focus on App Router compatibility"

set -euo pipefail

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}"
: "${GH_TOKEN:=${GITHUB_TOKEN:-}}"
if [ -z "${GH_TOKEN}" ]; then
  echo "Error: GH_TOKEN or GITHUB_TOKEN must be set." >&2
  exit 1
fi
export GH_TOKEN

PLATFORM="${1:?Usage: $0 <platform> [prompt]}"
PROMPT="${2:-}"

if [ -n "$PROMPT" ]; then
  PAYLOAD=$(jq -c -n --arg p "$PLATFORM" --arg q "$PROMPT" '{platform:$p, prompt:$q}')
else
  PAYLOAD=$(jq -c -n --arg p "$PLATFORM" '{platform:$p}')
fi
OUT=/tmp/flue-creator-result.json

echo "=== Flue Creator smoke test ==="
echo "Agent:    skill-creator"
echo "Model:    anthropic/claude-opus-4-6 (live API call — costs $2-$10)"
echo "Platform: $PLATFORM"
[ -n "$PROMPT" ] && echo "Prompt:   $PROMPT"
echo "Output:   $OUT"
echo "NOTE:     This agent edits/creates many files. Run from a fresh branch."
echo
read -rp "Continue? [y/N] " yn
[[ "$yn" =~ ^[Yy]$ ]] || { echo "aborted"; exit 0; }

npx flue run skill-creator --target node \
  --id "smoketest-creator-${PLATFORM}-$(date +%s)" \
  --payload "$PAYLOAD" \
  > "$OUT"

echo
echo "=== Result ==="
jq . "$OUT"
echo
echo "=== Files changed/created ==="
git status --short

if jq -e '.skill and .platform and (.files_created | type == "array")' "$OUT" > /dev/null; then
  echo "PASS: output has 'skill', 'platform', 'files_created' keys"
else
  echo "FAIL: output does not match expected CreatorOutput schema" >&2
  exit 1
fi
