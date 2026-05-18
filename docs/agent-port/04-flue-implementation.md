# Flue Implementation Notes

This document captures cross-cutting implementation details for the Flue skill-drift automation system (Detector, Updater, Creator workflows).

---

## 6. Protected-files pattern

**The actuator uses an allow-list, not a deny-list.** The agents are designed to edit only files under `skills/`. Any path outside `skills/` triggers a downgrade-to-issue, which is the safer default for LLM-emitted patches.

```bash
ALLOWED_PATTERN='^skills/'
```

The check iterates over the agent's diff output and rejects any path that does not match:

```bash
ALLOWED_PATTERN='^skills/'
violation=""
while IFS= read -r path; do
  # Skip empty lines
  [[ -z "$path" ]] && continue
  # Strip ./ prefix defensively (git diff normalizes, but be explicit)
  normalized="${path#./}"
  if ! [[ "$normalized" =~ $ALLOWED_PATTERN ]]; then
    violation="$path"
    break
  fi
done <<<"$touched"

if [[ -n "$violation" ]]; then
  # downgrade-to-issue path
fi
```

### Why allow-list beats deny-list

Deny-lists require enumerating every sensitive path that might exist now or in the future. An LLM-influenced patch can touch a path that was never thought of — and it silently passes. Examples the old deny-list missed:

- `.husky/` — git hooks
- `.npmrc` — registry credentials
- `Dockerfile` — container build config
- `.env*` — environment variables
- `renovate.json` — dependency-update config
- `.changeset/` — release automation
- `.devcontainer/` — dev environment config
- Top-level `*.sh` scripts
- `commitlint.config.*`, `vitest.config.*`, `eslint.config.*`

An allow-list captures the invariant instead: **agents only edit skill files**. Everything else is naturally protected — current paths, future paths, and paths nobody thought to enumerate.

This addresses Warden security review **BRT-8PC** (PR #127).

> **Maintenance note:** The `ALLOWED_PATTERN` regex appears in three workflow files:
> - `.github/workflows/flue-skill-drift-detector.yml`
> - `.github/workflows/flue-skill-drift-updater.yml`
> - `.github/workflows/flue-skill-creator.yml`
>
> If you need to update the pattern (e.g., to allow `docs/` for a new agent role), change it in all three. The maintenance burden is much smaller than the old multi-path deny list — it's a single one-line regex.

---

## 12. Post-review fixes (PR #127)

### 12.1 Detector output schema

*(Documented in 01-skill-drift-detector.md)*

### 12.2 Updater patch application

*(Documented in 02-skill-updater.md)*

### 12.3 Skill tree validator step ordering

The Updater and Creator actuate jobs run the skill-tree validator **after** the protection check, not before. This is intentional:

1. Protection check runs against the agent's patch only
2. Validator runs on the post-check working tree
3. Validator's own regeneration of `SKILL_TREE.md` is committed in addition to the agent's patch

Moving the regen step before the protection check would be wrong: it would add `SKILL_TREE.md` to the diff before the check runs, causing every successful update to trip the violation guard.

### 12.4 Miscellaneous actuator hardening

Various small fixes to error handling, branch naming, and issue body formatting landed in `409e059`.

### 12.5 Allow-list hardening (Warden BRT-8PC)

Identified during PR #127 review by Warden bot (severity: HIGH). The original deny-list regex was structurally weak for LLM-emitted patches — any sensitive path not explicitly listed would pass through. Replaced with a `^skills/` allow-list across all three workflows. See §6 for the full rationale and regex.
