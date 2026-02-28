#!/usr/bin/env bash
# ============================================================
# build-skill-tree.sh — Generate and validate the Sentry skill tree
# ============================================================
# Scans all skills/*/SKILL.md files, regenerates SKILL_TREE.md,
# validates the skill hierarchy, and checks breadcrumb links.
#
# Usage:
#   scripts/build-skill-tree.sh           # regenerate + validate
#   scripts/build-skill-tree.sh --check   # validate only (no write)
#
# Exit codes: 0 = pass, 1 = errors found
# Requirements: bash 3.2+, grep, sed, awk, diff, find

set -euo pipefail

# ── Setup ────────────────────────────────────────────────────

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SKILL_TREE_FILE="SKILL_TREE.md"
SKILLS_DIR="skills"

# Temp directory for per-skill data (bash 3 compatible, no assoc arrays)
TMPDIR_SKILLS="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SKILLS"' EXIT

ERRORS=()
error() { ERRORS+=("ERROR: $*"); }
warn()  { echo "WARN: $*" >&2; }

# ============================================================
# SECTION 1: Parse frontmatter from a SKILL.md file
# Outputs: key=value lines for known fields
# ============================================================
parse_frontmatter() {
  local file="$1"
  awk '
    BEGIN { in_fm=0; fm_count=0 }
    /^---$/ {
      fm_count++
      if (fm_count == 1) { in_fm=1; next }
      if (fm_count == 2) { exit }
    }
    in_fm && /^[a-zA-Z-]+:/ {
      colon = index($0, ":")
      key = substr($0, 1, colon - 1)
      val = substr($0, colon + 2)
      # Remove leading/trailing whitespace from val
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
      # Normalize key: replace hyphens with underscores
      gsub(/-/, "_", key)
      print key "=" val
    }
  ' "$file"
}

# Write a field value to a temp file for skill $name
skill_set() {
  local name="$1" field="$2" value="$3"
  # Sanitize name for filesystem use (replace / and spaces)
  local safe_name="${name//[^a-zA-Z0-9_-]/_}"
  printf '%s' "$value" > "${TMPDIR_SKILLS}/${safe_name}.${field}"
}

# Read a field value for skill $name (empty string if missing)
skill_get() {
  local name="$1" field="$2"
  local safe_name="${name//[^a-zA-Z0-9_-]/_}"
  local f="${TMPDIR_SKILLS}/${safe_name}.${field}"
  [[ -f "$f" ]] && cat "$f" || echo ""
}

# ============================================================
# SECTION 2: Scan all skills
# ============================================================

ALL_SKILLS=()

while IFS= read -r skill_file; do
  s_name="" s_desc="" s_cat="" s_parent="" s_role="" s_disable=""

  while IFS='=' read -r key val; do
    case "$key" in
      name)                      s_name="$val" ;;
      description)               s_desc="$val" ;;
      category)                  s_cat="$val" ;;
      parent)                    s_parent="$val" ;;
      role)                      s_role="$val" ;;
      disable_model_invocation)  s_disable="$val" ;;
    esac
  done < <(parse_frontmatter "$skill_file")

  # Fall back to directory name if name field is missing
  [[ -z "$s_name" ]] && s_name="$(basename "$(dirname "$skill_file")")"

  ALL_SKILLS+=("$s_name")
  skill_set "$s_name" "desc"     "$s_desc"
  skill_set "$s_name" "category" "$s_cat"
  skill_set "$s_name" "parent"   "$s_parent"
  skill_set "$s_name" "role"     "$s_role"
  skill_set "$s_name" "disable"  "$s_disable"
  skill_set "$s_name" "file"     "$skill_file"

done < <(find "$SKILLS_DIR" -name "SKILL.md" | sort)

TOTAL_SKILLS=${#ALL_SKILLS[@]}

# ============================================================
# SECTION 3: Categorize
# ============================================================

ROUTERS=()
SKILLS_SDK_SETUP=()
SKILLS_WORKFLOW=()
SKILLS_FEATURE_SETUP=()
SKILLS_INTERNAL=()

for name in "${ALL_SKILLS[@]}"; do
  role="$(skill_get "$name" role)"
  cat="$(skill_get "$name" category)"

  if [[ "$role" == "router" ]]; then
    ROUTERS+=("$name")
  else
    case "$cat" in
      sdk-setup)     SKILLS_SDK_SETUP+=("$name") ;;
      workflow)      SKILLS_WORKFLOW+=("$name") ;;
      feature-setup) SKILLS_FEATURE_SETUP+=("$name") ;;
      internal)      SKILLS_INTERNAL+=("$name") ;;
    esac
  fi
