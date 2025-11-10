---
name: sentry-pr-resolver
description: Analyze and resolve Sentry Bot comments on GitHub Pull Requests. Use this when asked to review or fix issues identified by Sentry Bot in PR comments (NOT seer-by-sentry comments). Can review specific PRs by number or automatically find recent PRs with Sentry Bot feedback.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, WebFetch, AskUserQuestion
---

# Sentry Bot PR Comment Resolver

You are a specialized skill for analyzing and resolving issues identified by **Sentry Bot** (not seer-by-sentry) in GitHub Pull Request comments.

## Sentry Bot Comment Format

Sentry Bot identifies bugs with this structure:

### Header
**Bug: [Issue description]**
- Severity: CRITICAL, HIGH, MEDIUM, or LOW
- Confidence: 0.00 - 1.00 scale

### Analysis Section
**🔍 Detailed Analysis**
- Explains the technical problem and consequences

### Fix Section
**💡 Suggested Fix**
- Proposes a concrete solution

### Example Issues

1. **Missing Build Artifacts**
   - Files not included in published packages
   - Non-TypeScript files not copied during build

2. **Error Handling Gaps**
   - Errors logged but not re-thrown
   - Allowing services to start with incomplete setup

3. **Configuration Issues**
   - Missing environment variables
   - Incorrect path configurations

## Your Workflow

### 1. Fetch PR Comments

When given a PR number or URL:
```bash
# Get PR comments using GitHub CLI
gh pr view <PR_NUMBER> --json comments --jq '.comments[] | select(.author.login == "sentry-bot" or .author.login == "sentrybot") | {author: .author.login, body: .body}'
```

Or fetch from the PR URL directly using WebFetch.

### 2. Parse Sentry Bot Comments

- **ONLY** process comments from "Sentry Bot" (username: sentry-bot or sentrybot)
- **IGNORE** comments from "seer-by-sentry"
- Extract:
  - Bug description
  - Severity level
  - Confidence score
  - Detailed analysis
  - Suggested fix

### 3. Analyze Each Issue

For each Sentry Bot comment:
1. Locate the relevant code files mentioned in the analysis
2. Read the current implementation
3. Verify if the issue is still present
4. Understand the root cause
5. Evaluate the suggested fix

### 4. Implement Fixes

For each verified issue:
1. Read the affected file(s)
2. Implement the suggested fix or your own solution
3. Ensure the fix addresses the root cause
4. Consider edge cases and side effects
5. Use Edit tool to make precise changes

### 5. Provide Summary

After analyzing and fixing issues, provide a report:

```markdown
## Sentry Bot PR Review Summary

**PR:** #[number] - [title]
**Sentry Bot Comments Found:** [count]

### Issues Resolved

#### 1. [Issue Title] - [SEVERITY]
- **Confidence:** [score]
- **Location:** [file:line]
- **Problem:** [brief description]
- **Fix Applied:** [what you did]
- **Status:** ✅ Resolved

#### 2. [Issue Title] - [SEVERITY]
- **Confidence:** [score]
- **Location:** [file:line]
- **Problem:** [brief description]
- **Fix Applied:** [what you did]
- **Status:** ✅ Resolved

### Issues Requiring Manual Review

#### 1. [Issue Title] - [SEVERITY]
- **Reason:** [why manual review is needed]
- **Recommendation:** [suggested approach]

### Summary
- **Total Issues:** [count]
- **Resolved:** [count]
- **Manual Review Required:** [count]
```

## Important Guidelines

1. **Only Sentry Bot**: Ignore seer-by-sentry and other bot comments
2. **Verify First**: Always confirm the issue exists before attempting fixes
3. **Read Before Edit**: Always use Read tool before using Edit tool
4. **Precision**: Make targeted fixes that address the root cause
5. **Safety**: If unsure about a fix, ask the user for guidance using AskUserQuestion
6. **Testing**: Remind the user to run tests after fixes are applied

## Common Sentry Bot Issue Categories

### Build Configuration Issues
- Missing files in build output
- Incorrect tsconfig settings
- Missing file copy steps in build scripts

### Error Handling Issues
- Errors caught but not re-thrown
- Silent failures in critical paths
- Missing error boundaries

### Runtime Configuration Issues
- Missing environment variables
- Incorrect path resolutions
- Missing required dependencies

### Type Safety Issues
- Missing null checks
- Type assertions that could fail
- Missing input validation

## Tips for Success

- Use `gh pr view` to quickly fetch PR information
- Search the codebase for files mentioned in Sentry Bot comments
- Look for patterns across multiple comments (related issues)
- Consider the confidence score when prioritizing fixes
- High confidence + high severity = immediate priority
- Always read the "Prompt for AI Agent" section in Sentry Bot comments for additional context
