# AI Monitoring - Sentry Node.js SDK

> Minimum SDK: `@sentry/node` >=10.28.0 (OpenAI, Anthropic, LangChain, LangGraph, Google GenAI). Vercel AI SDK: >=10.6.0.

## Prerequisites

Tracing must be enabled - AI spans require an active trace:

```typescript
Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });
```

## Integration Matrix

| Integration | Min Library | Auto-Enabled | Status |
|-------------|-------------|-------------|--------|
| OpenAI (`openai`) | openai 4.0+ | Yes | Stable |
| Anthropic (`@anthropic-ai/sdk`) | 0.19.2+ | Yes | Stable |
| Vercel AI SDK (`ai`) | ai 3.0+ | Yes* | Stable |
| LangChain (`@langchain/core`) | 0.1.0+ | Yes | Stable |
| LangGraph (`@langchain/langgraph`) | 0.1.0+ | Yes | Stable |
| Google GenAI (`@google/genai`) | 1.0+ | Yes | Stable |

*Vercel AI SDK requires `experimental_telemetry: { isEnabled: true }` on every call.

## PII Control

| `sendDefaultPii` | `recordInputs` | Prompts captured? |
|-------------------|-----------------|-------------------|
| `false` (default) | `true` | No |
| `true` | `true` (default) | Yes |
| `true` | `false` | No |

## Configuration Examples

### Auto-enabled integrations

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true, // required to capture prompts/outputs
});
// OpenAI, Anthropic, LangChain, LangGraph, Google GenAI activate automatically
```

### Explicit configuration with recordInputs/recordOutputs override

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.openAIIntegration({ recordInputs: true, recordOutputs: true }),
    Sentry.vercelAIIntegration({ recordInputs: true, recordOutputs: true }),
  ],
});
```

### Vercel AI SDK per-call telemetry (required)

```typescript
await generateText({
  model: openai("claude-sonnet-4-6"),
  prompt: "Hello",
  experimental_telemetry: { isEnabled: true, recordInputs: true, recordOutputs: true },
});
```

### Browser / Next.js client-side (manual wrapping required)

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs"; // or @sentry/browser

const openai = Sentry.instrumentOpenAiClient(new OpenAI());
```

## Manual Instrumentation - `gen_ai.*` Spans

Use when the library isn't supported, or for wrapping custom AI logic.

### `gen_ai.chat` - LLM call

```typescript
await Sentry.startSpan({
  op: "gen_ai.chat",
  name: "chat claude-sonnet-4-6",
  attributes: { "gen_ai.request.model": "claude-sonnet-4-6" },
}, async (span) => {
  span.setAttribute("gen_ai.request.messages", JSON.stringify(messages));
  const result = await myClient.chat(messages);
  span.setAttribute("gen_ai.usage.input_tokens", result.usage.inputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.usage.outputTokens);
  return result;
});
```

### `gen_ai.invoke_agent` - Agent lifecycle

```typescript
await Sentry.startSpan({
  op: "gen_ai.invoke_agent",
  name: "invoke_agent Weather Agent",
  attributes: { "gen_ai.agent.name": "Weather Agent", "gen_ai.request.model": "claude-sonnet-4-6" },
}, async (span) => {
  const result = await myAgent.run(task);
  span.setAttribute("gen_ai.usage.input_tokens", result.totalInputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.totalOutputTokens);
  return result;
});
```

### `gen_ai.execute_tool` - Tool/function call

```typescript
await Sentry.startSpan({
  op: "gen_ai.execute_tool",
  name: "execute_tool get_weather",
  attributes: {
    "gen_ai.tool.name": "get_weather",
    "gen_ai.tool.type": "function",
    "gen_ai.tool.input": JSON.stringify({ location: "Paris" }),
  },
}, async (span) => {
  const result = await getWeather("Paris");
  span.setAttribute("gen_ai.tool.output", JSON.stringify(result));
  return result;
});
```

### `gen_ai.handoff` - Agent-to-agent transition

```typescript
await Sentry.startSpan({
  op: "gen_ai.handoff",
  name: "handoff Billing → Refund Agent",
  attributes: { "gen_ai.agent.name": "Refund Agent" },
}, async (span) => {
  return await refundAgent.run(context);
});
```

## Span Attribute Reference

### Common attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `gen_ai.request.model` | string | Yes | Model identifier (e.g., `claude-sonnet-4-6`, `gemini-2.5-flash`) |
| `gen_ai.operation.name` | string | No | Human-readable operation label |
| `gen_ai.agent.name` | string | No | Agent name (for agent spans) |

### Content attributes (PII-gated - only when `sendDefaultPii: true` + `recordInputs/recordOutputs: true`)

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.request.messages` | string | **JSON-stringified** message array |
| `gen_ai.request.available_tools` | string | **JSON-stringified** tool definitions |
| `gen_ai.response.text` | string | **JSON-stringified** response array |
| `gen_ai.response.tool_calls` | string | **JSON-stringified** tool call array |

