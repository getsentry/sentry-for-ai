# Changelog

## 0.4.1

- Accept `org-slug#onboarding-code` after `install` to generate a getting started prompt
  with the organization and run code from Sentry’s onboarding page, allowing the agent
  to report setup progress to that run.

## 0.4.0

- Offer to authenticate the Sentry MCP for Codex and Claude Code after installation.
- Upgrade terminal rendering to reduce redraw flicker and screen tearing.
- Require Node.js 22.13.0 or newer.

## 0.3.0

- Rename the package to `@sentry/agent-plugin`. Install with
  `npx @sentry/agent-plugin install`. `@sentry/ai` stays on npm at 0.2.0 and no longer
  receives updates.
- Remove the Claude plugin left behind by our own marketplace, so a hand-added copy and
  the installer-managed one no longer both resolve to the same skills.

## 0.2.0

- Accept an optional install instruction and include it in the prompt offered for
  copying after installation.

## 0.1.4

- Add a `remove` subcommand to uninstall the Sentry plugin from your agents.
- After a successful install, offer to copy a get-started prompt to your clipboard so
  there’s an obvious first thing to try.

## 0.1.3

- Lead the README with the install command and add a demo to the npm package page.

## 0.1.2

- Add `--no-telemetry` flag and `DO_NOT_TRACK=1` env var support to opt out of crash
  reporting telemetry.
- Give the install banner brand voice.

## 0.1.1

- Detect installed agents via their JSON config and clean up conflicting plugins before
  installing.
- Name the installed agents in the restart hint.
- Keep each agent’s install output on screen and stream live command output with a
  themed UI.
- Surface command stderr when streaming installs.

## 0.1.0

Initial release of `@sentry/ai`, a single `npx` entrypoint for installing the Sentry
plugin into supported AI coding assistants (Claude Code, Codex, Cursor, and Grok).
Detects which agents are present, installs or updates the plugin for each, and reports
per-agent results.