done

TOTAL_ROUTERS=${#ROUTERS[@]}

# ============================================================
# SECTION 4: Generate SKILL_TREE.md content
# ============================================================

# Extract a short column value from a description.
# sdk-setup: "Full Sentry SDK setup for X." -> "X"
# others: first sentence
get_column_value() {
  local desc="$1"
  local category="$2"

  case "$category" in
    sdk-setup)
      echo "$desc" \
        | sed 's/Full Sentry SDK setup for //' \
        | sed 's/\. .*//' \
        | sed 's/\.$//'
      ;;
    *)
      echo "$desc" \
        | sed 's/\. .*//' \
        | sed 's/\.$//'
      ;;
  esac
}

column_header() {
  case "$1" in
    sdk-setup)     echo "Platform" ;;
    workflow)      echo "Use when" ;;
    feature-setup) echo "Feature" ;;
    internal)      echo "Purpose" ;;
    *)             echo "Notes" ;;
  esac
}

# Build markdown table rows for a list of skills in a category
build_table_rows() {
  local category="$1"
  shift
  local skills=("$@")

  for name in "${skills[@]}"; do
    local file desc col_val
    file="$(skill_get "$name" file)"
    desc="$(skill_get "$name" desc)"
    col_val="$(get_column_value "$desc" "$category")"
    printf "| [\`%s\`](%s) | %s | %s |\n" "$name" "$file" "$file" "$col_val"
  done
}

generate_skill_tree() {
  local sdk_router="sentry-sdk-setup"
  local wf_router="sentry-workflow"
  local fs_router="sentry-feature-setup"

  cat <<'HEADER'
# Sentry Skill Tree

This file maps the full skill structure for the Sentry-for-AI plugin. Read it to find the right skill for any task, then follow the path to load it.

## Quick Navigation

| If the user wants to... | Start here |
|---|---|
| Set up Sentry in a project | [`sentry-sdk-setup`](skills/sentry-sdk-setup/SKILL.md) |
| Fix issues, review code, debug production | [`sentry-workflow`](skills/sentry-workflow/SKILL.md) |
| Configure a specific Sentry feature | [`sentry-feature-setup`](skills/sentry-feature-setup/SKILL.md) |
HEADER

  # SDK Setup
  local col_sdk col_wf col_fs col_int
  col_sdk="$(column_header sdk-setup)"
  printf "\n## SDK Setup ([\`%s\`](%s))\n\n" \
    "$sdk_router" "skills/$sdk_router/SKILL.md"
  printf "| Skill | Path | %s |\n" "$col_sdk"
  printf "|---|---|---|\n"
  build_table_rows "sdk-setup" "${SKILLS_SDK_SETUP[@]}"

  # Workflow
  col_wf="$(column_header workflow)"
  printf "\n## Workflow ([\`%s\`](%s))\n\n" \
    "$wf_router" "skills/$wf_router/SKILL.md"
  printf "| Skill | Path | %s |\n" "$col_wf"
  printf "|---|---|---|\n"
  build_table_rows "workflow" "${SKILLS_WORKFLOW[@]}"

  # Feature Setup
  col_fs="$(column_header feature-setup)"
  printf "\n## Feature Setup ([\`%s\`](%s))\n\n" \
    "$fs_router" "skills/$fs_router/SKILL.md"
  printf "| Skill | Path | %s |\n" "$col_fs"
  printf "|---|---|---|\n"
  build_table_rows "feature-setup" "${SKILLS_FEATURE_SETUP[@]}"

  # Internal (no router)
  col_int="$(column_header internal)"
  printf "\n## Internal\n\n"
  printf "| Skill | Path | %s |\n" "$col_int"
  printf "|---|---|---|\n"
  build_table_rows "internal" "${SKILLS_INTERNAL[@]}"

  printf "\n"
}

# ============================================================
# SECTION 5: Validate
# ============================================================

KNOWN_CATEGORIES=("sdk-setup" "workflow" "feature-setup" "internal")

