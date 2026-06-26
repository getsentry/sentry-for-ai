#!/usr/bin/env bash
#
# run.sh — Run a waza eval against a built skill tree. Designed to run INSIDE the
# Docker sandbox (run-docker.sh), where it defaults to the baked-in /app paths;
# it also works locally if you point SKILLS_SRC / EVAL_DIR at real dirs.
#
# The skills are the SHIPPED artifact: run-docker.sh builds them with a real
# plugin builder (plugin-src/<agent>/build.sh, default claude) so the eval
# exercises what actually ships, references hydrated and all.
#
# How skills reach the agent: waza loads them from the eval's `skill_directories`
# config and advertises them to the Copilot session (an <available_skills>
# summary; with inject_skill_body off the agent discovers and invokes them
# itself). It does NOT read ~/.copilot/skills. Since the built-skills path is
# environment-specific, we inject `skill_directories` into a generated run spec
# here rather than committing it to eval.yaml.
#
# MCP is intentionally NOT wired yet (deferred). Until a Sentry MCP is attached,
# the agent will orient and then stall when it needs to provision a project or
# verify an event — that stall is the expected signal to wire MCP next (see
# README.md). Provider is OpenRouter, so no GitHub Copilot auth is needed.
set -euo pipefail

SKILLS_SRC="${SKILLS_SRC:-/app/skills}"
EVAL_DIR="${EVAL_DIR:-/app/eval}"
MODEL="${MODEL:-openai/gpt-5.5}"
RESULTS="${RESULTS:-$EVAL_DIR/.results.json}"
SESSION_DIR="${SESSION_DIR:-$EVAL_DIR}"

RUN_SPEC="$EVAL_DIR/.eval.run.yaml"
cleanup() { rm -f "$RUN_SPEC"; }
trap cleanup EXIT

# --- Generate the run spec: inject skill_directories -> the built skill tree --
# (waza scans each skill_directories entry for */SKILL.md.)
python3 - "$EVAL_DIR/eval.yaml" "$SKILLS_SRC" "$RUN_SPEC" <<'PY'
import sys, re
src, skdir, out = sys.argv[1:4]
y = open(src).read()
y = re.sub(r'(\nconfig:\n)', r'\1  skill_directories:\n    - "%s"\n' % skdir, y, count=1)
open(out, 'w').write(y)
PY
echo ">> Skills for agent: $(find "$SKILLS_SRC" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') (skill_directories -> $SKILLS_SRC)"

# --- Provider: custom OpenAI-compat (OpenRouter); no Copilot auth required ----
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required (env). Aborting.}"
export COPILOT_PROVIDER_BASE_URL="https://openrouter.ai/api/v1"
export COPILOT_PROVIDER_TYPE="openai"
export COPILOT_PROVIDER_WIRE_API="completions"
export COPILOT_PROVIDER_API_KEY="$OPENROUTER_API_KEY"
export COPILOT_PROVIDER_WIRE_MODEL="$MODEL"
export COPILOT_PROVIDER_MODEL_ID="gpt-5.5"
# Headless eval: auto-approve tool / MCP startup (no human to approve prompts).
export COPILOT_ALLOW_ALL="true"
echo ">> Provider: OpenRouter (model $MODEL); COPILOT_ALLOW_ALL=true"

# --- Run ----------------------------------------------------------------------
# Context-dir is the lone fixture app under fixtures/ — waza loads each task's
# inputs.files relative to it.
CONTEXT_DIR="${CONTEXT_DIR:-$(find "$EVAL_DIR/fixtures" -mindepth 1 -maxdepth 1 -type d | head -1)}"
echo ">> Context dir: $CONTEXT_DIR"

cd "$EVAL_DIR"
# Optional: TASK is a name/ID glob to run a single task (e.g. "*signup*").
TASK_ARGS=()
[[ -n "${TASK:-}" ]] && TASK_ARGS=(--task "$TASK")

waza run .eval.run.yaml \
  --context-dir "$CONTEXT_DIR" \
  "${TASK_ARGS[@]}" \
  -v --keep-workspace --no-update-check \
  --output "$RESULTS" \
  --session-log --session-dir "$SESSION_DIR"

echo ">> Results JSON: $RESULTS"
echo ">> Session logs: $SESSION_DIR"
