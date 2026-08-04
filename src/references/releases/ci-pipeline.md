# Creating the release in CI — commits, finalize, deploy

The SDK half tags events.
This half creates the **release object** in Sentry and hangs the useful metadata off it.
Both halves are required; neither works alone.

## Why bother, when Sentry auto-creates releases

Sentry creates a release entity the first time it sees an event carrying an unknown
release name. That auto-created release is a bare label: no commits, so no suspect
commits from release data and no `Fixes` resolution; no finalize timestamp, so “resolve
in next release” has nothing to anchor to; no deploy, so no deploy notifications.
Creating it deliberately in CI is what turns the label into the feature set.

## Where it goes in the pipeline

Order matters, and getting it wrong is the most common reason a correct-looking setup
does nothing:

1. **Check out with full git history.** Commit association walks the log between the
   previous release and `HEAD`. A shallow clone (CI default) has nothing to walk — on
   GitHub Actions that means `fetch-depth: 0`.
2. **Build**, with the release name baked in (see [`tagging.md`](tagging.md)).
3. **Create the release and upload artifacts** — source maps or debug files, from *this*
   build.
4. **Associate commits.**
5. **Finalize** the release.
6. **Deploy**, then **record the deploy** into its environment.

The rule underneath it: the release step runs **after the build, before the deploy**,
and the files you deploy must be the files that were built when the artifacts were
uploaded. Uploading after deploy means events arrive before Sentry can process them.

Every path below needs an auth token — it’s a write to your org.
See [`../auth-token.md`](../auth-token.md); the token, `SENTRY_ORG`, and
`SENTRY_PROJECT` are the same three variables for all of them.

## Path A — a JavaScript bundler plugin (check this first)

If the project already builds with `@sentry/webpack-plugin`, `@sentry/vite-plugin`,
`@sentry/rollup-plugin`, `@sentry/esbuild-plugin`, or a framework SDK that wraps one
(`@sentry/nextjs`, `@sentry/sveltekit`, `@sentry/react-router`,
`@sentry/tanstackstart-react`, `@sentry/nuxt`), **most of this is already happening.**
Do not add a parallel `sentry-cli` pipeline next to it — you’ll get two releases
fighting over the same name.
Configure the plugin instead:

```js
sentryVitePlugin({
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  release: {
    // name:      defaults to a detected CI value, else the git HEAD SHA
    // inject:    true  — injects the name into the bundle for the SDK
    // create:    true  — creates the release in Sentry
    // finalize:  true  — finalizes when the build ends
    // setCommits: { auto: true } — associates commits
    deploy: {env: 'production'},
  },
})
```

The defaults do the right thing: `inject`, `create`, and `finalize` are all `true`, and
`setCommits` defaults to `{auto: true}`. In practice there are only three things to
check:

- **`deploy` is not set by default** — add `deploy: {env: '<environment>'}` to get
  deploy tracking.
- **Commit association still needs git history in CI.** The plugin shells out to the
  same logic `sentry-cli` uses, so `fetch-depth: 0` applies here too.
- `release.name` is unset and undetectable (no git, no recognized CI) → **no release is
  created at all**, silently.
  Set it explicitly in that case.

Useful escapes: `setCommits: {auto: true, ignoreMissing: true}` when history is
rewritten by squash-merges, `setCommits: {repo: 'owner/name', commit: '<sha>'}` when the
build has no repo access, `setCommits: false` to opt out, and `release.vcsRemote` if the
remote isn’t `origin`.

## Path B — GitHub Actions

For everything that isn’t a JS bundler build, `getsentry/action-release` is the shortest
correct path. It creates the release, associates commits, finalizes, and records the
deploy in one step:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0          # required: commit association needs history

# ... your build steps here ...

- name: Create Sentry release
  uses: getsentry/action-release@v3
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
  with:
    environment: production
    release: ${{ github.sha }}   # optional; defaults to the triggering commit SHA
    sourcemaps: ./dist          # only if you have JS source maps to upload
```

The action’s default release name is the GitHub SHA that triggered the workflow — fine,
as long as the SDK tags the same value.
Wire `SENTRY_RELEASE=${{ github.sha }}` into the build step if you rely on that default.

Self-hosted Sentry also needs `SENTRY_URL`.

## Path C — `sentry-cli`, any CI

The explicit form.
Use it for CI providers without an integration, for mobile builds, and
whenever you need to see each step:

```bash
export SENTRY_AUTH_TOKEN=...      # from CI secrets
export SENTRY_ORG=my-org
export SENTRY_PROJECT=my-project

