# AI Monitoring — Sentry Node.js SDK

> Minimum SDK: `@sentry/node` ≥10.28.0 (OpenAI, Anthropic, LangChain, LangGraph, Google GenAI)
> Vercel AI SDK: ≥10.6.0 (Node/Bun), ≥10.12.0 (Deno)

> **Tracing must be enabled.** AI monitoring piggybacks on tracing infrastructure. `tracesSampleRate` must be > 0.

---

## Overview

Sentry AI Agents Monitoring automatically tracks:
- Agent runs and error rates
- LLM calls (model, token counts, estimated cost)
- Tool calls and outputs
- Agent handoffs
- Full prompt/completion data (opt-in)
- Performance bottlenecks across the AI pipeline

All integrations are **auto-enabled** when the corresponding AI library is detected at startup. Explicit configuration is only needed to customize `recordInputs`/`recordOutputs`.

---

## Supported AI Libraries

| Library | Integration API | Auto-enabled? | Min SDK Version |
|---------|----------------|---------------|----------------|
| **OpenAI** (`openai`) | `openAIIntegration` / `instrumentOpenAiClient` | Yes | **10.28.0** |
| **Anthropic** (`@anthropic-ai/sdk`) | `anthropicAIIntegration` / `instrumentAnthropicAiClient` | Yes | **10.28.0** |
| **Vercel AI SDK** (`ai`) | `vercelAIIntegration` | Yes | **10.6.0** |
| **LangChain** (`@langchain/core`) | `langChainIntegration` | Yes | **10.28.0** |
| **LangGraph** (`@langchain/langgraph`) | `langGraphIntegration` | Yes | **10.28.0** |
| **Google GenAI** (`@google/genai`) | `googleGenAIIntegration` | Yes | **10.28.0** |

---

## OpenAI Integration

### Auto-Enabled Setup

OpenAI is auto-instrumented — no changes to `instrument.ts` needed. To customize:

```typescript
// instrument.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  integrations: [
    Sentry.openAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
```

### Manual Wrapping (Alternative)

If auto-instrumentation doesn't capture your client (e.g., custom transport):

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/node";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Wrap once at module level — reuse this client everywhere
const client = Sentry.instrumentOpenAiClient(openai, {
  recordInputs: true,
  recordOutputs: true,
});
```

### Browser / Next.js Client-Side (Manual Required)

In browser-side code, auto-instrumentation is not available. Wrap manually:

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs"; // or @sentry/react, @sentry/browser

const openai = Sentry.instrumentOpenAiClient(new OpenAI());
```

### Streaming — Important

For streamed responses, pass `stream_options: { include_usage: true }`. Without this, OpenAI does not include token counts in streamed responses:

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
  stream: true,
  stream_options: { include_usage: true }, // REQUIRED for token tracking
});
```

---

## Anthropic Integration

### Setup

```typescript
// instrument.ts — customize if needed
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.anthropicAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
```

### Manual Wrapping

```typescript
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/node";