> Span attributes only accept primitives - arrays/objects must be JSON-stringified.

### Token usage attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.usage.input_tokens` | int | Total input tokens (including cached) |
| `gen_ai.usage.input_tokens.cached` | int | Subset served from cache |
| `gen_ai.usage.input_tokens.cache_write` | int | Tokens written to cache (Anthropic) |
| `gen_ai.usage.output_tokens` | int | Total output tokens (including reasoning) |
| `gen_ai.usage.output_tokens.reasoning` | int | Subset for chain-of-thought (o3, etc.) |
| `gen_ai.usage.total_tokens` | int | Sum of input + output |

> Cached and reasoning tokens are **subsets** of totals, not additive. Incorrect reporting produces wrong cost calculations.

## Agent Workflow Hierarchy

```
Transaction
└── gen_ai.invoke_agent  "Weather Agent"
    ├── gen_ai.chat      "chat claude-sonnet-4-6"
    ├── gen_ai.execute_tool "get_weather"
    ├── gen_ai.chat      "chat claude-sonnet-4-6"     ← follow-up
    └── gen_ai.handoff   "→ Report Writer"
        └── gen_ai.invoke_agent "Report Writer"
            ├── gen_ai.chat  "chat gemini-2.5-flash"
            └── gen_ai.execute_tool "format_report"
```

## Streaming

| Integration | Streaming | Token counts in streams |
|-------------|-----------|------------------------|
| OpenAI | Yes | Requires `stream_options: { include_usage: true }` |
| Anthropic | Yes | Automatic |
| Vercel AI SDK | Yes | Automatic (with `experimental_telemetry`) |
| LangChain | Yes | Tracked |
| Manual `gen_ai.*` | Yes | Set token counts after stream completes |

## Unsupported Providers

| Provider | Workaround |
|----------|-----------|
| Pydantic AI | Python SDK only - use manual `gen_ai.*` spans in Node |
| OpenAI Agents SDK | Python SDK only - use manual `gen_ai.*` spans in Node |
| HuggingFace Hub | Python SDK only - use manual `gen_ai.*` spans in Node |
| MCP | Python SDK auto-instruments MCP servers - use manual spans in Node |
| Cohere | Manual `gen_ai.*` spans |
| AWS Bedrock | Manual `gen_ai.*` spans |
| Mistral | Manual `gen_ai.*` spans |
| Groq | Manual `gen_ai.*` spans |

## Sampling Strategy

If `tracesSampleRate` < 1.0, see the [AI sampling guide](../../sentry-setup-ai-monitoring/references/sampling.md).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans appearing | Verify `tracesSampleRate > 0`; check SDK >=10.28.0 |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` (OpenAI) |
| Vercel AI spans not tracked | Add `experimental_telemetry: { isEnabled: true }` per call |
| Browser OpenAI not traced | Use `Sentry.instrumentOpenAiClient()` - auto-instrumentation is server-only |
| Prompts not captured | Set `sendDefaultPii: true` or explicit `recordInputs: true` |
| AI Agents Dashboard empty | Ensure traces are being sent; check DSN and `tracesSampleRate` |
| Wrong cost calculations | Cached/reasoning tokens are subsets of totals, not additions |
