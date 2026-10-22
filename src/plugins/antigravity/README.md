# Sentry for Google Antigravity

Set up Sentry, investigate production errors, and configure monitoring with expert
skills and the hosted [Sentry MCP server](https://mcp.sentry.dev).

> [!IMPORTANT]
> This repository is generated from
> [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai).
> Make changes there; the distribution is rebuilt from that source.

## Install

In Antigravity, open **Customizations → Plugins → Install from URL** and enter:

```text
https://github.com/getsentry/plugin-antigravity
```

Or install with the Antigravity CLI:

```bash
agy plugin install https://github.com/getsentry/plugin-antigravity
```

Authenticate the Sentry MCP connection when prompted.
Then ask:

```text
Set up Sentry in this project
Investigate my most frequent production errors
Configure alerts for my Sentry project
```

Skills are selected automatically based on your request and are also available as slash
commands, such as `/sentry-get-started` and `/sentry-debug-issue`.

## Local development

Build from the source repository into a directory named `sentry`, then validate and
install it:

```bash
src/plugins/antigravity/build.sh /tmp/sentry
src/plugins/antigravity/validate.sh /tmp/sentry
agy plugin validate /tmp/sentry --strict
agy plugin install /tmp/sentry
agy plugin list
```

Run `src/plugins/antigravity/smoke.sh /tmp/sentry` to validate and install the build
into your current Antigravity profile, checking its version, skill discovery, and MCP
configuration.
