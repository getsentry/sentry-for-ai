# AI Monitoring — Sentry Next.js SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, runtime-specific behavior,
integration APIs, options, examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| Next.js app | [Next.js Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/) |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/vercelai/) |
| OpenAI | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/openai/) |
| Anthropic | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/anthropic/) |
| Google Gen AI SDK | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/google-genai/) |
| LangChain | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/langchain/) |
| LangGraph | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/langgraph/) |
| Mastra | [Mastra Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/mastra/) |
| Flue | [Flue Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/flue/) |
| Custom or unsupported library | [JavaScript manual instrumentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/manual-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Local guardrails

- Detect which Next.js runtime the AI code uses before editing server, edge, or client
  setup.
- Choose one AI span producer per runtime.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify by exercising the real route, action, or job that performs the AI call.
