# AI / Agent Monitoring — What & Why

The Sentry docs are the source of truth for Agent Tracing setup, span attributes,
provider support, Conversations, privacy, and cost behavior.
Use this file to choose the docs page to follow; do not duplicate the docs here.

## Product docs

Read these when the user needs the why, UI behavior, or data model:

| Topic | Follow |
| --- | --- |
| Agent Tracing overview | [Agent Tracing](https://docs.sentry.io/product/agents/) |
| Multi-turn transcript grouping | [Conversations](https://docs.sentry.io/product/agents/conversations/) |
| Token and model spend | [Costs](https://docs.sentry.io/product/agents/costs/) |
| Prompt, response, and tool-data privacy | [Privacy](https://docs.sentry.io/product/agents/privacy/) and [`data-scrubbing.md`](data-scrubbing.md) |

## Conversations

Conversations group spans into a chat-style timeline; follow the
[conversation ID docs](https://docs.sentry.io/product/agents/conversations/#conversation-id)
for grouping requirements.

## Platform docs

Open the platform docs before changing code:

| Platform or runtime | Follow |
| --- | --- |
| Node.js, Bun, or Deno | [Node Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/) |
| Next.js | [Next.js Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/) |
| NestJS | [NestJS Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/) |
| Cloudflare Workers / Pages | [Cloudflare Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/) |
| Python | [Python Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/) |
| Laravel / PHP | [Laravel Agent Tracing](https://docs.sentry.io/platforms/php/guides/laravel/agent-tracing/) |
| React Native | [React Native Agent Tracing](https://docs.sentry.io/platforms/react-native/agent-tracing/) |
| Custom spans | [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Integration docs

Follow the matching integration docs after the platform is known:

| AI stack | Follow |
| --- | --- |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/vercelai/) |
| OpenAI (JavaScript) | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/openai/) |
| Anthropic (JavaScript) | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/anthropic/) |
| Google Gen AI SDK (JavaScript) | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/google-genai/) |
| LangChain (JavaScript) | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/langchain/) |
| LangGraph (JavaScript) | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/langgraph/) |
| Mastra | [Mastra Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/mastra/) |
| Flue on Node.js | [Flue Node Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/flue/) |
| Flue on Cloudflare | [Flue Cloudflare Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/flue/) |
| Workers AI | [Workers AI](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/workers-ai/) |
| Cloudflare Agents SDK | [Cloudflare Agents SDK](https://docs.sentry.io/platforms/javascript/guides/cloudflare/features/agents-sdk/) |
| OpenAI (Python) | [Python OpenAI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/openai/) |
| OpenAI Agents SDK (Python) | [OpenAI Agents SDK Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/openai-agents/) |
| Anthropic (Python) | [Python Anthropic Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/anthropic/) |
| Google Gen AI SDK (Python) | [Python Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/google-genai/) |
| LangChain (Python) | [Python LangChain Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/langchain/) |
| LangGraph (Python) | [Python LangGraph Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/langgraph/) |
| LiteLLM | [LiteLLM Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/litellm/) |
| Pydantic AI | [Pydantic AI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/pydantic-ai/) |
| Hugging Face Hub | [Hugging Face Hub Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/huggingface_hub/) |
| Laravel AI | [Laravel AI integration](https://docs.sentry.io/platforms/php/guides/laravel/integrations/laravel-ai/) |

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

## Decisions before editing

Before making an AI-monitoring change, answer these from the docs and the project state:

1. **Which runtime owns AI spans?** Use one Sentry SDK, framework exporter, or OTLP path
   per runtime. Do not create duplicate AI span producers.
2. **Is tracing enabled and sampled?** AI spans are trace data.
   If the root trace is dropped, the agent run is dropped.
3. **Are inputs and outputs captured?** For AI monitoring, prompt, response, tool
   argument, tool result, and system-instruction capture is what makes Agent Tracing
   useful. Keep it enabled by default; if the user raises a privacy, security, or
   compliance concern, follow the docs to disable or scope capture.
4. **How are conversations grouped?** Use a stable opaque conversation ID when the
   integration does not infer one.
5. **Are token counts shaped correctly?** Cached, cache-creation, and reasoning counts
   are subsets of total input/output counts.
   Follow the cost docs and GenAI conventions.

## Related local references

- [`tracing.md`](tracing.md) — AI monitoring is tracing; spans are the substrate.
- [`data-scrubbing.md`](data-scrubbing.md) — prompt/output capture is the PII decision.
- [`reduce-volume.md`](reduce-volume.md) — the volume/cost tradeoff across signals.
