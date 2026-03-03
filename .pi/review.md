# Code Review

**Reviewed:** sentry-node-sdk skill bundle — SKILL.md (719 lines), 6 reference files (3,386 lines), router/tree/AGENTS integration
**Verdict:** NEEDS CHANGES

## Summary

A comprehensive, well-structured SDK skill bundle covering Node.js, Bun, and Deno runtimes with 6 feature reference files. The overall quality is high — the wizard phases are complete, the scope API usage is correct (v8+, no deprecated Hub), metrics correctly uses `count()`/`gauge()`/`distribution()`, and logging uses `Sentry.logger.fmt` tagged templates. However, there are **contradictory framework error handler placement instructions** between SKILL.md and error-monitoring.md that will cause agents to place handlers incorrectly for Fastify and Connect. These must be resolved before merge.

## Findings

### [P0] Fastify error handler placement contradicts between SKILL.md and error-monitoring.md
**File:** `skills/sentry-node-sdk/SKILL.md:259` vs `skills/sentry-node-sdk/references/error-monitoring.md:103`
**Issue:** SKILL.md says `setupFastifyErrorHandler()` goes **"AFTER all routes"** (line 259 code comment, line 378 table). error-monitoring.md says **"BEFORE routes"** (line 103 table, line 158 code). tracing.md also says "BEFORE routes" (Fastify section). The Sentry docs specify BEFORE routes — Fastify registers an `onError` lifecycle hook via a plugin, and it must be registered before route definitions.
**Impact:** An agent following SKILL.md will place the Fastify error handler after routes, which may silently miss errors. The SKILL.md code example, table, and the Fastify code block all need to be corrected.
**Suggested Fix:** In SKILL.md, change the Fastify section:
```javascript
// Change "Add AFTER all routes" → "Add BEFORE routes"
// ↓ Sentry BEFORE routes (Fastify registers an onError hook via plugin)
Sentry.setupFastifyErrorHandler(fastify);
```
And update the summary table row:
```
| Fastify | `setupFastifyErrorHandler(fastify)` | Before routes | No |
```

### [P0] Connect error handler placement contradicts between SKILL.md and error-monitoring.md
**File:** `skills/sentry-node-sdk/references/error-monitoring.md:106` vs `skills/sentry-node-sdk/SKILL.md:381`
**Issue:** error-monitoring.md says `setupConnectErrorHandler()` goes **"BEFORE routes"** (line 106 table, line 247 code). SKILL.md says **"After all middleware"** (line 381 table, line 307 code comment). Connect error handlers use the `(err, req, res, next)` signature and follow the same pattern as Express — they go AFTER routes/middleware to catch errors thrown by them. SKILL.md appears correct; error-monitoring.md is wrong.
**Impact:** An agent loading the error-monitoring.md reference will place the Connect error handler before routes, causing it to never see errors from those routes.
**Suggested Fix:** In error-monitoring.md, fix the Connect section:
```javascript
// Change "BEFORE routes" → "AFTER routes/middleware" in the table and code comment
const app = connect();
app.use("/", handler);
// ↓ Sentry AFTER routes
Sentry.setupConnectErrorHandler(app);
```
And fix the summary table (line 106) and Quick Reference (line 1208).

### [P1] tracing.md has erroneous `await` on Fastify error handler
**File:** `skills/sentry-node-sdk/references/tracing.md:559` (Fastify section)
**Issue:** The code shows `await Sentry.setupFastifyErrorHandler(fastify)` but `setupFastifyErrorHandler` is **not async**. Only `setupHapiErrorHandler` requires `await`. Both SKILL.md and error-monitoring.md correctly mark Fastify as non-async in their tables.
**Impact:** Misleading — an agent may wrap unnecessary async/await around Fastify setup, or worse, conclude there's an inconsistency and pick the wrong pattern.
**Suggested Fix:** Remove the `await`:
```typescript
Sentry.setupFastifyErrorHandler(fastify);
```

### [P1] NestJS `SentryGlobalFilter` import path differs between SKILL.md and error-monitoring.md
**File:** `skills/sentry-node-sdk/SKILL.md:337` vs `skills/sentry-node-sdk/references/error-monitoring.md:323`
**Issue:** SKILL.md imports `SentryGlobalFilter` from `"@sentry/nestjs"`. error-monitoring.md imports it from `"@sentry/nestjs/setup"`. The Sentry docs import `SentryGlobalFilter` from `@sentry/nestjs` and `SentryModule` from `@sentry/nestjs/setup`. SKILL.md has the correct path.
**Impact:** error-monitoring.md may cause an import error if the export doesn't exist at that subpath.
**Suggested Fix:** In error-monitoring.md line 323, change:
```typescript
import { SentryModule }         from "@sentry/nestjs/setup";
import { SentryGlobalFilter }   from "@sentry/nestjs";  // NOT from /setup
```

