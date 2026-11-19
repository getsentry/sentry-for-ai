# Suspect commits, code mappings, and resolve-by-commit

“Which change caused this?”
is the payoff of releases.
It is also the part most likely to be half-configured, because it runs on **two
independent mechanisms** and people assume they’re the same one.

## The two mechanisms

**1. SCM integration + code mappings + blame (the primary path).** With a GitHub or
GitLab integration installed and valid code mappings, Sentry takes the in-app frames
from the stack trace and asks the provider for blame on that exact file and line.
If the most recent commit there is less than a year old, it’s a suspect commit.
This path does **not** need releases at all.

**2. Release commit data (the fallback).** If mechanism 1 isn’t available or fails,
Sentry falls back to the commits you associated with the release (`set-commits`) and
matches files touched by those commits against files in the stack trace.
This is the path for orgs that don’t want Sentry connecting to their repo — send commit
metadata explicitly and skip the integration.

Sentry tries mechanism 1 by default and falls back to 2. Which one you’re relying on
determines what to fix when it’s empty.

## Prerequisites for either mechanism

- **Readable in-app frames.** Both mechanisms work off file paths in the stack trace.
  Minified or unsymbolicated frames have nothing usable, so source maps (JavaScript) or
  debug files (native/mobile) come first.
  That is a separate procedure — say so and get it done before promising suspect
  commits.
- **Frames marked in-app.** A trace where everything is vendor code yields no suspect
  commit.
- **Events created after setup.** Sentry does not backfill: issues that existed before
  the integration was connected won’t gain suspect commits.

## Connecting the repository (the step you can’t do)

Installing the SCM integration is an OAuth flow in the Sentry UI. **The agent cannot do
this** — hand it to the user explicitly rather than leaving it implied:

1. **Settings → Integrations**, pick GitHub or GitLab.
2. Configure/install it, granting access to the relevant org.
3. **Add the repository** for this project.

Then `sentry-cli repos list` confirms it from the terminal, and the repo name it prints
(`owner-name/repo-name`) is the exact string `--commit "repo@sha"` expects.

## Code mappings

A code mapping translates the path prefix in a stack trace to the path prefix in the
repository. Without one, blame lookups can’t find the file.

**Often already done:** Sentry auto-creates code mappings for JavaScript, Python, Java,
PHP, Ruby, Go, C#, and Kotlin projects in orgs with the GitHub integration installed.
Check before building any.

### Deriving the two roots from a real frame

1. Open an event and find an **in-app** frame.
   Take its `filename` — the `{}` event-JSON view shows `filename` and `abs_path`
   verbatim if the UI truncates it.
   Say it’s `src/main.py`.
2. Find that same file in the repository.
   Say it lives at `flask/src/main.py` (the repo name itself is not part of the path).
3. The shared suffix tells you the pair: **Stack Trace Root** `src/`, **Source Code
   Root** `flask/src/`.

Prefer a non-empty stack trace root.
Java and other package-name platforms need extra care — the prefix is a package path
(`io/sentry/android/core`), not a file path.

### In the UI

**Settings → Integrations → [your SCM] → Configurations → Configure → Code Mappings →
Add Mapping.** Fields: project, repo, default branch (the fallback when commit tracking
isn’t set up), stack trace root, source code root.
One mapping per repo per project — a project fed by several repos needs several.

### In bulk, from the CLI

`sentry-cli code-mappings upload` (CLI 3.3.4+) keeps mappings in version control and
lets CI resync them as the repo layout moves.
It needs an **organization token with the `org:ci` scope**:

```bash
sentry-cli code-mappings upload ./mappings.json
```

```json
[
  {"stackRoot": "io/sentry/android/core", "sourceRoot": "sentry-android-core/src/main/java/io/sentry/android/core"},
  {"stackRoot": "io/sentry", "sourceRoot": "sentry/src/main/java/io/sentry"}
]
```

Several mappings may share a `stackRoot` with different `sourceRoot`s — that’s how
monorepos with a repeated package prefix work.
Sentry evaluates from most specific to least specific and takes the first that resolves
to a real file.

Code mappings also power source context and CODEOWNERS-based ownership, so they’re worth
getting right beyond suspect commits.

## Resolve by commit and by PR

Once commits are associated, the commit message closes the loop:

```
Prevent empty queries on users

Fixes PROJECT-NAME-12A
```

Sentry links the commit to the issue immediately, but **does not resolve it yet** — it
marks the issue resolved when a release containing that commit is created.
`fixes <SHORT-ID>` in a PR title or description works the same way, resolving when the
merge commit lands in a release.
The short ID is at the top of the Issue Details page.

This is the mechanism that closes issues by shipping rather than by a manual status
change, and it is dead weight without commit association — worth mentioning to the user
as a reason to finish this setup.

## Auto-assignment

**[Project] → Settings → Ownership Rules → “Auto-assign to suspect commits”** assigns
new issues to the suspect commit’s author.
Caveats worth stating up front:

- A manually assigned issue is never reassigned.
- The author must be a member of the Sentry org, matched by commit email.
- Assignment can be skipped under high new-issue rates, retried on the next event.
- On GitHub, “Keep my email address private” in the author’s account settings prevents
  the match.

## When suspect commits are missing

Work down this list; it’s ordered by how often it’s the cause:

1. The stack trace has no in-app frames, or no stack trace at all.
2. Code mappings are missing or wrong, so no in-app frame resolves to a repo file.
3. The issue predates the integration.
4. Blame on those lines is older than a year.
5. The SCM integration got disconnected (re-check **Settings → Integrations**).
6. You’re on the fallback path and `set-commits` never ran, or ran without `patch_set`
   data — file-level changes are what power suggested assignees.

## Related

- [`ci-pipeline.md`](ci-pipeline.md) — `set-commits`, the fallback mechanism’s input.
- [`troubleshooting.md`](troubleshooting.md) — the wider failure table.
