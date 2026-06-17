# Changelog

## 0.1.1

- Detect installed agents via their JSON config and clean up conflicting
  plugins before installing.
- Name the installed agents in the restart hint.
- Keep each agent's install output on screen and stream live command output
  with a themed UI.
- Surface command stderr when streaming installs.

## 0.1.0

Initial release of `@sentry/ai`, a single `npx` entrypoint for installing the
Sentry plugin into supported AI coding assistants (Claude Code, Codex, Cursor,
and Grok). Detects which agents are present, installs or updates the plugin for
each, and reports per-agent results.
