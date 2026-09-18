# AI Monitoring — Sentry NestJS SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, integration APIs, options,
examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| NestJS app | [NestJS Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/) |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/vercelai/) |
| OpenAI | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/openai/) |
| Anthropic | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/anthropic/) |
| Google Gen AI SDK | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/google-genai/) |
| LangChain | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/langchain/) |
| LangGraph | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/langgraph/) |
| Mastra | [Mastra Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/mastra/) |
| Custom or unsupported library | [JavaScript manual instrumentation](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/manual-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Local guardrails

- Preserve the existing NestJS Sentry initialization and modify it in place.
- Choose one AI span producer per runtime.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify by exercising the controller, provider, queue job, or command that performs the
  AI call.
