---
name: sentry-sdk-skill-creator
description: Create a complete Sentry SDK skill bundle for any platform. Use when asked to "create an SDK skill", "add a new platform skill", "write a Sentry skill for X", or build a new sentry-<platform>-sdk skill bundle with wizard flow and feature reference files.
license: Apache-2.0
category: internal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > SDK Skill Creator

# Create a Sentry SDK Skill Bundle

Produce a complete, research-backed SDK skill bundle — a main wizard SKILL.md plus deep-dive reference files for every feature pillar the SDK supports.

## Invoke This Skill When

- Asked to "create a Sentry SDK skill" for a new platform
- Asked to "add support for [language/framework]" to sentry-agent-skills
- Building a new `sentry-<platform>-sdk` skill bundle
- Porting the SDK skill pattern to a new Sentry SDK

> Read `${SKILL_ROOT}/references/philosophy.md` first — it defines the bundle architecture, wizard flow, and design principles this skill implements.

---

## Phase 1: Identify the SDK

Determine what you're building a skill for:

```bash
# What SDK? What's the package name?
# Examples: sentry-go, @sentry/sveltekit, sentry-python, sentry-ruby, sentry-cocoa
```

Establish the **feature matrix** — which Sentry pillars does this SDK support?

| Pillar | Check docs | Notes |
|--------|-----------|-------|
| Error Monitoring | Always available | Non-negotiable baseline |
| Tracing/Performance | Usually available | Check for span API |
| Profiling | Varies | May be removed or experimental |
| Logging | Newer feature | Check minimum version |
| Metrics | Newer feature | May be beta/experimental |
| Crons | Backend only | Not available for frontend SDKs |
| Session Replay | Frontend only | Not available for backend SDKs |
| AI Monitoring | Some SDKs | Usually JS + Python only |

**Reference existing SDK skills** to understand the target quality level:

```bash
ls skills/sentry-*-sdk/ 2>/dev/null
# Read 1-2 existing SDK skills for pattern reference
```

---

## Phase 2: Research

**This is the most critical phase.** Skill quality depends entirely on accurate, current API knowledge. Do NOT write skills from memory — research every feature against official docs.

### Research Strategy

Spin off **parallel research tasks** (using the `claude` tool with `outputFile`) — one per feature area. Each task should:
1. Visit the official Sentry docs pages for that feature
2. Visit the SDK's GitHub repo for source-level API verification
3. Write thorough findings to a dedicated research file

Read `${SKILL_ROOT}/references/research-playbook.md` for the detailed research execution plan, including prompt templates and file naming conventions.

### Research the Sentry Wizard

Before diving into feature research, check whether the Sentry wizard CLI supports this framework:

```bash
# Check the SDK's docs landing page for wizard instructions
# Visit: https://docs.sentry.io/platforms/<platform>/
# Look for: "npx @sentry/wizard@latest -i <integration>"
```

If a wizard integration exists:
1. Document the exact wizard command and `-i` flag
2. Document what the wizard creates/modifies (files, config, build plugins)
3. Note that the wizard handles **authentication interactively** — login, org/project selection, and auth token creation/download all happen automatically
4. Note whether the wizard sets up **source map upload** — this is critical for frontend SDKs
5. This will become "Option 1: Wizard (Recommended)" in Phase 3 of the generated skill

> **Why this matters:** The wizard handles the entire auth flow (login, org/project selection,
> auth token) and source map upload configuration automatically. Without source maps,
> production stack traces show minified code — making Sentry nearly useless for frontend
> debugging. And without the auth token, source maps can't be uploaded at all. The wizard
> is the most reliable way to get both right in a single step.

### Research Batching

Batch research tasks by topic area. Run them in parallel where possible:

| Batch | Topics | Output file |
|-------|--------|-------------|
| 1 | Setup, configuration, all init options, framework detection | `research/<sdk>-setup-config.md` |
| 2 | Error monitoring, panic/exception capture, scopes, enrichment | `research/<sdk>-error-monitoring.md` |
| 3 | Tracing, profiling (if supported) | `research/<sdk>-tracing-profiling.md` |
| 4 | Logging, metrics, crons (if supported) | `research/<sdk>-logging-metrics-crons.md` |
| 5 | Session replay (frontend only), AI monitoring (if supported) | `research/<sdk>-replay-ai.md` |

