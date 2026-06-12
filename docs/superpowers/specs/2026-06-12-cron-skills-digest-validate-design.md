# Design: Cron skills — issue-digest, validate-fixes + shared agent-activity marker

Date: 2026-06-12

## Motivation

Following the "Agentic Actions on Issues" Notion ideation and a 5-lens ideation pass, three
cron/coroutine skills scored highest. We build two now — `sentry-issue-digest` (read-only daily
awareness) and `sentry-validate-fixes` (closing-the-loop validation, Notion Workflow C) — and
define a small shared **agent-activity marker** so `sentry-fix-issues`, `sentry-validate-fixes`,
and a future `sentry-triage-issues` leave consistent, machine-findable records.

`sentry-triage-issues`, `sentry-agent-activity-digest`, and `sentry-investigate-spike` are
deferred (out of scope here).

## Constraints (carried from the existing cron skills)

- **Cron-safe**: non-interactive default path, never blocks on prompts, hard caps per run,
  `--dry-run`, fixed-schema parseable digest.
- **Self-contained**: each skill is fetched individually (~10–20 KB). No cross-skill shared
  reference file — the marker schema is defined canonically here and inlined compactly in each
  skill that emits or reads it.
- **Seer-safe**: principles only, no verbatim proprietary text.
- **Multi-tool**: no subagent files; inline logic as phases.

## Part 1 — Shared agent-activity marker (Notion primitive 1)

A compact structured record an agent leaves on a Sentry issue so later skills and humans can see
what work was done. Versioned for forward compatibility.

```json
{
  "schema": "sentry-agent-activity/v1",
  "actor_name": "sentry-fix-issues",
  "source": "cron | claude-code | cursor",
  "action_type": "fix_pr_opened | fix_validated | reopened_regression | investigated_no_fix | blocked_handoff | triaged_noise | prioritized | needs_review",
  "issue": "PROJECT-123",
  "confidence": "high | medium | low",
  "summary": "<= 200 chars, one line",
  "linked_artifacts": ["https://github.com/org/repo/pull/123", "frontend@1.2.9"],
  "human_review_required": false,
  "timestamp": "<ISO 8601>"
}
```

**Durability / where it is written** (graceful degradation; verify tool availability at build time):
1. Preferred: an issue **comment** containing a sentinel-delimited block so it is machine-findable:
   `<!-- sentry-agent-activity:v1 {…json…} -->`
2. Fallback if no comment-create tool: embed the compact marker in the `update_issue` `reason`
   string and/or the draft PR body.

**Who emits what:**
- `sentry-fix-issues`: `fix_pr_opened` (with PR URL) when it opens a draft PR.
- `sentry-validate-fixes`: `fix_validated` or `reopened_regression`.
- (future `sentry-triage-issues`: `triaged_noise` / `prioritized` / `needs_review`.)

`sentry-issue-digest` does **not** emit or require markers (it reports Sentry state, not agent
actions). Reading markers in bulk is the future `sentry-agent-activity-digest`'s job.

**Open question (resolve at build):** does the Sentry MCP expose a comment create/read tool? If
not, the fallback chain above is the contract. `sentry-validate-fixes` must not depend on the
marker — see Part 3.

## Part 2 — sentry-issue-digest (category: workflow)

Read-only daily/weekly situational-awareness digest. **Zero writes — never calls `update_issue`.**

- **Config**: `ORG_SLUG` (req), `PROJECT_SLUG` (opt), `WINDOW` (default `24h`), `TOP_N`
  (default `10`).
- **Preflight**: `find_projects`; abort cleanly into the digest on no access.
- **Sections** (each capped at `TOP_N`, ranked):
  1. Top new issues in `WINDOW` (`firstSeen:-<WINDOW>`), by event frequency + users affected.
  2. New regressions (recently reopened / regressed).
  3. Biggest movers (escalating frequency).
  4. Optional release-health (`find_releases`; crash-free rate if available — note it may not be).
- **Output**: fixed-schema digest sized for a single Slack thread post.
- **Hard rules**: never writes; bounded; parseable; non-interactive.

## Part 3 — sentry-validate-fixes (category: workflow)

Daily closing-the-loop check. MCP read-driven with at most **one bounded reversible write**
(reopen). Native Sentry signals are primary; the agent-activity marker is a precision enhancement.

- **Config**: `ORG_SLUG` (req), `PROJECT_SLUG` (opt), `MIN_EVENTS_TO_FAIL` (default `3`),
  `MIN_SETTLE_DAYS` (default `2`, time a fix must age before "confirmed"), `--dry-run`, caps (50).
- **Preflight**: `find_projects`; abort cleanly.
- **Candidate discovery** (union, deduped):
  1. Marker-based (preferred when available): issues carrying a `fix_pr_opened` marker.
  2. Native fallback: `is:resolved` issues resolved in a release (resolve/release boundary
     available from issue activity / `find_releases`).
- **Per candidate**: determine the fix/release boundary timestamp; count events after it via
  `search_events` (`timestamp:>BOUNDARY`, pinned `statsPeriod`). Verdict:
  - **fix-confirmed**: events-after `< MIN_EVENTS_TO_FAIL` AND boundary older than
    `MIN_SETTLE_DAYS`. Optional `fix_validated` marker. No status change.
  - **still-occurring-after-fix**: events-after `>= MIN_EVENTS_TO_FAIL`. High signal → reopen
    (`update_issue` unresolved) + `reopened_regression` marker, unless `--dry-run`.
  - **regressed-after-archive**: an `ignored` issue crossing back (new events) → flag; reopen only
    on strong evidence.
  - **pending**: boundary younger than `MIN_SETTLE_DAYS` → leave alone.
- **High-evidence default**: ambiguous → no action. Only reopen on clear failure.
- **Output**: fixed-schema digest with per-verdict sections (always present, even empty).
- **Hard rules**: never delete; never *close* (validation only reopens/flags); cap 50; `--dry-run`
  checked at each write site; per-issue error → accumulate and continue; untrusted-data constraint.

## Registration (both new skills)

Frontmatter (`category: workflow`, `parent: sentry-workflow`, `disable-model-invocation: true`,
`allowed-tools`), breadcrumb, router routing-rule + table row in `sentry-workflow`, regenerate
`SKILL_TREE.md` via `scripts/build-skill-tree.sh`. Update `AGENTS.md` workflow table.

Also: small enrichment to `sentry-fix-issues` to **emit a `fix_pr_opened` marker** in Phase 7.

## Out of scope

- `sentry-triage-issues`, `sentry-agent-activity-digest`, `sentry-investigate-spike`.
- Slack/cron wiring (skills only; outputs are digest-shaped for a future routine).
- `sentry-pr-code-review` cron-hardening.

## Open questions

1. Sentry MCP comment create/read tool availability (drives marker durability mechanism).
2. Crash-free-session data availability for the optional release-health digest section.
3. Confirm `find_releases` / event-after-release query shape against the live MCP.
