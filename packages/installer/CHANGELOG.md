# Changelog

## 0.2.0

- Accept an optional install instruction and include it in the prompt offered
  for copying after installation.

## 0.1.4

- Add a `remove` subcommand to uninstall the Sentry plugin from your agents.
- After a successful install, offer to copy a get-started prompt to your
  clipboard so there's an obvious first thing to try.

## 0.1.3

- Lead the README with the install command and add a demo to the npm package
  page.

## 0.1.2

- Add `--no-telemetry` flag and `DO_NOT_TRACK=1` env var support to opt out
  of crash reporting telemetry.
- Give the install banner brand voice.

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
