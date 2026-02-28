---
name: sentry-pr-code-review
description: Review a project's PRs to check for issues detected in code review by Seer Bug Prediction. Use when asked to review or fix issues identified by Sentry in PR comments, or to find recent PRs with Sentry feedback.
license: Apache-2.0
---

# Sentry Code Review

Review and fix issues identified by Seer (by Sentry) in GitHub PR comments.

## Invoke This Skill When

- User asks to "review Sentry comments" or "fix Sentry issues" on a PR
- User shares a PR URL/number and mentions Sentry or Seer feedback
- User asks to "address Sentry review" or "resolve Sentry findings"
- User wants to find PRs with unresolved Sentry comments

## Prerequisites

- `gh` CLI installed and authenticated
- Repository has the [Seer by Sentry](https://github.com/apps/seer-by-sentry) GitHub App installed

**Important:** The comment format parsed below is based on Seer's current output. This is not an API contract and may change. Always verify the actual comment structure.

## Phase 1: Fetch Seer Comments

```bash
gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments --paginate \
  --jq '.[] | select(.user.login == "seer-by-sentry[bot]") | {file: .path, line: .line, body: .body}'
```

**The bot login is `seer-by-sentry[bot]`** — not `sentry[bot]` or `sentry-io[bot]`.

If no PR number is given, find recent PRs with Seer comments:

```bash
gh pr list --state open --json number,title --limit 20 | \
  jq -r '.[].number' | while read pr; do
    count=$(gh api "repos/{owner}/{repo}/pulls/$pr/comments" --paginate \
      --jq '[.[] | select(.user.login == "seer-by-sentry[bot]")] | length')
    [ "$count" -gt 0 ] && echo "PR #$pr: $count Seer comments"
  done
```

## Phase 2: Parse Each Comment

Extract from the markdown body:
- **Bug description**: Line starting with `**Bug:**`
- **Severity/Confidence**: In `<sub>Severity: X | Confidence: X.XX</sub>`
- **Analysis**: Inside `<summary>🔍 <b>Detailed Analysis</b></summary>` block
- **Suggested Fix**: Inside `<summary>💡 <b>Suggested Fix</b></summary>` block
- **AI Prompt**: Inside `<summary>🤖 <b>Prompt for AI Agent</b></summary>` block

## Phase 3: Verify & Fix

For each issue:
1. Read the file at the specified line
2. Confirm issue still exists in current code (not already fixed in a later commit)
3. Review surrounding code to assess if it's an actual issue or false positive
4. Implement fix (use suggested fix as starting point, or write your own)
5. Consider edge cases and regression risk

## Phase 4: Summarize and Report Results

```markdown
## Seer Review: PR #[number]

### Resolved
| File:Line | Issue | Severity | Fix Applied |
|-----------|-------|----------|-------------|
| path:123  | desc  | HIGH     | what done   |

### Skipped (false positive or already fixed)
| File:Line | Issue | Reason |
|-----------|-------|--------|

**Summary:** X resolved, Y skipped
```

## Seer Review Triggers

| Trigger | When |
|---------|------|
| PR set to "Ready for Review" | Automatic error prediction |
| Commit pushed while PR is ready | Re-runs prediction |
| `@sentry review` comment | Manual trigger for full review + suggestions |
| Draft PR | Skipped — no review until marked ready |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No Seer comments found | Verify the Seer GitHub App is installed on the repo |
| Bot name mismatch | The login is `seer-by-sentry[bot]`, not `sentry[bot]` |
| Comments not appearing on new PRs | PR must be "Ready for Review" (not draft) |
| `gh api` returns partial results | Ensure `--paginate` flag is included |

## Common Issue Types

| Category | Examples |
|----------|----------|
| Type Safety | Missing null checks, unsafe type assertions |
| Error Handling | Swallowed errors, missing boundaries |
| Validation | Permissive inputs, missing sanitization |
| Config | Missing env vars, incorrect paths |
