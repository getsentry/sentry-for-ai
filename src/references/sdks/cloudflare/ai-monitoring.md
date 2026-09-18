# AI / LLM Monitoring (Agent Tracing) — Sentry Cloudflare SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, Cloudflare runtime
constraints, integration APIs, options, examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| Cloudflare Worker or Pages app | [Cloudflare Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/) |
| Workers AI (`env.AI`) | [Workers AI](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/workers-ai/) |
| Cloudflare Agents SDK | [Cloudflare Agents SDK](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/agents-sdk/) |
| Durable Object host | [Durable Object instrumentation](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/durableobject/) |
| OpenAI | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/openai/) |
| Anthropic | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/anthropic/) |
| Google Gen AI SDK | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/google-genai/) |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/vercelai/) |
| LangChain | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/langchain/) |
| LangGraph | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/langgraph/) |
| Flue on Cloudflare | [Flue Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/flue/) |
| Build-time provider instrumentation | [Cloudflare Vite plugin](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/vite-plugin/) |
| Node.js compatibility needed | [Node.js compatibility](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/nodejs-compat/) |
| Custom or unsupported library | [Cloudflare manual instrumentation](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/manual-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Local guardrails

- Workerd cannot rely on Node-style runtime monkey-patching.
  Follow the Cloudflare docs for the exact supported route: host wrapper, Agents SDK
  wrapper, Workers AI automatic spans, Vite build-time injection, or manual
  instrumentation.
- Compose layers only when the docs say they compose.
  Do not add provider instrumentation to Flue-generated model calls.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify under the real Worker or Durable Object path that performs the AI call.
