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
| Node.js | [Node Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/) |
| Bun | [Bun Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/bun/agent-tracing/) |
| Deno | [Deno Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/deno/agent-tracing/) |
| Next.js | [Next.js Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nextjs/agent-tracing/) |
| NestJS | [NestJS Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/nestjs/agent-tracing/) |
| Cloudflare Workers / Pages | [Cloudflare Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/) |
| Python | [Python Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/) |
| Laravel / PHP | [Laravel Agent Tracing](https://docs.sentry.io/platforms/php/guides/laravel/agent-tracing/) |
| Custom spans | [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Agent framework guides

These frameworks have their own guide, which owns install, `init`, and AI
instrumentation. When the project uses one, follow its guide instead of the platform row
and the integration rows below, even when it is built on one of those SDKs (Eve on the
Vercel AI SDK, for example).

| Agent framework | Follow |
| --- | --- |
| Eve | [Eve](https://docs.sentry.io/platforms/javascript/guides/eve/) |
| Flue | [Flue](https://docs.sentry.io/platforms/javascript/guides/flue/) |
| Mastra | [Mastra](https://docs.sentry.io/platforms/javascript/guides/mastra/) |
| Pi Durable | [Pi Durable](https://docs.sentry.io/platforms/javascript/guides/pi-durable/) |

## Integration docs

Follow the matching integration docs after the platform is known:

| AI stack | Follow |
| --- | --- |
| Vercel AI SDK | [Vercel AI SDK Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/vercelai/) |
| OpenAI (JavaScript) | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/openai/) |
| Anthropic (JavaScript) | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/anthropic/) |
| Google Gen AI SDK (JavaScript) | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/google-genai/) |
| LangChain (JavaScript) | [LangChain Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/langchain/) |
| LangGraph (JavaScript) | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/langgraph/) |
| Workers AI | [Workers AI](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/workers-ai/) |
| Cloudflare Agents SDK | [Cloudflare Agents SDK](https://docs.sentry.io/platforms/javascript/guides/cloudflare/agent-tracing/agents-sdk/) |
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
