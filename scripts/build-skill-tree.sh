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
    local file desc col_val skill_path
    file="$(skill_get "$name" file)"
    desc="$(skill_get "$name" desc)"
    col_val="$(get_column_value "$desc" "$category")"
    # Strip leading "skills/" from file path for the fetchable URL path
    skill_path="${file#skills/}"
    printf "| %s | [\`%s\`](%s) | \`%s\` |\n" "$col_val" "$name" "$file" "$skill_path"
  done
}

# Build keyword lookup rows for SDK skills
# Maps common platform keywords to fetchable paths
build_keyword_lookup() {
  for name in ${SKILLS_SDK_SETUP[@]+"${SKILLS_SDK_SETUP[@]}"}; do
    local file keywords skill_path
    file="$(skill_get "$name" file)"
    skill_path="${file#skills/}"

    case "$name" in
      sentry-android-sdk)
        keywords="android, kotlin, java, jetpack compose" ;;
      sentry-browser-sdk)
        keywords="browser, vanilla js, javascript, jquery, cdn, wordpress, static site" ;;
      sentry-cloudflare-sdk)
        keywords="cloudflare, cloudflare workers, cloudflare pages, wrangler, durable objects, d1, hono" ;;
      sentry-cocoa-sdk)
        keywords="ios, macos, swift, cocoa, tvos, watchos, visionos, swiftui, uikit" ;;
      sentry-dotnet-sdk)
        keywords=".net, csharp, c#, asp.net, maui, wpf, winforms, blazor, azure functions" ;;
      sentry-flutter-sdk)
        keywords="flutter, dart, sentry_flutter, pubspec, dio" ;;
      sentry-go-sdk)
        keywords="go, golang, gin, echo, fiber" ;;
      sentry-elixir-sdk)
        keywords="elixir, phoenix, plug, liveview, oban, quantum, mix" ;;
      sentry-nestjs-sdk)
        keywords="nestjs, nest" ;;
      sentry-nextjs-sdk)
        keywords="nextjs, next.js, next" ;;
      sentry-node-sdk)
        keywords="node, nodejs, node.js, bun, deno, express, fastify, koa, hapi" ;;
      sentry-php-sdk)
        keywords="php, laravel, symfony" ;;
      sentry-python-sdk)
        keywords="python, django, flask, fastapi, celery, starlette" ;;
      sentry-react-native-sdk)
        keywords="react native, expo" ;;
      sentry-react-sdk)
        keywords="react, react router, tanstack, redux, vite" ;;
      sentry-react-router-framework-sdk)
        keywords="react-router framework, @sentry/react-router, @react-router/dev, react-router reveal" ;;
      sentry-tanstack-start-sdk)
        keywords="tanstack start, tanstack react start, @tanstack/react-start, tanstackstart-react" ;;
      sentry-ruby-sdk)
        keywords="ruby, rails, sinatra, sidekiq, rack" ;;
      sentry-svelte-sdk)
        keywords="svelte, sveltekit" ;;
      *)
        keywords="$name" ;;
    esac

    printf "| %s | \`%s\` |\n" "$keywords" "$skill_path"
  done
}

