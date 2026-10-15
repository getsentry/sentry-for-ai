#!/usr/bin/env bash
# Validate the Copilot distribution against the Agent Plugins 1.0 contract.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SRC_DIR/../agent-plugin/validate.sh" "${1:?usage: validate.sh <TARGET_DIR>}"
