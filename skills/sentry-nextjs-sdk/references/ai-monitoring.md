# AI Monitoring — Sentry Next.js SDK

> OpenAI integration: `@sentry/nextjs` ≥10.28.0+  
> Vercel AI SDK integration: ≥10.6.0+ (Node/Edge/Bun), ≥10.12.0+ (Deno)  
> Anthropic integration: see platform docs

> ⚠️ **Tracing must be enabled.** AI monitoring piggybacks on tracing infrastructure. `tracesSampleRate` must be > 0.

---

## Overview

Sentry AI Agents Monitoring automatically tracks:
- Agent runs and error rates
- LLM calls (model, token counts, estimated cost)
- Tool calls and outputs
- Agent handoffs
- Full prompt/completion data (opt-in)
- Performance bottlenecks across the AI pipeline

---

## Supported AI Libraries

| Library | Integration API | Auto-enabled (Node server)? | Min SDK Version |
|---------|----------------|----------------------------|----------------|
| **OpenAI** (`openai`) | `openAIIntegration` / `instrumentOpenAiClient` | ✅ Yes | **10.28.0** |
| **Vercel AI SDK** (`ai`) | `vercelAIIntegration` | ✅ Yes (Node), ❌ Edge manual | **10.6.0** |
| **Anthropic** (`@anthropic-ai/sdk`) | `anthropicAIIntegration` / `instrumentAnthropicAiClient` | ✅ Yes | See platform docs |

---

## OpenAI Integration

### Which API to Use?

| Context | API |
|---------|-----|
| **Next.js server-side** (API routes, Server Components, Route Handlers) | `Sentry.openAIIntegration()` in `sentry.server.config.ts` |
| **Browser / client-side** | `Sentry.instrumentOpenAiClient(openaiInstance)` — manual wrapper |

### Server-Side Setup (`sentry.server.config.ts`)

`openAIIntegration` is **enabled by default** on the server. Pass it explicitly to customize options:

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Tracing MUST be enabled for AI monitoring
  tracesSampleRate: 1.0,

  integrations: [
    Sentry.openAIIntegration({
      recordInputs: true,   // capture prompts sent to OpenAI
      recordOutputs: true,  // capture completions from OpenAI
    }),
  ],
});
```

### Client-Side / Manual Wrapping

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ⚠️ Never expose this in the browser!
});

// Wrap once at module level — reuse this client everywhere
const client = Sentry.instrumentOpenAiClient(openai, {
  recordInputs: true,
  recordOutputs: true,
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Streaming — Important

For streamed responses, you **must** pass `stream_options: { include_usage: true }`. Without this, OpenAI does not include token counts in streamed responses, so Sentry cannot capture usage metrics:

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
  stream: true,
  stream_options: { include_usage: true }, // ← REQUIRED for token tracking
});
```

### OpenAI Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `recordInputs` | `boolean` | `true` if `sendDefaultPii: true` | Capture prompts/messages sent to OpenAI |
| `recordOutputs` | `boolean` | `true` if `sendDefaultPii: true` | Capture generated text/responses |

**Supported versions:** `openai` ≥4.0.0 <7

---

## Vercel AI SDK Integration

### Setup

The integration is **auto-enabled** in the Node runtime. For the Edge runtime, add it explicitly:

```typescript
// sentry.server.config.ts — Node runtime (auto-enabled, customize here)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.vercelAIIntegration({
      force: true, // ← Required for Vercel production deployments (see note below)
      recordInputs: true,
      recordOutputs: true,
    }),
  ],
});
```

```typescript
// sentry.edge.config.ts — Edge runtime requires manual opt-in
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.vercelAIIntegration(),
  ],
});
```

### Per-Call Telemetry (Required)

You **must** pass `experimental_telemetry: { isEnabled: true }` to every AI SDK function call you want traced:

```typescript
import { generateText, generateObject, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// generateText
const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "What is the capital of France?",
  experimental_telemetry: {
    isEnabled: true,
    functionId: "my-text-generation",  // helps identify this function in traces
    recordInputs: true,
    recordOutputs: true,
  },
});

// generateObject
const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: z.object({ answer: z.string() }),
  prompt: "...",
  experimental_telemetry: { isEnabled: true, functionId: "my-object-gen" },
});

// streamText
const { textStream } = await streamText({
  model: openai("gpt-4o"),
  prompt: "...",
  experimental_telemetry: { isEnabled: true, functionId: "my-stream" },
});
```

### Vercel Production: `force: true`

When deployed to Vercel, the `ai` package gets bundled in Next.js production builds. This prevents automatic module detection, causing spans to use raw names (`ai.toolCall`, `ai.streamText`) instead of semantic names (`gen_ai.execute_tool`, `gen_ai.stream_text`).

**Fix — always use `force: true` in `sentry.server.config.ts` when deploying to Vercel:**
```typescript
Sentry.vercelAIIntegration({ force: true })
```

### Vercel AI SDK Configuration Options

| Option | Type | Default | Min SDK | Description |
|--------|------|---------|---------|-------------|
| `force` | `boolean` | `false` | 9.29.0 | Force-enable regardless of module detection. Use on Vercel. |
| `recordInputs` | `boolean` | `true`* | 9.27.0 | Capture inputs. *Defaults to `true` when `sendDefaultPii: true`. |
| `recordOutputs` | `boolean` | `true`* | 9.27.0 | Capture outputs. *Defaults to `true` when `sendDefaultPii: true`. |

