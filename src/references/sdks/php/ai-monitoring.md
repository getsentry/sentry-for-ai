# AI Monitoring — Sentry PHP / Laravel SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, Laravel AI behavior,
options, examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| Laravel app with `laravel/ai` | [Laravel Agent Tracing](https://docs.sentry.io/platforms/php/guides/laravel/agent-tracing/) |
| Laravel AI integration details | [Laravel AI integration](https://docs.sentry.io/platforms/php/guides/laravel/integrations/laravel-ai/) |
| Laravel tracing baseline | [Laravel automatic tracing](https://docs.sentry.io/platforms/php/guides/laravel/tracing/instrumentation/automatic-instrumentation/) |
| Non-Laravel PHP or unsupported AI library | [PHP custom tracing](https://docs.sentry.io/platforms/php/tracing/instrumentation/custom-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Local guardrails

- Use automatic Laravel AI instrumentation when `laravel/ai` is installed and tracing is
  active.
- Preserve the existing Laravel Sentry config and modify it in place.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify by exercising the real route, queue job, scheduler command, or CLI command that
  performs the AI call.
