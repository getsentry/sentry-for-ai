# Deprecated: this directory is going away

This `.claude-plugin/` directory exists only for backwards compatibility. The
Sentry plugin used to be installed directly from the root of this repository, so
removing these manifests outright would break existing installs the next time
they pull. This keeps them working in the meantime.

**This directory will be removed on or after 2026-07-11.** Do not build anything
new on top of it.

The Sentry plugin for Claude Code now lives in its own repository,
[`getsentry/plugin-claude`](https://github.com/getsentry/plugin-claude), which
is generated from this repo's skill library. Re-point your marketplace there:

```bash
claude plugin marketplace add getsentry/plugin-claude
claude plugin install sentry@sentry-plugin-marketplace
```
