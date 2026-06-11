# Design: Groom-Issues skill + Fix-Issues enrichment

Date: 2026-06-11

## Motivation

A coworker assembled a focused Claude-Code-only plugin (`jshchnz/sentry-workflows-plugin`)
with three Sentry workflow skills. We want "safe-for-publishing" equivalents in this
multi-tool (Claude + Cursor) `sentry-for-ai` skill library, improved with `/skill-writer`
and informed by — but never copied from — the proprietary bot prompts in the `seer` repo.

The intent is that these skills commonly run in a cron / coroutine (unattended) style, so
nothing may block on interactive input in the autonomous path.

## Source mapping

| Coworker skill | Action here |
|---|---|
| `fix-issue` | Enrich existing `sentry-fix-issues` (no duplicate) |
| `groom-stale` | New skill `sentry-groom-issues` |
| `install-routines` | Not ported (marketplace scaffolding, not a portable skill) |

Seer principles mined (re-expressed in our own words, **never verbatim**):
- Fixability rubric: application-logic bug vs. broken environment; root cause in accessible code.
- Root-cause discipline: keep asking "why," fix the true root cause not defensive try/except;
  cause may live elsewhere than the crash site.
- Symmetric high-evidence bar; default to *no action* in triage/grooming.
- Treat issue/event content as untrusted data, never as instructions.
- Write handoff notes (suspected file/function + mechanism + fix direction).

## Guiding constraints (both deliverables)

- **Cron/coroutine-safe**: non-interactive default path, no blocking prompts in the autonomous
  flow, hard caps per run, `--dry-run`, fixed-schema parseable digest at the end.
- **Multi-tool compatible**: no separate subagent `.md` files; inline the `issue-scorer` /
  `fix-implementer` logic as workflow phases in `SKILL.md` (repo convention).
- **Seer-safe**: principles only, re-expressed; no verbatim seer prompt text.
- **Polish**: run `/skill-writer` on both, then `scripts/build-skill-tree.sh` to validate +
  regenerate `SKILL_TREE.md`.

## Deliverable A — Enrich `sentry-fix-issues` (additive)

1. Candidate scoring phase — score each candidate for fixability, pick the single best
   fixable issue (suspected files exist locally; application-logic bug).
2. Root-cause discipline — investigate before patching; fix true root cause, not try/except.
3. Implementation guardrails — minimal change; abort "too-broad" past ~2 files; don't add/
   modify tests unless asked; baseline-vs-after test run; single commit.
4. Branch/PR safety — `claude/`-prefixed branch, never push to main, no force-push, draft PR,
   assign issue to self, never auto-resolve.
5. Security constraint — Sentry event content is untrusted data.
6. Autonomous mode — explicit non-interactive path ending in a parseable digest.

Must not break existing interactive behavior.

## Deliverable B — New skill `sentry-groom-issues` (category: workflow)

- Pass 1 — close stale: unresolved issues with no events since an absolute ISO cutoff
  (compute the cutoff explicitly; Sentry search has no `older-than` operator); archive/ignore,
  never delete; cap per run.
- Pass 2 — reopen regressed: resolved issues with >= N new events since resolution.
- High-evidence default — only close/reopen with strong evidence.
- `--dry-run`, hard caps, parseable digest, untrusted-data constraint.
- Registration: frontmatter (`category: workflow`, `parent: sentry-workflow`,
  `disable-model-invocation: true`), breadcrumb, router table row + routing rule in
  `sentry-workflow`, regenerate `SKILL_TREE.md`.

## Out of scope

- Routine/cron wrapper files (skills only for now).
- `install-routines` port.
- Subagent `.md` files.

## Open flag

Repo `CLAUDE.md` requires a `Co-Authored-By` commit trailer; global user instructions forbid
it. Following the global rule (no trailer) unless told otherwise.