const anthropic = new Anthropic();
const client = Sentry.instrumentAnthropicAiClient(anthropic, {
  recordInputs: true,
  recordOutputs: true,
});
```

### Supported Operations

| Operation | Method |
|-----------|--------|
| Create messages | `client.messages.create()` |
| Stream messages | `client.messages.stream()` |
| Count tokens | `client.messages.countTokens()` |
| Beta messages | `client.beta.messages.create()` |

---

## Vercel AI SDK Integration

### Setup

```typescript
// instrument.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.vercelAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
```

### Per-Call Telemetry (Required)

You **must** pass `experimental_telemetry: { isEnabled: true }` to every AI SDK call you want traced:

```typescript
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
  experimental_telemetry: {
    isEnabled: true,
    functionId: "my-generation",
    recordInputs: true,
    recordOutputs: true,
  },
});
```

---

## LangChain / LangGraph Integration

Both are auto-enabled. To customize:

```typescript
integrations: [
  Sentry.langChainIntegration({
    recordInputs: true,
    recordOutputs: true,
  }),
  Sentry.langGraphIntegration({
    recordInputs: true,
    recordOutputs: true,
  }),
],
```

LangGraph tracks `gen_ai.create_agent` (StateGraph.compile) and `gen_ai.invoke_agent` (CompiledGraph.invoke) spans, plus conversation IDs from `configurable.thread_id`.

---

## Manual Instrumentation — `gen_ai.*` Spans

Use when the library isn't supported, or for wrapping custom AI logic.

### Span Types

| `op` Value | Purpose |
|------------|---------|
| `gen_ai.request` | Individual LLM calls |
| `gen_ai.invoke_agent` | Agent execution lifecycle |
| `gen_ai.execute_tool` | Tool/function calls |
| `gen_ai.handoff` | Agent-to-agent transitions |

### Example: LLM Request

```typescript
await Sentry.startSpan({
  op: "gen_ai.request",
  name: "chat gpt-4o",
  attributes: {
    "gen_ai.system": "openai",
    "gen_ai.request.model": "gpt-4o",
  },
}, async (span) => {
  const result = await myClient.chat(messages);
  span.setAttribute("gen_ai.usage.input_tokens", result.usage.promptTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.usage.completionTokens);
  span.setAttribute("gen_ai.response.model", result.model);
  return result;
});
```

### Example: Agent Invocation

```typescript
await Sentry.startSpan({
  op: "gen_ai.invoke_agent",
  name: "invoke_agent Weather Agent",
  attributes: {
    "gen_ai.agent.name": "Weather Agent",
    "gen_ai.request.model": "gpt-4o",
  },
}, async (span) => {
  const result = await myAgent.run(task);
  span.setAttribute("gen_ai.usage.input_tokens", result.totalInputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.totalOutputTokens);
  return result;
});
```

### Example: Tool Execution

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

---

## Token Usage & Cost Tracking

| Attribute | Description |
|-----------|-------------|
| `gen_ai.usage.input_tokens` | Total input tokens (including cached) |
| `gen_ai.usage.output_tokens` | Total output tokens (including reasoning) |
| `gen_ai.usage.input_tokens.cached` | Subset served from cache |
| `gen_ai.usage.input_tokens.cache_write` | Tokens written to cache (Anthropic) |
| `gen_ai.usage.output_tokens.reasoning` | Subset for chain-of-thought (o1, o3) |
| `gen_ai.usage.total_tokens` | Sum of input + output |

> Cached and reasoning tokens are **subsets** of totals, not additive. Incorrect reporting produces wrong cost calculations.

---

## Prompt/Completion Capture & PII

`recordInputs`/`recordOutputs` default to `true` only when `sendDefaultPii: true`:

| `sendDefaultPii` | `recordInputs` | Prompts captured? |
|-------------------|-----------------|-------------------|
| `false` (default) | `true` | No |
| `true` | `true` (default) | Yes |
| `true` | `false` | No |

> Prompts often contain user-supplied text. Review your privacy policy before enabling.

---

## Agent Workflow Hierarchy

```
Transaction (HTTP request)
└── gen_ai.invoke_agent  "Weather Agent"
    ├── gen_ai.request   "chat gpt-4o"
    ├── gen_ai.execute_tool "get_weather"
    ├── gen_ai.request   "chat gpt-4o"        ← follow-up
    └── gen_ai.handoff   "→ Report Writer"
        └── gen_ai.invoke_agent "Report Writer"
            ├── gen_ai.request  "chat gpt-4o"
            └── gen_ai.execute_tool "format_report"
```

---

## Sampling Strategy

If your `tracesSampleRate` is below 1.0, you may be losing entire agent runs. See the [AI sampling guide](../../sentry-setup-ai-monitoring/references/sampling.md) for `tracesSampler` patterns that keep 100% of gen_ai-related transactions while sampling other traffic at a lower rate.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans appearing | Verify `tracesSampleRate` > 0; check SDK version >=10.28.0 |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` to OpenAI streaming calls |
| `recordInputs`/`recordOutputs` not capturing | Set `sendDefaultPii: true` or explicitly pass to the integration |
| Vercel AI spans not tracked | Pass `experimental_telemetry: { isEnabled: true }` to every AI SDK call |
| Browser OpenAI not traced | Use `Sentry.instrumentOpenAiClient()` — auto-instrumentation is server-side only |
| Cost estimates not showing | Model name must match models.dev/OpenRouter pricing data |
| LangGraph conversation ID missing | Pass `config: { configurable: { thread_id: "..." } }` to `invoke()` |