generate_skill_tree() {
  cat <<'HEADER'
# Sentry Skills

You are **Sentry's AI assistant**. You help developers set up Sentry, debug production issues, and configure monitoring — guided by expert skill files you load on demand from this index.

## How to Use These Skills

Tell your AI coding assistant:

    Use curl to download, read and follow: https://skills.sentry.dev/sdks

Or for a specific SDK:

    Use curl to download, read and follow: https://skills.sentry.dev/sentry-nextjs-sdk/SKILL.md

**Why curl?** Skills are detailed 10–20 KB markdown files. Fetch tools (like WebFetch) often summarize them, losing critical configuration details. `curl -sL` guarantees the full content.

### Entry Points

| URL | What it loads |
|---|---|
| `https://skills.sentry.dev/` | This page — full skill index |
| `https://skills.sentry.dev/sdks` | SDK setup — detect platform and install Sentry |
| `https://skills.sentry.dev/workflows` | Workflows — debug issues, review code, upgrade SDKs |
| `https://skills.sentry.dev/features` | Features — AI monitoring, alerts, OpenTelemetry |

### Fetching Individual Skills

Append the skill path from the `Path` column in the tables below:

    https://skills.sentry.dev/<skill-name>/SKILL.md

Do not guess or shorten URLs. Use exact paths from the tables.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume what the user needs based on their project files. Do not start installing packages, creating files, or running commands until you have confirmed the user's intent.

1. **Ask first.** Greet the user and ask what they'd like help with. Present these options:
   - **Set up Sentry** — Add error monitoring, performance tracing, and session replay to a project
   - **Debug a production issue** — Investigate errors and exceptions using Sentry data
   - **Configure a feature** — AI/LLM monitoring, alerts, OpenTelemetry pipelines
   - **Review code** — Resolve Sentry bot comments or check for predicted bugs
   - **Upgrade Sentry SDK** — Migrate to a new major version

2. **Wait for their answer.** Do not proceed until the user tells you what they want.

3. **Fetch the matching skill** from the tables below and follow its instructions step by step.

Each skill file contains its own detection logic, prerequisites, and configuration steps. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---
HEADER

  # SDK Setup
  local col_sdk col_wf col_fs
  col_sdk="$(column_header sdk-setup)"

  cat <<'SDK_HEADER'

## SDK Setup

Install and configure Sentry for any platform. If unsure which SDK fits, detect the platform from the user's project files (`package.json`, `go.mod`, `requirements.txt`, `Gemfile`, `*.csproj`, `build.gradle`, etc.).

SDK_HEADER
  printf "| %s | Skill | Path |\n" "$col_sdk"
  printf "|---|---|---|\n"
  build_table_rows "sdk-setup" ${SKILLS_SDK_SETUP[@]+"${SKILLS_SDK_SETUP[@]}"}

  cat <<'SDK_ROUTING'

### Platform Detection Priority

When multiple SDKs could match, prefer the more specific one:

- **Android** (`build.gradle` with android plugin) → `sentry-android-sdk`
- **NestJS** (`@nestjs/core`) → `sentry-nestjs-sdk` over `sentry-node-sdk`
- **Next.js** → `sentry-nextjs-sdk` over `sentry-react-sdk` or `sentry-node-sdk`
- **React Router Framework** (`@sentry/react-router` or `@react-router/*`) → `sentry-react-router-framework-sdk` over `sentry-react-sdk`
- **TanStack Start React** (`@tanstack/react-start`) → `sentry-tanstack-start-sdk` over `sentry-react-sdk`
- **React Native** → `sentry-react-native-sdk` over `sentry-react-sdk`
- **PHP** with Laravel or Symfony → `sentry-php-sdk`
- **Node.js / Bun / Deno** without a specific framework → `sentry-node-sdk`
- **Browser JS** (vanilla, jQuery, static sites) → `sentry-browser-sdk`
- **No match** → direct user to [Sentry Docs](https://docs.sentry.io/platforms/)
SDK_ROUTING

  # Workflows
  col_wf="$(column_header workflow)"
  cat <<'WF_HEADER'

## Workflows

Debug production issues and maintain code quality with Sentry context.

WF_HEADER
  printf "| %s | Skill | Path |\n" "$col_wf"
  printf "|---|---|---|\n"
  build_table_rows "workflow" ${SKILLS_WORKFLOW[@]+"${SKILLS_WORKFLOW[@]}"}

  # Feature Setup
  col_fs="$(column_header feature-setup)"
  cat <<'FS_HEADER'

## Feature Setup

Configure specific Sentry capabilities beyond basic SDK setup.

FS_HEADER
  printf "| %s | Skill | Path |\n" "$col_fs"
  printf "|---|---|---|\n"
  build_table_rows "feature-setup" ${SKILLS_FEATURE_SETUP[@]+"${SKILLS_FEATURE_SETUP[@]}"}

  # Quick Lookup section
  cat <<'LOOKUP_HEADER'

## Quick Lookup

Match your project to a skill by keywords. Append the path to `https://skills.sentry.dev/` to fetch.

| Keywords | Path |
|---|---|
LOOKUP_HEADER
  build_keyword_lookup

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
  for e in ${ERRORS[@]+"${ERRORS[@]}"}; do
    echo "  $e"
  done
  exit 1
fi

echo "All checks passed."
exit 0
