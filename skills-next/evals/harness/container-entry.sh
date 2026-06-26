#!/usr/bin/env bash
#
# Container entrypoint. Runs the eval against the baked-in skills + eval, writing
# results and session logs to the mounted /out dir so they survive container
# exit. The agent is confined to the container — the host repo is never mounted.
set -uo pipefail

RESULTS=/out/results.json SESSION_DIR=/out /app/run.sh
status=$?

# run.sh writes straight to /out, but copy any stragglers just in case.
mkdir -p /out
cp -f /app/eval/.results.json /out/ 2>/dev/null || true

exit "$status"
