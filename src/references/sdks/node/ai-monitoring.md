# AI Monitoring — Sentry Node.js SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, integration APIs, options,
examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| Generic Node.js, Bun, or Deno app | [Node Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/) |
| OpenAI | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/openai/) |
| Anthropic | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/anthropic/) |
| Google Gen AI SDK | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/google-genai/) |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/vercelai/) |
| LangChain | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/langchain/) |
| LangGraph | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/langgraph/) |
| Mastra | [Mastra Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/mastra/) |
| Flue on Node.js | [Flue Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/flue/) |
| Custom or unsupported library | [JavaScript manual instrumentation](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/manual-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Eve

For Eve, support the Sentry Node SDK path so it behaves like the other JavaScript AI
setups. Follow
[Node Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/)
and the
[Vercel AI SDK guide](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/vercelai/).
This path requires `@sentry/node` v11 or newer.

Do not install Eve’s OTLP exporter for the same runtime unless the user explicitly asks
for the trace-only Eve exporter path.
If an Eve OTLP exporter already exists, ask whether to keep that trace-only setup or
switch to the Node SDK setup; do not run both.

## Local guardrails

- Inspect existing Sentry, OpenTelemetry, and AI instrumentation before editing.
- Choose one AI span producer per runtime.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify by exercising a real AI call or agent turn and confirming AI spans in Sentry.