VERSION=$(sentry-cli releases propose-version)   # or your own version string

sentry-cli releases new "$VERSION"

# ... build, and upload source maps / debug files for this build ...

sentry-cli releases set-commits "$VERSION" --auto
sentry-cli releases finalize "$VERSION"

# ... deploy ...

sentry-cli deploys new --release "$VERSION" -e production
```

Notes on the individual steps:

- **`new`** takes multiple projects when a release spans them:
  `-p project1 -p project2`. Remember releases are org-global — prefix the version
  accordingly.
- **`--finalize`** on `new` collapses steps 1 and 5 if you don’t need the window in
  between. Finalizing separately, at deploy time, is more accurate: the finalize
  timestamp is what “the next release” means when resolving issues, and it’s the base
  release for `--auto` commit association.
- **`set-commits --auto`** discovers the repo from the working directory and associates
  everything between the previous release’s head commit and the current `HEAD`. With no
  SCM integration installed it falls back to the local git tree (the last 10–20 commits
  on a first release, tunable with `--initial-depth`); `--local` makes that fallback the
  explicit default.
- When the build can’t reach the repo, name the commits: `--commit "owner/repo@<sha>"`,
  repeated per repo, or a range `--commit "owner/repo@<prev>..<current>"`. The repo name
  must match what it’s called in Sentry — `sentry-cli repos list` prints the valid
  names.
- **`--ignore-missing`** rescues `set-commits` when a commit from the previous release
  no longer exists (amend, rebase, squash-merge, force-push).
  It falls back to the default commit count instead of failing the build.
- **`deploys new`** accepts `-t <seconds>` to record how long the deploy took, and
  `deploys list --release "$VERSION"` to read them back.
  Deploys can’t be deleted.

### Sending commit metadata without the CLI

When the deploy environment can’t run `sentry-cli` at all, POST the commits with the
release. This is also the path for orgs that won’t connect an SCM integration:

```bash
curl https://sentry.io/api/0/organizations/<org>/releases/ \
  -X POST \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "2.0rc2",
    "projects": ["project-1"],
    "commits": [{
      "id": "8371445ab8a9facd271df17038ff295a48accae7",
      "repository": "owner-name/repo-name",
      "author_name": "Author Name",
      "author_email": "author@example.com",
      "timestamp": "2018-09-20T11:50:22+03:00",
      "message": "This is the commit message.",
      "patch_set": [
        {"path": "path/to/added-file.html", "type": "A"},
        {"path": "path/to/modified-file.html", "type": "M"},
        {"path": "path/to/deleted-file.html", "type": "D"}
      ]
    }]
  }'
```

Two fields carry the weight: **`patch_set`** (types `A`dd, `M`odify, `D`elete) is what
powers suspect commits and suggested assignees — omit it and you get a commit list and
nothing else — and **`author_email`** is what makes the suggested assignee resolvable.
`timestamp` controls ordering; without it, commits stay in the order given.

## Path D — mobile and Flutter

The SDK build plugins on these platforms upload **artifacts** but do not manage
releases, with one exception:

| Platform | Release object |
| --- | --- |
| Flutter / Dart | `sentry_dart_plugin` handles it — `release` defaults to `name@version` from `pubspec.yaml` and `commits` defaults to `auto`. `ignore_missing: true` is available for rewritten history. |
| Android | The Gradle plugin uploads mappings and source bundles only. Create the release from CI with Path B or C, using the same `packageName@versionName+versionCode` string the SDK tags. |
| Apple / Cocoa | The Xcode build phase uploads dSYMs only. Same: create the release from CI. |
| React Native | The bundled `sentry-cli` build integration creates the release for default names. Custom `release`/`dist` values break it — then it’s Path C, plus manual source map upload. |

## Related

- [`tagging.md`](tagging.md) — the name both halves must agree on.
- [`suspect-commits.md`](suspect-commits.md) — what commit association actually unlocks.
- [`troubleshooting.md`](troubleshooting.md) — when the pipeline runs but Sentry shows
  nothing.
