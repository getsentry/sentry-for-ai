# AI Monitoring - Sentry Node.js SDK

> `@sentry/node` >=10.28.0 (OpenAI, Anthropic, LangChain, LangGraph, Google GenAI). Vercel AI SDK: >=10.6.0.

> Tracing must be enabled (`tracesSampleRate > 0`).

## Auto-Instrumented Integrations

All are auto-enabled when the package is detected. Explicit config only needed for `recordInputs`/`recordOutputs`.

| Library | Min SDK |
|---------|---------|
| OpenAI (`openai`) | 10.28.0 |
| Anthropic (`@anthropic-ai/sdk`) | 10.28.0 |
| Vercel AI SDK (`ai`) | 10.6.0 |
| LangChain (`@langchain/core`) | 10.28.0 |
| LangGraph (`@langchain/langgraph`) | 10.28.0 |
| Google GenAI (`@google/genai`) | 10.28.0 |

## Setup

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true, // enables recordInputs/recordOutputs
});
```

To customize per-integration:

```typescript
integrations: [
  Sentry.openAIIntegration({ recordInputs: true, recordOutputs: true }),
  Sentry.vercelAIIntegration({ recordInputs: true, recordOutputs: true }),
],
```

## Important Notes

**Vercel AI SDK** requires `experimental_telemetry: { isEnabled: true }` on every call:

```typescript
await generateText({
  model: openai("claude-sonnet-4-6"),
  prompt: "Hello",
  experimental_telemetry: { isEnabled: true },
});
```

**OpenAI streaming** requires `stream_options: { include_usage: true }` for token tracking.

**Browser/Next.js client-side** needs manual wrapping (auto-instrumentation is server-only):

```typescript
const openai = Sentry.instrumentOpenAiClient(new OpenAI());
```

## PII Control

| `sendDefaultPii` | `recordInputs` | Prompts captured? |
|-------------------|-----------------|-------------------|
| `false` (default) | `true` | No |
| `true` | `true` (default) | Yes |
| `true` | `false` | No |

## Manual Instrumentation

For unsupported libraries:

```typescript
await Sentry.startSpan({
  op: "gen_ai.chat",
  name: "chat claude-sonnet-4-6",
  attributes: { "gen_ai.system": "anthropic", "gen_ai.request.model": "claude-sonnet-4-6" },
}, async (span) => {
  const result = await myClient.chat(messages);
  span.setAttribute("gen_ai.usage.input_tokens", result.usage.inputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.usage.outputTokens);
  return result;
});
```

Span ops: `gen_ai.chat`, `gen_ai.invoke_agent`, `gen_ai.execute_tool`, `gen_ai.handoff`, `gen_ai.embeddings`

## Sampling

If `tracesSampleRate` < 1.0, see [sampling guide](../../sentry-setup-ai-monitoring/references/sampling.md).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans | Check `tracesSampleRate > 0` and SDK >=10.28.0 |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` (OpenAI) |
| Vercel AI spans missing | Add `experimental_telemetry: { isEnabled: true }` per call |
| Browser OpenAI not traced | Use `Sentry.instrumentOpenAiClient()` |
| Prompts not captured | Set `sendDefaultPii: true` or explicit `recordInputs: true` |
