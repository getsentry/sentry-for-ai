# Auth token (the build-time secret)

Uploading artifacts is a *write* to your Sentry org, so it needs an auth token. This is **not the
DSN**: the DSN is public and identifies where events go; the token is a secret and grants upload
rights. Confusing the two is the most common cause of "I configured everything and nothing uploaded."

## Which token

Prefer an **organization auth token** (created in Sentry under organization settings → auth tokens).
They are scoped to the org, carry the release/upload permissions these tools need, and are what the
wizard creates for you. Tokens are shown **once** at creation — if the user lost it, issue a new one
rather than hunting for the old value.

A user/personal token also works but ties artifact uploads to one person's account, which breaks
builds when they leave or rotate credentials. Say so if you find one in use.

## Where it goes

Every tool reads the same environment variable, so set it once per environment:

```bash
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-slug>
```

| Environment | Where to put it |
|---|---|
| CI (the one that matters) | The provider's secret store — GitHub Actions repository/environment secrets, and exposed to the build step as `SENTRY_AUTH_TOKEN` |
| Local release builds | A gitignored env file — `.env.sentry-build-plugin` (JS bundler plugins read it), or the shell |
| Apple / Android builds | A gitignored `sentry.properties`, or the environment of the build phase / Gradle invocation |

**Never** commit it, never inline it in `next.config.ts`, `vite.config.ts`, `build.gradle`, or a
checked-in `sentry.properties`, and never print it in logs or paste it into a PR. If you find a
committed token, stop and tell the user to revoke it — rotating is the fix, deleting the line is not.

Verify presence without revealing the value:

```bash
[ -n "$SENTRY_AUTH_TOKEN" ] && echo "SENTRY_AUTH_TOKEN=set" || echo "SENTRY_AUTH_TOKEN=unset"
```

## Failure signatures

| Symptom | Cause |
|---|---|
| Build succeeds, no artifacts in Sentry, no error | Token unset — most plugins skip upload silently rather than failing the build |
| `401 Unauthorized` from the plugin or `sentry-cli` | Token invalid, revoked, or from a different org |
| `403 Forbidden` on upload | Token lacks the release/upload permission, or names a project outside its scope |
| Works locally, not in CI | Token is in a local env file that CI doesn't have; add it to CI secrets |
| Works in CI for one branch only | Secret is scoped to an environment or protected branch |

## Making failure loud

A silent skip is worse than a red build, because it ships unreadable traces. Where the tool supports
it, fail the build when upload fails (JS bundler plugins expose an errorHandler hook; `sentry-cli`
exits non-zero on its own). At minimum, have CI print whether the token was set, so a missing secret
is visible in the log.