validate() {
  for name in "${ALL_SKILLS[@]}"; do
    local role cat parent disable skill_file
    role="$(skill_get "$name" role)"
    cat="$(skill_get "$name" category)"
    parent="$(skill_get "$name" parent)"
    disable="$(skill_get "$name" disable)"
    skill_file="$(skill_get "$name" file)"

    # ── (a/b/c) Required fields per skill type ───────────────

    if [[ "$role" == "router" ]]; then
      : # role: router is sufficient
    elif [[ "$cat" == "internal" ]]; then
      # (b) Internal skills
      [[ "$disable" == "true" ]] || \
        error "$name: internal skill missing 'disable-model-invocation: true'"
    else
      # (a) Regular hidden skills
      [[ -n "$cat" ]] || \
        error "$name: non-router skill missing 'category' field"
      [[ -n "$parent" ]] || \
        error "$name: non-router skill missing 'parent' field"
      [[ "$disable" == "true" ]] || \
        error "$name: non-router skill missing 'disable-model-invocation: true'"
    fi

    # ── (g) Warn on unknown category ─────────────────────────
    if [[ -n "$cat" && "$role" != "router" ]]; then
      local known=false
      for kc in "${KNOWN_CATEGORIES[@]}"; do
        [[ "$cat" == "$kc" ]] && known=true && break
      done
      $known || warn "$name: unknown category '$cat'"
    fi

    # ── (d) Parent must exist and be a router ────────────────
    if [[ -n "$parent" ]]; then
      local parent_role
      parent_role="$(skill_get "$parent" role)"
      if [[ -z "$(skill_get "$parent" file)" ]]; then
        error "$name: parent '$parent' does not exist"
      elif [[ "$parent_role" != "router" ]]; then
        error "$name: parent '$parent' is not a router (role=${parent_role:-none})"
      fi
    fi

    # ── (e) Skill appears in its router's SKILL.md ───────────
    if [[ -n "$parent" ]]; then
      local router_file
      router_file="$(skill_get "$parent" file)"
      if [[ -n "$router_file" && -f "$router_file" ]]; then
        if ! grep -q "$name" "$router_file" 2>/dev/null; then
          error "$name: not listed in router '$parent' ($router_file)"
        fi
      fi
    fi

    # ── (f) Breadcrumb links resolve ─────────────────────────
    local skill_dir
    skill_dir="$(dirname "$skill_file")"

    while IFS= read -r breadcrumb_line; do
      # Extract only markdown link paths ending in .md: ](path.md)
      # Pattern ](path) where path ends with .md (skip http links)
      while IFS= read -r link_path; do
        [[ "$link_path" =~ ^https?:// ]] && continue
        local resolved="$skill_dir/$link_path"
        if [[ ! -f "$resolved" ]]; then
          error "$name: broken breadcrumb link '$link_path' (resolved: $resolved)"
        fi
      done < <(echo "$breadcrumb_line" | grep -oE '\]\([^)]+\.md\)' | sed 's/^](\(.*\))$/\1/')
    done < <(grep '^> ' "$skill_file" 2>/dev/null || true)
  done
}

# ============================================================
# SECTION 6: Run
# ============================================================

echo "Scanning ${TOTAL_SKILLS} skills in ${SKILLS_DIR}/..."

GENERATED="$(generate_skill_tree)"

validate

# ── Stale check / write ──────────────────────────────────────

if [[ -f "$SKILL_TREE_FILE" ]]; then
  EXISTING="$(cat "$SKILL_TREE_FILE")"
  if [[ "$GENERATED" != "$EXISTING" ]]; then
    echo ""
    echo "SKILL_TREE.md diff (existing → generated):"
    diff <(echo "$EXISTING") <(echo "$GENERATED") || true
    echo ""
    if $CHECK_ONLY; then
      error "SKILL_TREE.md is stale. Run scripts/build-skill-tree.sh to regenerate."
    else
      echo "SKILL_TREE.md is stale — regenerating..."
      printf '%s\n' "$GENERATED" > "$SKILL_TREE_FILE"
      echo "SKILL_TREE.md updated."
    fi
  else
    echo "SKILL_TREE.md is up to date."
  fi
else
  if $CHECK_ONLY; then
    error "SKILL_TREE.md does not exist. Run scripts/build-skill-tree.sh to generate."
  else
    printf '%s\n' "$GENERATED" > "$SKILL_TREE_FILE"
    echo "SKILL_TREE.md created."
  fi
fi

# ── Summary ──────────────────────────────────────────────────

echo ""
echo "Summary: ${TOTAL_SKILLS} skills scanned, ${TOTAL_ROUTERS} routers, ${#ERRORS[@]} errors"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo ""
  echo "Errors:"
  for e in "${ERRORS[@]}"; do
    echo "  $e"
  done
  exit 1
fi

echo "All checks passed."
exit 0