**Important:** Tell each research task to write its output to a file (`outputFile` parameter). Do NOT consume research results inline — they're large (500–1200 lines each). Workers will read them from disk later.

### Research Quality Gate

Before proceeding, verify each research file:
- Has actual content (not just Claude's process notes)
- Contains code examples with real API names
- Includes minimum SDK versions
- Covers framework-specific variations

```bash
# Quick verification
for f in research/<sdk>-*.md; do
  echo "=== $(basename $f) ==="
  wc -l "$f"
  grep -c "^#" "$f"  # should have multiple headings
done
```

**Re-run any research task that produced fewer than 100 lines** — it likely failed silently.

---

## Phase 3: Create the Main SKILL.md

The main SKILL.md implements the **four-phase wizard** from the philosophy doc. Keep it focused — the main file should cover the wizard flow, quick start config, framework tables, and reference dispatch. Deep-dive details for individual features belong in `references/` files, not here. Be thorough but not redundant.

### Gather Context First

Before writing, run a scout or read existing skills to understand conventions:
- Frontmatter pattern (name, description, license)
- "Invoke This Skill When" trigger phrases
- Table formatting and code example style
- Troubleshooting table conventions

### SKILL.md Structure

```markdown
---
name: sentry-<platform>-sdk
description: Full Sentry SDK setup for <Platform>. Use when asked to "add Sentry
  to <platform>", "install <package>", or configure error monitoring, tracing,
  [features] for <Platform> applications. Supports [frameworks].
license: Apache-2.0
---

# Sentry <Platform> SDK

## Invoke This Skill When
[trigger phrases]

## Phase 1: Detect
[bash commands to scan project — package manager, framework, existing Sentry, frontend/backend]

## Phase 2: Recommend
[opinionated feature matrix with "always / when detected / optional" logic]

## Phase 3: Guide
### Option 1: Wizard (Recommended)   ← if wizard exists for this framework
[wizard command, what it creates/modifies table, skip-to-verification note]
### Option 2: Manual Setup            ← always include
### Install
### Quick Start — Recommended Init
### Source Maps Setup                  ← required for frontend/mobile SDKs
### Framework Middleware (if applicable)
### For Each Agreed Feature
[reference dispatch table: feature → ${SKILL_ROOT}/references/<feature>.md]

## Configuration Reference
[key init options table, environment variables]

## Verification
[test snippet]

## Phase 4: Cross-Link
[detect companion frontend/backend, suggest matching SDK skills]

## Troubleshooting
[common issues table]
```

### Key Principles for the Main SKILL.md

1. **Keep it lean** — deep details go in references, not here
2. **Wizard-first for framework SDKs** — if the Sentry wizard supports this framework, present it as "Option 1: Wizard (Recommended)" before any manual setup. The wizard handles the full auth flow (login, org/project selection, auth token creation), source map upload, build tool plugins, and framework-specific wiring — all in one interactive step. See `${SKILL_ROOT}/references/philosophy.md` for the full pattern.
3. **Source maps are non-negotiable for frontend/mobile** — the manual setup path must include source map upload configuration (build tool plugin + env vars). Without source maps, production stack traces are unreadable minified code.
4. **Detection commands must be real** — test them against actual projects
5. **Recommendation logic must be opinionated** — "always", "when X detected", not "maybe consider"
6. **Quick Start config should enable the most features** with sensible defaults
7. **Framework middleware table** — exact import paths, middleware calls, and quirks
8. **Cross-link aggressively** — if Go backend, suggest frontend. If Svelte frontend, suggest backend.

---

## Phase 4: Create Reference Files

One reference file per feature pillar the SDK supports. These are deep dives — they can be longer than the main SKILL.md.

### Reference File Structure

```markdown
# <Feature> — Sentry <Platform> SDK

> Minimum SDK: `<package>` vX.Y.Z+

## Configuration

## Code Examples
### Basic usage
### Advanced patterns
### Framework-specific notes (if applicable)

## Best Practices

## Troubleshooting
| Issue | Solution |
|-------|----------|
```

### What Makes a Good Reference

Read `${SKILL_ROOT}/references/quality-checklist.md` for the full quality rubric.

Key points:
- **Working code examples** — not pseudo-code, not truncated snippets
- **Tables for config options** — type, default, minimum version
- **One complete example per pattern** — don't show 5 variations of the same thing
- **Framework-specific notes** — call out when behavior differs between frameworks
- **Minimum SDK version at the top** — always
- **Honest about limitations** — if a feature was removed (like Go profiling), say so

### Feature-Specific Guidance

| Feature | Key things to cover |
|---------|-------------------|
| Error Monitoring | Capture APIs, panic/exception recovery, scopes, enrichment (tags/user/breadcrumbs), error chains, BeforeSend, fingerprinting |
| Tracing | Sample rates, custom spans, distributed tracing, framework middleware, operation types |
| Profiling | Sample rate config, how it attaches to traces, or honest "removed/not available" |
| Logging | Enable flag, logger API, integration with popular logging libraries, filtering |
| Metrics | Counter/gauge/distribution APIs, units, attributes, best practices for cardinality |
| Crons | Check-in API, monitor config, schedule types, heartbeat patterns |
| Session Replay | Replay integration, sample rates, privacy masking, canvas/network recording |

> **Note for frontend/mobile SDKs:** Source map upload configuration belongs in the main SKILL.md (Phase 3: Guide), not in a reference file. It's part of the core setup flow — every frontend production deployment needs it. Cover the build tool plugin, the required env vars (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`), and add `.env` to `.gitignore`.

---

## Phase 5: Verify Everything

**Do NOT skip this phase.** SDK APIs change frequently. Research can hallucinate. Workers can fabricate config keys.

### API Verification

Run a dedicated verification pass against the SDK's actual source code:

```
Research prompt: "Verify these specific API names and signatures against
the <SDK> GitHub repo source code: [list every API from the skill files]"
```

Things that commonly go wrong:
- Config option names with wrong casing (`SendDefaultPii` vs `SendDefaultPII`)
- Fabricated config keys that don't exist (`experimental.tracing` — verify it's real)
- Deprecated APIs used instead of modern replacements (`configureScope` → `getIsolationScope`)
- Features listed as available when they've been removed (profiling in Go SDK)
- Wrong minimum version numbers

