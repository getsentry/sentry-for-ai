# Code Review

**Reviewed:** Complete `sentry-php-sdk` skill bundle — SKILL.md wizard + 8 reference files, router/tree/docs registration
**Verdict:** NEEDS CHANGES

## Summary

Solid, well-structured PHP SDK skill that closely follows the established conventions from the Python/Ruby/Go skill bundles. All four phases (Detect → Recommend → Guide → Cross-Link) are present with real bash commands, opinionated recommendations, and concrete code. The reference files are thorough — the Laravel reference alone is one of the most complete in the repo. Two issues need fixing before merge: a misnumbered routing step that could confuse the router, and a potentially fabricated PHP SDK API (`\Sentry\withContext()`). Several smaller inconsistencies between SKILL.md and reference files should also be cleaned up.

## Findings

### [P1] Router step numbering — step 6 inserted before step 5
**File:** `skills/sentry-sdk-setup/SKILL.md:33`
**Issue:** The PHP routing instruction is numbered `6` but appears before the existing step `5` ("If no match is found…"). This breaks the numbered sequence: 1, 2, 3, 4, **6**, 5. An LLM following these instructions in order may be confused about priority.
**Impact:** Router might not correctly prioritize PHP detection vs. the fallback step.
**Suggested Fix:** Renumber the PHP step as `5` and the fallback as `6`:
```
5. If `composer.json` with `laravel/framework` or `symfony/framework-bundle` is detected, use `sentry-php-sdk`.
6. If no match is found, direct the user to https://docs.sentry.io/platforms/ ...
```

### [P1] `\Sentry\withContext()` — likely fabricated API
**File:** `skills/sentry-php-sdk/references/error-monitoring.md:188,206`
**Issue:** The scope management table and code example reference `\Sentry\withContext()` with a `timeout` named parameter. This function does not exist in the sentry-php 4.x SDK. The PHP SDK provides `\Sentry\withScope()` and `\Sentry\configureScope()` for scope isolation, and manual `pushScope()`/`popScope()` for hub-level isolation. The `timeout` parameter is particularly suspicious — PHP scope functions don't have timeout semantics.
**Impact:** An AI agent following this reference will generate non-working code for long-running process isolation, which is exactly the scenario where correct scope management matters most.
**Suggested Fix:** Replace `withContext()` with the correct pattern — either `withScope()` or manual `pushScope()`/`popScope()`:
```php
// Long-running process isolation
$hub = \Sentry\SentrySdk::getCurrentHub();
$hub->pushScope();
try {
    \Sentry\configureScope(function (\Sentry\State\Scope $scope) use ($job): void {
        $scope->setTag('job.class', get_class($job));
    });
    $job->handle();
} finally {
    $hub->popScope();
}
```
Also remove `withContext()` from the scope API table (line 188) and the troubleshooting references (lines 530, 594).

### [P1] `continueTrace()` return value discarded — broken trace linking
**File:** `skills/sentry-php-sdk/references/tracing.md:292-304`
**Issue:** The "Extracting incoming trace context" example calls `\Sentry\continueTrace()` without capturing its return value, then creates a fresh `TransactionContext::make()`. In the PHP SDK, `continueTrace()` returns a `TransactionContext` populated with parent trace data. Discarding it and creating a new context means the transaction won't be linked to the upstream trace. Compare with the correct usage in the queue consumer example (line 338) which does capture the return value.
**Impact:** Users copying this pattern get broken distributed traces — the #1 use case for `continueTrace()`.
**Suggested Fix:**
```php
$sentryTrace = $_SERVER['HTTP_SENTRY_TRACE'] ?? '';
$baggage     = $_SERVER['HTTP_BAGGAGE'] ?? '';

$ctx = \Sentry\continueTrace($sentryTrace, $baggage);
$ctx->setName('process-payment')->setOp('task');

$transaction = \Sentry\startTransaction($ctx);
\Sentry\SentrySdk::getCurrentHub()->setSpan($transaction);
```

### [P2] `error_types` default value inconsistent
**File:** `skills/sentry-php-sdk/SKILL.md:257` vs `skills/sentry-php-sdk/references/error-monitoring.md:20`
**Issue:** SKILL.md says the default for `error_types` is `error_reporting()` (the current PHP error reporting level). The error-monitoring reference says it's `E_ALL`. These are different — `error_reporting()` returns whatever is configured in `php.ini`, which may not be `E_ALL`. Pick one and be consistent; the PHP SDK source should be the authority.
**Suggested Fix:** Verify against the actual SDK source. If the SDK defaults to `E_ALL`, update SKILL.md. If it defaults to `error_reporting()`, update error-monitoring.md.

