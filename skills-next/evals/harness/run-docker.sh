#!/usr/bin/env bash
#
# run-docker.sh — Host wrapper: build the SHIPPED skill tree with a real plugin
# builder, stage a minimal Docker context, build the sandbox image, and run one
# eval inside it.
#
# Isolation: the host repo is NOT mounted — the agent only sees what we bake in
# (the built skills + the eval's spec/tasks/fixtures). Results and session logs
# come back via a mounted /out dir (<eval-dir>/.docker-out/). The OpenRouter key
# is passed via -e, never written into the image.
#
#   run-docker.sh <eval-dir>
#
# e.g. run-docker.sh skills-next/skills/sentry-get-started/evals/first-error
#
# Env knobs:
#   BUILDER   which plugin builder to ship (claude|cursor|codex|grok; default claude)
#   MODEL     OpenRouter model id (default openai/gpt-5.5)
#   KEY_FILE  OpenRouter key file (default skills-next/evals/.openrouter-key)
set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HARNESS_DIR/../../.." && pwd)"
EVAL_DIR="$(cd "${1:?usage: run-docker.sh <eval-dir>}" && pwd)"

BUILDER="${BUILDER:-claude}"
BUILDER_SH="$REPO_ROOT/plugin-src/$BUILDER/build.sh"
[[ -x "$BUILDER_SH" ]] || { echo "!! No builder at $BUILDER_SH (BUILDER=$BUILDER)." >&2; exit 1; }

IMAGE="sentry-skill-eval"
CTX="$HARNESS_DIR/.build/context"
DIST="$HARNESS_DIR/.build/dist"
OUT_DIR="$EVAL_DIR/.docker-out"

# OpenRouter key: $OPENROUTER_API_KEY, else the first key file that exists.
KEY="${OPENROUTER_API_KEY:-}"
if [[ -z "$KEY" ]]; then
  for kf in "${KEY_FILE:-}" "$HOME/waza-openrouter-key" "$REPO_ROOT/skills-next/evals/.openrouter-key"; do
    [[ -n "$kf" && -f "$kf" ]] && { KEY="$(tr -d '[:space:]' < "$kf")"; break; }
  done
fi
[[ -z "$KEY" ]] && { echo "!! No OpenRouter key (\$OPENROUTER_API_KEY, \$KEY_FILE, ~/waza-openrouter-key, or skills-next/evals/.openrouter-key)." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "!! Docker daemon not running. Start Docker and retry." >&2; exit 1; }

# --- 1. Build the shipped skill tree (real plugin build, skills-next content) -
echo ">> Building '$BUILDER' plugin from skills-next..."
rm -rf "$DIST"
CONTENT_ROOT="$REPO_ROOT/skills-next" "$BUILDER_SH" "$DIST" >/dev/null
SKILLS_BUILT="$DIST/skills"
# Codex nests the plugin under plugins/sentry/.
[[ -d "$SKILLS_BUILT" ]] || SKILLS_BUILT="$DIST/plugins/sentry/skills"
[[ -d "$SKILLS_BUILT" ]] || { echo "!! Built skills dir not found under $DIST." >&2; exit 1; }
echo ">> Built $(find "$SKILLS_BUILT" -name SKILL.md | wc -l | tr -d ' ') skills."

# --- 2. Stage a minimal Docker build context ----------------------------------
echo ">> Staging build context..."
rm -rf "$CTX"; mkdir -p "$CTX"
rsync -a "$SKILLS_BUILT/" "$CTX/skills/"
rsync -a --exclude='.docker-out' --exclude='.results.json' "$EVAL_DIR/" "$CTX/eval/"
cp "$HARNESS_DIR/run.sh" "$HARNESS_DIR/container-entry.sh" "$CTX/"

# --- 3. Build + run the sandbox -----------------------------------------------
echo ">> docker build..."
docker build -f "$HARNESS_DIR/Dockerfile" -t "$IMAGE" "$CTX"

mkdir -p "$OUT_DIR"
echo ">> Running eval in sandbox (host repo NOT mounted; results -> $OUT_DIR)..."
docker run --rm \
  -e OPENROUTER_API_KEY="$KEY" \
  -e MODEL="${MODEL:-openai/gpt-5.5}" \
  -e TASK="${TASK:-}" \
  -v "$OUT_DIR:/out" \
  "$IMAGE"

echo ">> Done. Results: $OUT_DIR/results.json"