### Review Pass

Run a reviewer on the complete skill bundle:
- Technical accuracy of code examples
- Consistency between main SKILL.md and reference files
- Consistency with existing SDK skills in the repo
- Agent Skills spec compliance (frontmatter, naming)

### Fix Review Findings

Triage by priority:
- **P0**: Misleading claims (advertising removed features) — fix immediately
- **P1**: Incorrect APIs, deprecated methods — fix before merge
- **P2**: Style inconsistencies, version nitpicks — fix if quick
- **P3**: Skip

---

## Phase 6: Register and Update Docs

After the skill passes review:

1. **Update README.md** — add to the SDK Skills table
2. **Update AGENTS.md** — if the philosophy doc or skill categories section needs it
3. **Add usage examples** — trigger phrases in the Usage section
4. **Document the bundle pattern** — if this is a new SDK, note the references/ structure

### Commit Strategy

Each major piece gets its own commit:
1. `feat(<platform>-sdk): add sentry-<platform>-sdk main SKILL.md wizard`
2. `feat(<platform>-sdk): add reference deep-dives for all feature pillars`
3. `docs(readme): add sentry-<platform>-sdk to available skills`
4. `fix(skills): address review findings` (if any)

---

## Checklist

Before declaring the skill complete:

- [ ] Philosophy doc read and followed
- [ ] All feature pillars researched from official docs (not from memory)
- [ ] Research files verified (real content, correct APIs, >100 lines each)
- [ ] Main SKILL.md is focused — wizard flow + quick start + reference dispatch; deep dives in references
- [ ] Main SKILL.md implements all 4 wizard phases
- [ ] Wizard CLI checked — if supported, presented as "Option 1: Wizard (Recommended)" with auth flow + source map benefits described
- [ ] Source map / debug symbol upload covered in manual setup path (frontend/mobile SDKs)
- [ ] Reference file for each supported feature pillar
- [ ] APIs verified against SDK source code
- [ ] Review pass completed, findings addressed
- [ ] Profiling/removed features honestly documented (not advertised)
- [ ] Cross-links to companion frontend/backend skills
- [ ] README.md updated
- [ ] All commits polished with descriptive messages
