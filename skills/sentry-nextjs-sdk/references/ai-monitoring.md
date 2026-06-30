# AI Monitoring — Sentry Next.js SDK

> OpenAI integration: `@sentry/nextjs` ≥10.53.0+  
> Vercel AI SDK integration: ≥10.53.0+  
> Anthropic integration: ≥10.53.0+

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
| **OpenAI** (`openai`) | `openAIIntegration` / `instrumentOpenAiClient` | ✅ Yes | **10.53.0** |
| **Vercel AI SDK** (`ai`) | `vercelAIIntegration` | ✅ Yes (Node), ❌ Edge manual | **10.53.0** |
| **Anthropic** (`@anthropic-ai/sdk`) | `anthropicAIIntegration` / `instrumentAnthropicAiClient` | ✅ Yes | **10.53.0** |

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
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  integrations: [
    Sentry.openAIIntegration(), // recordInputs/recordOutputs default to true (governed by dataCollection.genAI)
  ],
});
```

### Client-Side / Manual Wrapping

With `dataCollection`, genAI input/output capture is **on by default**. To disable it, set `dataCollection: { genAI: { inputs: false, outputs: false } }` in the matching client-side `Sentry.init()`.

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ⚠️ Never expose this in the browser!
});

// Wrap once at module level — reuse this client everywhere.
// Input/output recording is on by default (governed by dataCollection.genAI) unless explicitly overridden.
const client = Sentry.instrumentOpenAiClient(openai);

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
| `recordInputs` | `boolean` | `true` (governed by `dataCollection.genAI`) | Capture prompts/messages sent to OpenAI |
| `recordOutputs` | `boolean` | `true` (governed by `dataCollection.genAI`) | Capture generated text/responses |

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
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [
    Sentry.vercelAIIntegration({
      force: true, // ← Required for Vercel production deployments (see note below)
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
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
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
| `recordInputs` | `boolean` | `true`* | 9.27.0 | Capture inputs. *Defaults to `true` (governed by `dataCollection.genAI`). |
| `recordOutputs` | `boolean` | `true`* | 9.27.0 | Capture outputs. *Defaults to `true` (governed by `dataCollection.genAI`). |

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
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [
    Sentry.anthropicAIIntegration(),
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

// Input/output recording is on by default (governed by dataCollection.genAI) unless explicitly overridden.
const client = Sentry.instrumentAnthropicAiClient(anthropic);

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
| `gen_ai.request.reasoning_effort` | Reasoning effort level for reasoning models (e.g., `low`, `medium`, `high`). Supported values vary by provider. |
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

With `dataCollection`, genAI input/output capture is **on by default**. To disable it, set `dataCollection: { genAI: { inputs: false, outputs: false } }`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  dataCollection: {
    genAI: { inputs: false, outputs: false },
  },
  tracesSampleRate: 1.0,
});
```

Use explicit integration options only when you need per-integration overrides instead of the SDK-level default:

```typescript
integrations: [
  Sentry.openAIIntegration({
    recordInputs: false,  // opt out for this integration despite genAI capture being on by default
    recordOutputs: false,
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
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [
    Sentry.openAIIntegration(),
    Sentry.vercelAIIntegration({ force: true }),
    Sentry.anthropicAIIntegration(),
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
| Vercel AI SDK integration (Node/CF/Edge/Bun) | **10.53.0** |
| Vercel AI SDK integration (Deno) | **10.53.0** |
| Vercel AI `recordInputs`/`recordOutputs` | 9.27.0 |
| Vercel AI `force` option | 9.29.0 |
| OpenAI integration (`openAIIntegration` / `instrumentOpenAiClient`) | **10.53.0** |

---

## Sampling Strategy

If your `tracesSampleRate` is below 1.0, you may be losing entire agent runs. See the [AI sampling guide](../../sentry-setup-ai-monitoring/references/sampling.md) for `tracesSampler` patterns that keep 100% of gen_ai-related transactions while sampling other traffic at a lower rate.

---

## Conversation Tracking

Link AI spans across turns into a chat-style timeline at **Explore > Conversations**.

**Prerequisites:** `streamGenAiSpans` defaults to `true` (SDK >=10.61.0, so AI spans stream as standalone items) and genAI input/output capture enabled (on by default via `dataCollection`) in your server config — Conversations reconstructs the chat from input/output attributes, so without input/output capture the view will be empty.

```typescript
import * as Sentry from "@sentry/nextjs";

// Set at the start of a conversation (server-side)
Sentry.setConversationId("conv_abc123");

// All subsequent AI calls carry gen_ai.conversation.id: "conv_abc123"
await openai.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "Hello" }],
});
```

A single conversation can span multiple traces, and a single trace can contain multiple conversations.

### User Attribution

To populate the **User** column in Conversations, call `setUser` once per request or session before any AI calls:

```typescript
Sentry.setUser({ id: "user_123", email: "jane@example.com", username: "jane" });
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans appearing | Verify `tracesSampleRate` > 0; AI monitoring requires tracing |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` to all OpenAI streaming calls |
| Vercel AI spans show raw names (`ai.toolCall`) | Add `vercelAIIntegration({ force: true })` in server config |
| `recordInputs`/`recordOutputs` not capturing | genAI capture is on by default; ensure you haven't set `dataCollection: { genAI: { inputs: false } }`, or explicitly pass `recordInputs: true` / `recordOutputs: true` to the integration |
| Anthropic spans missing | Check SDK version supports Anthropic integration; add `anthropicAIIntegration()` explicitly |
| Cost estimates not showing | Model name must match models.dev/OpenRouter pricing data; custom/fine-tuned models may show no estimate |
| Edge runtime AI spans missing | Add `vercelAIIntegration()` to `sentry.edge.config.ts` explicitly (not auto-enabled for Edge) |
| User column shows "Unknown" | Call `Sentry.setUser()` once per request or session |
| OpenAI browser-side spans missing | Use `instrumentOpenAiClient()` wrapper — `openAIIntegration()` only works server-side |
| No data in AI Agents dashboard | Ensure traces are being sent; check DSN and `tracesSampleRate` |