**Supported versions:** `ai` ≥3.0.0 ≤6

---

## Anthropic Integration

### Server-Side Setup

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

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
import * as Sentry from "@sentry/nextjs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // ⚠️ Never expose in the browser!
});

const client = Sentry.instrumentAnthropicAiClient(anthropic, {
  recordInputs: true,
  recordOutputs: true,
});

const response = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude!" }],
});
```

### Supported Anthropic Operations

| Operation | Method |
|-----------|--------|
| Create messages | `client.messages.create()` |
| Stream messages | `client.messages.stream()` |
| Count tokens | `client.messages.countTokens()` |
| Legacy completions | `client.completions.create()` |
| Beta messages | `client.beta.messages.create()` |

**Supported versions:** `@anthropic-ai/sdk` ≥0.19.2 <1.0.0

---

## Token Usage Tracking

Sentry automatically captures token usage following OpenTelemetry GenAI semantic conventions:

| Span Attribute | Description |
|----------------|-------------|
| `gen_ai.request.model` | Model name |
| `gen_ai.usage.input_tokens` | Prompt/input token count |
| `gen_ai.usage.output_tokens` | Completion/output token count |
| `gen_ai.usage.input_tokens.cached` | Cached input tokens |
| `gen_ai.usage.input_tokens.cache_write` | Cache write tokens |
| `gen_ai.usage.output_tokens.reasoning` | Reasoning tokens (e.g., o1 models) |

**Cost estimates** are sourced from models.dev and OpenRouter. Limitations: no volume discounts, no non-token charges, unrecognized models show no estimate.

---

## Prompt/Completion Capture & PII

`recordInputs` captures prompts sent to the AI API.  
`recordOutputs` captures the generated text/completions returned.

Both default to `true` only when `sendDefaultPii: true` is set:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true, // ← enables input/output recording by default
  tracesSampleRate: 1.0,
});
```

Or enable explicitly without `sendDefaultPii`:

```typescript
integrations: [
  Sentry.openAIIntegration({
    recordInputs: true,   // explicitly opt in
    recordOutputs: true,
  }),
],
```

> ⚠️ **PII warning:** Prompts often contain user-supplied text. If users include personal data in prompts, enabling `recordInputs` will send that data to Sentry. Review your privacy policy before enabling.

---

## Complete Setup Example

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.openAIIntegration({ recordInputs: true, recordOutputs: true }),
    Sentry.vercelAIIntegration({ force: true, recordInputs: true, recordOutputs: true }),
    Sentry.anthropicAIIntegration({ recordInputs: true, recordOutputs: true }),
  ],
});
```

```typescript
// app/api/chat/route.ts — OpenAI with streaming
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sentryOpenAI = Sentry.instrumentOpenAiClient(openai);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const completion = await sentryOpenAI.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
    stream_options: { include_usage: true }, // ← Required for token tracking
  });

  // ... stream response to client
}
```

```typescript
// app/api/generate/route.ts — Vercel AI SDK
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await generateText({
    model: openai("gpt-4o"),
    prompt,
    experimental_telemetry: {
      isEnabled: true,            // ← Required for Sentry to capture spans
      functionId: "chat-handler",
      recordInputs: true,
      recordOutputs: true,
    },
  });

  return Response.json({ text: result.text });
}
```

---

## AI Agents Dashboard

Access at **Sentry → AI → Agents** (or **Insights → AI**).

| Tab | What you see |
|-----|-------------|
| **Overview** | Agent runs, error rates, duration, LLM calls, tokens used, tool calls |
| **Models** | Per-model cost estimates, token breakdown (input/output/cached), duration |
| **Tools** | Per-tool call counts, error rates, input/output for each invocation |
| **Traces** | Full pipeline from user request to final response with all spans |

---

## SDK Version Matrix

| Feature | Min SDK Version |
|---------|----------------|
| Vercel AI SDK integration (Node/CF/Edge/Bun) | **10.6.0** |
| Vercel AI SDK integration (Deno) | **10.12.0** |
| Vercel AI `recordInputs`/`recordOutputs` | 9.27.0 |
| Vercel AI `force` option | 9.29.0 |
| OpenAI integration (`openAIIntegration` / `instrumentOpenAiClient`) | **10.28.0** |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans appearing | Verify `tracesSampleRate` > 0; AI monitoring requires tracing |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` to all OpenAI streaming calls |
| Vercel AI spans show raw names (`ai.toolCall`) | Add `vercelAIIntegration({ force: true })` in server config |
| `recordInputs`/`recordOutputs` not capturing | Set `sendDefaultPii: true` or explicitly pass `recordInputs: true` to the integration |
| Anthropic spans missing | Check SDK version supports Anthropic integration; add `anthropicAIIntegration()` explicitly |
| Cost estimates not showing | Model name must match models.dev/OpenRouter pricing data; custom/fine-tuned models may show no estimate |
| Edge runtime AI spans missing | Add `vercelAIIntegration()` to `sentry.edge.config.ts` explicitly (not auto-enabled for Edge) |
| OpenAI browser-side spans missing | Use `instrumentOpenAiClient()` wrapper — `openAIIntegration()` only works server-side |
| No data in AI Agents dashboard | Ensure traces are being sent; check DSN and `tracesSampleRate` |
