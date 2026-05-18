#!/usr/bin/env bash
# Smoke test for the Flue Skill Drift Updater agent.
#
# WARNING: This script calls the Anthropic API AND will edit files in
# the working tree (since the agent uses sandbox: 'local'). Run from
# a clean branch and `git restore .` afterwards if you don't want
# to keep the edits.
#
# Usage:
#   # Fixture mode (default):
#   ANTHROPIC_API_KEY=... GH_TOKEN=... ./scripts/test-flue-updater.sh
#   # Real issue mode:
#   ANTHROPIC_API_KEY=... GH_TOKEN=... ./scripts/test-flue-updater.sh --issue 117

set -euo pipefail

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}"
: "${GH_TOKEN:=${GITHUB_TOKEN:-}}"
if [ -z "${GH_TOKEN}" ]; then
  echo "Error: GH_TOKEN or GITHUB_TOKEN must be set." >&2
  exit 1
fi
export GH_TOKEN

FIXTURE="scripts/fixtures/flue-updater-issue.json"
OUT=/tmp/flue-updater-result.json

case "${1:-}" in
  --issue)
    ISSUE_NUMBER="${2:?--issue requires a number}"
    PAYLOAD=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,url \
              | jq -c '{issue_number: .number, issue_title: .title, issue_body: .body, issue_url: .url}')
    ;;
  ""|--fixture)
    if [ ! -f "$FIXTURE" ]; then
      echo "Fixture not found: $FIXTURE" >&2
      exit 1
    fi
    PAYLOAD=$(jq -c . "$FIXTURE")
    ;;
  *)
    echo "Usage: $0 [--issue <N>|--fixture]" >&2
    exit 1
    ;;
esac

echo "=== Flue Updater smoke test ==="
echo "Agent:   skill-drift-updater"
echo "Model:   anthropic/claude-opus-4-6 (live API call — costs money)"
echo "Payload: $(echo "$PAYLOAD" | jq -r '"issue_number=\(.issue_number) title=\(.issue_title)"')"
echo "Output:  $OUT"
echo "NOTE:    This agent edits files in the working tree (sandbox: 'local')."
echo
read -rp "Continue? [y/N] " yn
[[ "$yn" =~ ^[Yy]$ ]] || { echo "aborted"; exit 0; }

npx flue run skill-drift-updater --target node \
  --id "smoketest-updater-$(date +%s)" \
  --payload "$PAYLOAD" \
  > "$OUT"

echo
echo "=== Result ==="
jq . "$OUT"
echo
echo "=== Files changed ==="
git status --short

if jq -e '.skill and (.summary | type == "string")' "$OUT" > /dev/null; then
  echo "PASS: output has 'skill' and 'summary' keys"
else
  echo "FAIL: output does not match expected UpdaterOutput schema" >&2
  exit 1
fi
