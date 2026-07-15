# Quality Checklist

Rubric for evaluating SDK skill bundles before merge. Every item must pass.

## Main SKILL.md

### Spec Compliance

| Check | Requirement |
|-------|-------------|
| Focus | Wizard flow + quick start + reference dispatch; deep dives belong in `references/` |
| `name` field | Matches directory name, kebab-case, 1-64 chars |
| `description` field | Under 1024 chars, includes trigger phrases, no angle brackets |
| `license` field | `Apache-2.0` |
| No content before `---` | YAML frontmatter must be the first thing in the file |

### Wizard Flow

| Phase | Must include |
|-------|-------------|
| Phase 1: Detect | Real bash commands that work on actual projects. Not pseudo-code. |
| Phase 2: Recommend | Opinionated feature matrix. "Always / when detected / optional" — NOT "maybe consider". |
| Phase 3: Guide | Install commands, quick start init, framework middleware, reference dispatch table. |
| Phase 4: Cross-Link | Frontend/backend detection, specific skill suggestions with table. |

### Content Quality

| Check | Pass criteria |
|-------|--------------|
| Quick Start config | Enables the most features with sensible defaults. Not a minimal config. |
| Framework table | Exact import paths, middleware calls, and framework-specific quirks. |
| Config reference | Table with option name, type, default, purpose. |
| Environment variables | Which env vars the SDK reads and what they map to. |
| Verification | Real test snippet — not "check the dashboard". |
| Troubleshooting | 5+ common issues with concrete solutions. |

## Reference Files

### Per-File Checks

| Check | Requirement |
|-------|-------------|
| Minimum SDK version | Stated at the top of every reference file |
| Working code examples | Real, compilable/runnable code — not pseudo-code |
| Config options table | Type, default, minimum version for each option |
| Troubleshooting table | At least 3 common issues with solutions |
| One topic per file | Error monitoring in one file, tracing in another — no mixing |

### Code Example Quality

| Good | Bad |
|------|-----|
| Complete, working snippet | Truncated with `// ...` |
| Real import paths | Fake package names |
| Correct API names verified against source | API names from memory |
| One example per pattern | Five variations of the same thing |
| Framework-specific notes called out | Generic "this works everywhere" |

### Accuracy Indicators

Watch for these red flags that indicate fabricated or outdated content:

| Red flag | What to check |
|----------|---------------|
| Config option with no source reference | Search SDK repo for the option name |
| Feature listed as "available" with no code example | Likely doesn't exist |
| API signature that looks "too clean" | Verify against actual source |
| Missing error handling in examples | Real code has edge cases |
| Version number that's a round number (e.g., "8.0.0") | Check changelog for actual version |

### Honesty Checks

| Check | Requirement |
|-------|-------------|
| Removed features | Documented honestly with alternatives (not advertised as available) |
| Experimental features | Marked with ⚠️ or 🔬 |
| Deprecated APIs | Not used — replaced with modern equivalents |
| PII implications | Called out explicitly (especially for AI monitoring, session replay) |
| Performance impact | Noted for session replay, profiling, high sample rates |

## Cross-Cutting Checks

### Consistency Between Files

| Check | What to verify |
|-------|---------------|
| API names match | Same function name in SKILL.md and reference files |
| Config option names match | Same casing and spelling everywhere |
| Version numbers match | Same minimum version claims across files |
| Scope APIs consistent | Don't use deprecated API in one file and modern in another |

### Consistency With Existing Skills

| Check | What to verify |
|-------|---------------|
| Frontmatter style | Same fields and format as other SDK skills |
| Trigger phrase style | Same "Invoke This Skill When" pattern |
| Table format | Same column headers and layout |
| Disclaimer | Same or consciously evolved style |
| Troubleshooting format | Same Issue/Solution table pattern |

### Cross-Link Accuracy

| Check | Requirement |
|-------|-------------|
| Referenced skills exist | Every suggested skill name is a real skill in the repo |
| Suggestions make sense | Don't suggest a Python skill for a JavaScript project |
| Detection commands work | Frontend/backend detection bash commands are real |

## Final Verification

Run these before the last commit:

```bash
# 1. Verify all files exist and SKILL.md is focused (not bloated with deep-dive content)

# 2. All files exist
find skills/sentry-<platform>-sdk -type f | sort

# 3. Frontmatter valid
head -5 skills/sentry-<platform>-sdk/SKILL.md
# Must start with ---

# 4. No TODO/FIXME left behind
grep -r "TODO\|FIXME\|XXX\|HACK" skills/sentry-<platform>-sdk/

# 5. Referenced skills exist
grep -oP 'sentry-[\w-]+' skills/sentry-<platform>-sdk/SKILL.md | sort -u
# Verify each exists in skills/
```
