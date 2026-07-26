#!/usr/bin/env bash
# ============================================================
# build-skill-tree.sh — Generate and validate the Sentry skill tree
# ============================================================
# Scans all src/skills/*/SKILL.md files, regenerates src/SKILL_TREE.md,
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

SKILL_TREE_FILE="src/SKILL_TREE.md"
SKILLS_DIR="src/skills"

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
STANDALONE=()
SKILLS_SDK_SETUP=()
SKILLS_WORKFLOW=()
SKILLS_FEATURE_SETUP=()

for name in "${ALL_SKILLS[@]}"; do
  role="$(skill_get "$name" role)"
  cat="$(skill_get "$name" category)"

  if [[ "$role" == "router" ]]; then
    ROUTERS+=("$name")
  elif [[ -z "$cat" ]]; then
    # Standalone skill: flat and self-contained, no router/category. These are
    # the next-generation skills; the router/leaf skills below are migrating
    # toward this shape.
    STANDALONE+=("$name")
  else
    case "$cat" in
      sdk-setup)     SKILLS_SDK_SETUP+=("$name") ;;
      workflow)      SKILLS_WORKFLOW+=("$name") ;;
      feature-setup) SKILLS_FEATURE_SETUP+=("$name") ;;
      internal)      ;; # validated but not shown in public skill tree
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

  for name in ${skills[@]+"${skills[@]}"}; do
    local file desc col_val
    file="$(skill_get "$name" file)"
    desc="$(skill_get "$name" desc)"
    col_val="$(get_column_value "$desc" "$category")"
    printf "| %s | [\`%s\`](%s) |\n" "$col_val" "$name" "${file#src/}"
  done
}

# Escape characters that would break a markdown table cell.
escape_cell() {
  printf '%s' "$1" | tr '\n' ' ' | sed 's/|/\\|/g'
}

# Build markdown rows for standalone skills, using the full description (it is
# the routing signal for these flat skills).
build_standalone_rows() {
  for name in ${STANDALONE[@]+"${STANDALONE[@]}"}; do
    local file desc
    file="$(skill_get "$name" file)"
    desc="$(escape_cell "$(skill_get "$name" desc)")"
    printf "| [\`%s\`](%s) | %s |\n" "$name" "${file#src/}" "$desc"
  done
}

# Emit one "## <title>" section with its skill table, or nothing when the
# category has no skills.
#   emit_category_section <title> <blurb> <category> [skill...]
emit_category_section() {
  local title="$1" blurb="$2" category="$3"
  shift 3

  [[ $# -eq 0 ]] && return 0

  printf "\n## %s\n\n%s\n\n" "$title" "$blurb"
  printf "| %s | Skill |\n" "$(column_header "$category")"
  printf "|---|---|\n"
  build_table_rows "$category" "$@"
}

generate_skill_tree() {
  cat <<'HEADER'
# Sentry Skills

You are **Sentry's AI assistant**. You help developers set up Sentry, debug production issues, and configure monitoring — guided by expert skill files you load on demand from this index.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Confirm what the user wants before you install a package, create a file, or run a command — their project files tell you what platform they're on, not what they came here to do.

1. **Match the request to a skill** in the tables below, and read that skill before acting. Each one carries its own detection logic, prerequisites, and steps. Trust the skill — follow it rather than improvising a shortcut.
2. **When the request is open-ended** ("set up Sentry", "help me with Sentry", or nothing specific at all), read `sentry-get-started`. It greets the user, probes the project and the Sentry account cheaply, and hands off to the right skill from there.

---
HEADER

  # Standalone Skills — flat, self-contained; surfaced first.
  cat <<'STANDALONE_HEADER'

## Standalone Skills

Self-contained skills — start here. If you're not sure what the user needs, read `sentry-get-started`; it orients you and points to the right skill.

| Skill | What it does |
|---|---|
STANDALONE_HEADER
  build_standalone_rows

  # Router-backed categories. A category with no skills left renders nothing —
  # an empty table would advertise a section the tree can't route to.
  emit_category_section \
    "Workflows" \
    "Keep an existing Sentry setup healthy." \
    "workflow" \
    ${SKILLS_WORKFLOW[@]+"${SKILLS_WORKFLOW[@]}"}

  emit_category_section \
    "Feature Setup" \
    "Configure specific Sentry capabilities beyond basic SDK setup." \
    "feature-setup" \
    ${SKILLS_FEATURE_SETUP[@]+"${SKILLS_FEATURE_SETUP[@]}"}

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
    elif [[ -z "$cat" ]]; then
      # (a) Standalone skill — flat and self-contained. Only a name (guaranteed
      # via directory fallback) and a description are required; no category,
      # parent, breadcrumb, or disable-model-invocation.
      [[ -n "$(skill_get "$name" desc)" ]] || \
        error "$name: standalone skill missing 'description' field"
    elif [[ "$cat" == "internal" ]]; then
      # (b) Internal skills
      [[ "$disable" == "true" ]] || \
        error "$name: internal skill missing 'disable-model-invocation: true'"
    else
      # (c) Router leaf skills
      [[ -n "$parent" ]] || \
        error "$name: leaf skill missing 'parent' field"
      [[ "$disable" == "true" ]] || \
        error "$name: leaf skill missing 'disable-model-invocation: true'"
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

    # ── (f) Breadcrumb links resolve (router/leaf skills only) ──
    # Standalone skills link shared references (references/…) that are copied
    # in by the build's hydrate step, so they don't exist beside the raw
    # source; skip the sibling-link check for them.
    if [[ "$role" != "router" && -z "$cat" ]]; then
      continue
    fi

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
  for e in ${ERRORS[@]+"${ERRORS[@]}"}; do
    echo "  $e"
  done
  exit 1
fi

echo "All checks passed."
exit 0