### [P2] `max_request_body_size` — phantom `"never"` value
**File:** `skills/sentry-php-sdk/references/error-monitoring.md:26`
**Issue:** The error-monitoring reference lists valid values as `"none"` / `"never"` / `"small"` / `"medium"` / `"always"`, but SKILL.md (line 259) lists only `"none"` / `"small"` / `"medium"` / `"always"`. The `"never"` value doesn't appear in the Sentry PHP SDK documentation. If `"never"` isn't a real option, it should be removed from the reference.
**Suggested Fix:** Remove `"never"` from the error-monitoring.md config table, or verify it exists in the SDK and add it to SKILL.md.

### [P2] Package name inconsistency in reference headers
**File:** Multiple references (`profiling.md:26`, `crons.md:3`, `error-monitoring.md:3`, `tracing.md:3`, `logging.md:3`, `metrics.md:3`)
**Issue:** Reference file headers use `sentry/sentry-php` as the package identifier (e.g., "Minimum SDK: `sentry/sentry-php` ≥ 4.12.0") while the actual Composer package name is `sentry/sentry`. The SKILL.md correctly uses `sentry/sentry` in install commands and prose. `sentry/sentry-php` is the GitHub repo name, not the Packagist package name.
**Impact:** Low — these are version note headers, not install commands. But an agent might try to `composer require sentry/sentry-php` and fail.
**Suggested Fix:** Use `sentry/sentry` consistently in all reference headers, or add a parenthetical: `sentry/sentry (sentry-php)`.

### [P2] `\Sentry\Logger\DebugStdOutLogger` — verify class exists
**File:** `skills/sentry-php-sdk/SKILL.md:303`
**Issue:** The verification/debug section references `new \Sentry\Logger\DebugStdOutLogger()`. This class may not exist in the PHP SDK — the `logger` option accepts any PSR-3 `LoggerInterface`. The standard debug approach in the PHP SDK is typically `'debug' => true` which logs to `error_log()`. Verify this class exists in `sentry/sentry` 4.x; if not, replace with the documented approach.
**Suggested Fix:** If the class doesn't exist, replace with:
```php
\Sentry\init([
    'dsn' => '...',
    'debug' => true, // logs to error_log()
]);
```

### [P2] Tracing reference header includes profiling version info
**File:** `skills/sentry-php-sdk/references/tracing.md:3`
**Issue:** The tracing reference header contains profiling minimum versions: `(profiling ≥ 3.15.0)`. These belong in `profiling.md` (where they already exist). Including them in the tracing header is confusing — it mixes concerns.
**Suggested Fix:** Simplify the tracing header to:
```
> Minimum SDK: `sentry/sentry` ^4.0 · `sentry/sentry-laravel` ^4.0 · `sentry/sentry-symfony` ^5.0
```

### [P3] Profiling/crons minimum versions predate the main skill's minimum
**File:** `skills/sentry-php-sdk/references/profiling.md:26`, `skills/sentry-php-sdk/references/crons.md:3`
**Issue:** Profiling.md lists `sentry/sentry-php ≥ 3.15.0` and crons.md lists `≥ 3.16.0` as minimums, but the SKILL.md install command requires `^4.0`. Since ^4.0 inherently satisfies ≥3.15, these historical version notes add informational noise without practical value.
**Suggested Fix:** Update to match the skill's minimum: `sentry/sentry ^4.0` (and similarly for Laravel/Symfony packages).

## What's Good

- **Follows established patterns precisely** — YAML frontmatter, breadcrumb, 4-phase wizard, reference dispatch table all match the Python/Ruby/Go skills. Drop-in consistent.
- **Detection commands are practical** — Phase 1 checks `artisan`, `bin/console`, and `composer.json` entries rather than asking the user. This is how detect should work.
- **Laravel reference is excellent** — Complete `config/sentry.php` options with env var mappings, breadcrumb toggles, tracing toggles, queue distributed tracing internals, and Octane/Pennant notes. One of the most thorough reference files in the repo.
- **Symfony DIC pattern consistently documented** — Every callable option correctly notes the service-ID-not-closure pattern and provides the factory method boilerplate. This is a real gotcha that's well handled.
- **Troubleshooting tables are substantial** — SKILL.md has 12 entries, references have 5-9 each. Real failure modes with actionable solutions.
- **`config:cache` closure warning** — Prominently documented in both Laravel reference and tracing reference. This trips up real users.
- **No TODOs/FIXMEs left behind.**
- **SKILL_TREE validation passes** (`build-skill-tree.sh --check` exits clean).

## Next Steps

- [ ] Fix router step numbering (P1 — trivial)
- [ ] Remove or replace `\Sentry\withContext()` API (P1 — affects 4 locations in error-monitoring.md)
- [ ] Fix `continueTrace()` example to use the return value (P1 — tracing.md lines 292-304)
- [ ] Reconcile `error_types` default between SKILL.md and error-monitoring.md (P2)
- [ ] Remove phantom `"never"` value from `max_request_body_size` (P2)
- [ ] Verify `DebugStdOutLogger` class exists; replace if not (P2)
