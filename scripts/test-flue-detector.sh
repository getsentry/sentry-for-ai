#!/usr/bin/env bash
# Smoke test for the Flue Skill Drift Detector agent.
#
# WARNING: This script calls the Anthropic API and WILL spend credits.
# Estimated cost per run: $0.20 - $1.00 depending on PR volume.
#
# Usage:
#   ANTHROPIC_API_KEY=sk-... GH_TOKEN=ghp_... ./scripts/test-flue-detector.sh [since]
#
# Defaults to "7 days ago".

set -euo pipefail

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}"
: "${GH_TOKEN:=${GITHUB_TOKEN:-}}"
if [ -z "${GH_TOKEN}" ]; then
  echo "Error: GH_TOKEN or GITHUB_TOKEN must be set (the Detector uses 'gh' CLI for PR lookups)." >&2
  exit 1
fi
export GH_TOKEN

SINCE="${1:-7 days ago}"
PAYLOAD=$(jq -c -n --arg s "$SINCE" '{since:$s}')
OUT=/tmp/flue-detector-result.json

echo "=== Flue Detector smoke test ==="
echo "Agent:   skill-drift-detector"
echo "Model:   anthropic/claude-opus-4-6 (live API call — costs money)"
echo "Payload: $PAYLOAD"
echo "Output:  $OUT"
echo
read -rp "Continue? [y/N] " yn
[[ "$yn" =~ ^[Yy]$ ]] || { echo "aborted"; exit 0; }

npx flue run skill-drift-detector --target node \
  --id "smoketest-detector-$(date +%s)" \
  --payload "$PAYLOAD" \
  > "$OUT"

echo
echo "=== Result ==="
jq . "$OUT"

# Quick schema sanity check
if jq -e '.actions and (.actions | type == "array") and (.summary | type == "string")' "$OUT" > /dev/null; then
  echo "PASS: output has 'actions' array and 'summary' string"
else
  echo "FAIL: output does not match expected DetectorOutput schema" >&2
  exit 1
fi
