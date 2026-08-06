# When releases are set up but nothing works

Release setup fails **quietly**. Every step below can succeed on its own while producing
no visible feature, so diagnose by symptom rather than re-running the pipeline and
hoping.

Start by establishing which half is broken: does a recent event carry the release tag
you expect, and does a release object with that exact name exist with commits attached?
Almost every entry here is one of those two answers being no.

## Symptom table

| Symptom | Cause | Fix |
| --- | --- | --- |
| Events show no release, or `release: unknown` | The SDK isn’t tagging. Either nothing set it and the platform has no default, or the value is computed at build time and never reached the runtime | Set it per [`tagging.md`](tagging.md); for bundled JS confirm the plugin’s `inject` is on and the built bundle really contains the value |
| The release exists in Sentry with commits and a deploy, but **0 events** | Name mismatch — the classic failure. `v1.2.3` vs `1.2.3`, short vs full SHA, a build number on one side only | Derive both sides from one variable; compare the release list against the `release` tag on a real event, character for character |
| Events attribute correctly, but the release has **no commits** | Commit association never ran, or ran outside the repo | Take the path that matches the build ([`ci-pipeline.md`](ci-pipeline.md)): if a Sentry bundler plugin is already there, fix `release.setCommits` on it rather than adding a second pipeline; otherwise add `set-commits` to CI. Either way it must run where the git repo is checked out |
| `set-commits --auto` fails, or an “Unable to Fetch Commits” email arrives | The previous release’s commit no longer exists in the repo (squash-merge, rebase, amend, force-push), or CI made a shallow clone | `fetch-depth: 0` on checkout; add `--ignore-missing` (`ignoreMissing: true` in the bundler plugin) so it falls back instead of failing |
| Commits are associated but there are **no suspect commits** | Usually the blame path, not the release path | Work the ordered list in [`suspect-commits.md`](suspect-commits.md) — in-app frames, then code mappings, then integration state |
| Suspect commit shows, but no suggested assignee | The commit author isn’t in the Sentry org, or their email is hidden | Match the commit email to an org member; on GitHub uncheck “Keep my email address private” |
| Frames are minified/unsymbolicated, so nothing resolves | Missing artifacts — a different problem wearing this costume | Upload source maps (JavaScript) or debug files (native/mobile); that procedure is separate from releases |
| “Resolve in next release” never resolves anything | The release was never **finalized**, so Sentry has no anchor for “next” | Call `sentry-cli releases finalize` at deploy time (or `--finalize` on `new`) |
| `Fixes PROJECT-NAME-12A` links the commit but the issue stays unresolved | Working as designed until a release **containing that commit** is created | Ensure the post-merge release runs `set-commits` and includes the merge commit |
| Release health / crash-free rate is empty | No sessions: session tracking disabled, no `environment` set, or the platform doesn’t support release health | Confirm platform support and session tracking in [`tagging.md`](tagging.md) |
| Production crash-free rate looks terrible | Staging events are landing in the same environment | Set `environment` per build; record deploys into the right environment |
| No deploys listed on the release | `deploys new` never ran — creating a release does not create a deploy | Add the deploy step; verify with `sentry-cli deploys list --release "$VERSION"` |
| Two releases appear for one build | A bundler plugin **and** a hand-rolled `sentry-cli` pipeline both ran, with different names | Keep one. If the plugin is in the build, configure it rather than adding CLI steps |
| Nothing uploads and nothing errors | Missing `SENTRY_AUTH_TOKEN` — most tools skip silently | [`../auth-token.md`](../auth-token.md), including how to check for presence without printing the value |
| `403` on `code-mappings upload` | Token lacks the `org:ci` scope | Issue an org token with `org:ci` |
| One project’s release swallowed another’s events | Release names are **global per organization** | Prefix with the project (`checkout-api@1.0.0`) |

## Checking from the terminal

```bash
sentry-cli repos list                              # is an SCM integration connected, and under what name
sentry-cli deploys list --release "$VERSION"        # did the deploy get recorded
```

## Checking with the MCP

The two halves need two different tools, and using the wrong one is how a mismatch gets
missed.

**The tagging half** — the release fields, but they aren’t interchangeable between
tools:

- `release:<exact-name>` — works on both.
  Do events exist under the name CI created?
  Zero hits here, combined with a release object that *does* have commits, is the
  mismatch signature.
- `firstRelease:<name>` — did this issue first appear in that release (regression
  detection working). **`search_issues` only.** On `search_events` it is silently
  rewritten to `release:`, which returns plausible hits for a different question — check
  `## Executed Search` if you’re unsure what ran.

The grammar is in [`../search-query-language.md`](../search-query-language.md).

**The CI half** — `get_release_details` for that exact version reports the commits and
deploys hanging off the release.
An event search can never answer this; it only ever sees the tag.
It’s a catalog tool, so reach it via `search_sentry_tools` / `execute_sentry_tool` if it
isn’t exposed directly.

## Related

- [`tagging.md`](tagging.md) · [`ci-pipeline.md`](ci-pipeline.md) ·
  [`suspect-commits.md`](suspect-commits.md)
