---
name: sentry-code-review
description: Analyze and resolve Sentry's bot comments on GitHub Pull Requests — both sentry[bot] review comments and Seer Bug Prediction (seer-by-sentry[bot]) findings. Use when asked to review or fix issues Sentry flagged on a PR, or to find recent PRs with unresolved Sentry feedback.
license: Apache-2.0
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, WebFetch, AskUserQuestion
category: workflow
parent: sentry-workflow
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Workflow](../sentry-workflow/SKILL.md) > Code Review

# Sentry Code Review

Resolve issues Sentry flagged in GitHub Pull Request review comments. Two bot sources, same
comment format and workflow:

| Source | Bot login | What it is |
|---|---|---|
| Sentry PR review | `sentry[bot]` | Line-specific review comments |
| Seer Bug Prediction | `seer-by-sentry[bot]` | Predicted-bug findings (the [Seer by Sentry](https://github.com/apps/seer-by-sentry) GitHub App) |

**Only process those two logins.** Ignore `cursor[bot]` or other bots. Note `seer-by-sentry[bot]`
is distinct from `sentry[bot]` — match both explicitly (a `startswith("sentry")` filter misses
Seer).

## Invoke This Skill When

- User asks to "review/fix Sentry comments" or "address Seer findings" on a PR
- User shares a PR URL/number mentioning Sentry or Seer feedback
- User wants to find PRs with unresolved Sentry/Seer comments

## Prerequisites

- `gh` CLI installed and authenticated.
- For Seer findings: the Seer by Sentry GitHub App installed on the repo.

**Important:** The comment body format below reflects current output, not an API contract — verify
the actual structure. SDK/code samples in comments are illustrative; confirm before applying.

## Phase 1 — Fetch comments

Given a PR number, fetch line comments from both bots:

```bash
gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --paginate \
  --jq '.[] | select(.user.login == "sentry[bot]" or .user.login == "seer-by-sentry[bot]")
        | {author: .user.login, file: .path, line: .line, body: .body}'
```

Or fetch from the PR URL with WebFetch.

If no PR number is given, find recent PRs with such comments:

```bash
gh pr list --state open --json number --limit 20 | jq -r '.[].number' | while read pr; do
  count=$(gh api "repos/{owner}/{repo}/pulls/$pr/comments" --paginate \
    --jq '[.[] | select(.user.login == "sentry[bot]" or .user.login == "seer-by-sentry[bot]")] | length')
  [ "$count" -gt 0 ] && echo "PR #$pr: $count Sentry/Seer comments"
done
```

## Phase 2 — Parse each comment

Both bots post the same markdown body with collapsible sections. Extract:

- **Bug description** — line starting with `**Bug:**`
- **Severity / Confidence** — `<sub>Severity: X | Confidence: X.XX</sub>`
- **Detailed Analysis** — inside the `🔍 <b>Detailed Analysis</b>` `<details>` block
- **Suggested Fix** — inside the `💡 <b>Suggested Fix</b>` block
- **AI Agent Prompt** — inside the `🤖 <b>Prompt for AI Agent</b>` block (location + issue context)

Keep the `file` and `line` from the comment metadata — that's exactly where to look.

## Phase 3 — Verify & fix

For each comment:

1. Read the file at the specified line.
2. **Confirm the issue still exists** in current code (not already fixed in a later commit).
3. Assess whether it's real or a false positive — review surrounding code.
4. Implement the fix (use the suggested fix as a starting point, or your own); address the root
   cause, consider edge cases and regression risk.
5. Always Read before Edit. If unsure about a fix, ask the user (AskUserQuestion).

## Phase 4 — Report

```markdown
## Sentry Code Review: PR #[number]

### Resolved
| File:Line | Issue | Severity | Source | Fix Applied |
|-----------|-------|----------|--------|-------------|

### Skipped (false positive or already fixed)
| File:Line | Issue | Reason |
|-----------|-------|--------|

**Summary:** X resolved, Y skipped
```

Remind the user to run tests after fixes.

## Seer review triggers (for `seer-by-sentry[bot]`)

| Trigger | When |
|---------|------|
| PR set to "Ready for Review" | Automatic prediction |
| Commit pushed while PR is ready | Re-runs prediction |
| `@sentry review` comment | Manual full review |
| Draft PR | Skipped until marked ready |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No comments found | Verify the bot/App is active on the repo |
| Bot name mismatch | Logins are `sentry[bot]` and `seer-by-sentry[bot]` |
| Seer comments missing on new PRs | PR must be "Ready for Review", not draft |
| `gh api` returns partial results | Include `--paginate` |

## Common issue categories

Type safety (missing null checks, unsafe assertions) · error handling (swallowed errors, missing
boundaries) · validation (permissive inputs, missing sanitization) · config (missing env vars,
incorrect paths) · build configuration (missing output files, copy steps).