### [P1] error-monitoring.md has no Troubleshooting section
**File:** `skills/sentry-node-sdk/references/error-monitoring.md`
**Issue:** All 5 other reference files (tracing, profiling, logging, metrics, crons) end with a `## Troubleshooting` table. error-monitoring.md — the largest file at 1,212 lines and the most critical reference — doesn't have one.
**Impact:** Breaks structural consistency. An agent looking for troubleshooting guidance for error monitoring (the most common issue category) won't find it in the reference file.
**Suggested Fix:** Add a `## Troubleshooting` section at the end of error-monitoring.md covering common issues like: events not appearing (instrument loaded too late), `captureException` returns undefined (missing `return scope`), Express errors not captured (`setupExpressErrorHandler` missing or misplaced), NestJS `HttpException` not reported (by design — use custom filter), `beforeSend` not firing (wrong hook for transactions), etc.

### [P2] Hapi placement description differs between files
**File:** `skills/sentry-node-sdk/SKILL.md:380` vs `skills/sentry-node-sdk/references/error-monitoring.md:105`
**Issue:** SKILL.md table says "After routes, before `server.start()`". error-monitoring.md table says "Before routes". For Hapi, `setupHapiErrorHandler` registers an `onPreResponse` lifecycle hook — placement relative to routes doesn't technically matter, but the docs should be consistent.
**Suggested Fix:** Align both to "Before `server.start()` — must `await`" which is the only hard requirement.

### [P2] `denoCronIntegration` not covered in crons.md
**File:** `skills/sentry-node-sdk/references/crons.md`
**Issue:** SKILL.md prominently documents `denoCronIntegration` from `@sentry/deno` (lines 530-543), but crons.md — the dedicated reference file for cron monitoring — doesn't mention Deno cron at all. If an agent loads crons.md for detailed cron setup on Deno, it will find nothing about `denoCronIntegration` or `Deno.cron`.
**Suggested Fix:** Add a `### Deno.cron (denoCronIntegration)` section to crons.md covering the integration import, init config, and `Deno.cron()` auto-monitoring example.

### [P2] Fastify parameter name inconsistency across files
**File:** Multiple files
**Issue:** SKILL.md uses `setupFastifyErrorHandler(fastify)`, error-monitoring.md uses `setupFastifyErrorHandler(app)`, tracing.md uses `setupFastifyErrorHandler(fastify)`. While technically valid either way, using `app` for the Fastify instance is confusing since `app` typically refers to Express.
**Suggested Fix:** Standardize on `fastify` (matching SKILL.md and tracing.md) in error-monitoring.md.

## What's Good
- **Wizard structure is solid** — all 4 phases (Detect → Recommend → Guide → Cross-Link) are complete and well-organized with actionable detection commands
- **Three-runtime coverage** is thorough — Node.js, Bun, and Deno each have clear install/init/preload instructions with honest feature support tables (Bun/Deno profiling correctly marked as unsupported)
- **Scope API is correct** — uses `withScope`, `withIsolationScope`, `getGlobalScope()` throughout; no deprecated Hub pattern anywhere
- **Metrics API is correct** — uses `count()`/`gauge()`/`distribution()`; explicitly documents that `increment()`/`set()` don't exist in v10
- **Logging uses correct `Sentry.logger.fmt` tagged template** — not string interpolation
- **Router integration is clean** — `sentry-sdk-setup` routing table updated with correct precedence rules (Next.js preferred over node-sdk), `SKILL_TREE.md` in sync, `build-skill-tree.sh --check` passes
- **AGENTS.md and README.md** both updated with the new skill entry
- **No TODO/FIXME/HACK** left behind
- **Cross-link table** references real, existing skills in the repo
- **Troubleshooting tables** are substantive (9-12 entries each in the files that have them)
- **Reference file headers** have clear version requirements with feature-level minimum SDK versions

## Next Steps
- [ ] Resolve Fastify placement: fix SKILL.md to say "Before routes" (aligning with error-monitoring.md and tracing.md)
- [ ] Resolve Connect placement: fix error-monitoring.md to say "After routes/middleware" (aligning with SKILL.md)
- [ ] Remove erroneous `await` from Fastify in tracing.md
- [ ] Fix `SentryGlobalFilter` import path in error-monitoring.md
- [ ] Add Troubleshooting section to error-monitoring.md
- [ ] Add Deno.cron section to crons.md
- [ ] Align Hapi placement description across files
- [ ] Standardize Fastify parameter name to `fastify` in error-monitoring.md
