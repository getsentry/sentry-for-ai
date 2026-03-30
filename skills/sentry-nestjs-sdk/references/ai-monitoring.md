# AI Monitoring — Sentry NestJS SDK

> OpenAI integration: `@sentry/nestjs` ≥10.28.0+
> Vercel AI SDK integration: ≥10.6.0+
> Anthropic integration: see platform docs
> Google GenAI integration: see platform docs

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

All integrations listed below are **auto-enabled** when the corresponding AI library is detected at startup. Explicit configuration is only needed to customize `recordInputs`/`recordOutputs`.

---

## Supported AI Libraries

| Library | Integration API | Auto-enabled? | Min SDK Version |
|---------|----------------|---------------|----------------|
| **OpenAI** (`openai`) | `openAIIntegration` / `instrumentOpenAiClient` | ✅ Yes | **10.28.0** |
| **Vercel AI SDK** (`ai`) | `vercelAIIntegration` | ✅ Yes | **10.6.0** |
| **Anthropic** (`@anthropic-ai/sdk`) | `anthropicAIIntegration` / `instrumentAnthropicAiClient` | ✅ Yes | See docs |
| **Google GenAI** (`@google/generative-ai`) | — | ✅ Yes | See docs |
| **LangChain** (`langchain`, `@langchain/core`) | `langchainIntegration` | ✅ Yes | See docs |

---

## OpenAI Integration

### Auto-Enabled Setup

OpenAI is auto-instrumented — no changes to `instrument.ts` needed. To customize:

```typescript
// instrument.ts
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true, // enables recordInputs/recordOutputs by default
  integrations: [
    Sentry.openAIIntegration({
      recordInputs: true,   // capture prompts sent to OpenAI
      recordOutputs: true,  // capture generated text/completions
    }),
  ],
});
```

### Manual Wrapping (Alternative)

If auto-instrumentation doesn't capture your client (e.g., custom transport), wrap it manually:

```typescript
import OpenAI from "openai";
import * as Sentry from "@sentry/nestjs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Wrap once at module level — reuse this client everywhere
const client = Sentry.instrumentOpenAiClient(openai, {
  recordInputs: true,
  recordOutputs: true,
});
```

### Streaming — Important

For streamed responses, you **must** pass `stream_options: { include_usage: true }`. Without this, OpenAI does not include token counts in streamed responses, so Sentry cannot capture usage metrics:

```typescript
@Injectable()
export class ChatService {
  constructor(private readonly openai: OpenAI) {}

  async streamChat(messages: Array<{ role: string; content: string }>) {
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      stream_options: { include_usage: true }, // ← REQUIRED for token tracking
    });
    return stream;
  }
}
```

### OpenAI Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `recordInputs` | `boolean` | `true` if `sendDefaultPii: true` | Capture prompts/messages sent to OpenAI |
| `recordOutputs` | `boolean` | `true` if `sendDefaultPii: true` | Capture generated text/responses |

**Supported versions:** `openai` ≥4.0.0

---

## Vercel AI SDK Integration

### Setup

The integration is **auto-enabled** when the `ai` package is detected:

```typescript
// instrument.ts — customize if needed
import * as Sentry from "@sentry/nestjs";

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

You **must** pass `experimental_telemetry: { isEnabled: true }` to every AI SDK function call you want traced:

```typescript
import { Injectable } from "@nestjs/common";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

@Injectable()
export class AiService {
  async generate(prompt: string) {
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "my-text-generation",
        recordInputs: true,
        recordOutputs: true,
      },
    });
    return result.text;
  }

  async *stream(prompt: string) {
    const { textStream } = await streamText({
      model: openai("gpt-4o"),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "my-stream",
      },
    });
    yield* textStream;
  }
}
```

### Vercel AI SDK Configuration Options

| Option | Type | Default | Min SDK | Description |
|--------|------|---------|---------|-------------|
| `recordInputs` | `boolean` | `true`* | 9.27.0 | Capture inputs. *Defaults to `true` when `sendDefaultPii: true`. |
| `recordOutputs` | `boolean` | `true`* | 9.27.0 | Capture outputs. *Defaults to `true` when `sendDefaultPii: true`. |

**Supported versions:** `ai` ≥3.0.0

---

## Anthropic Integration

### Setup

```typescript
// instrument.ts — customize if needed
import * as Sentry from "@sentry/nestjs";

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
import * as Sentry from "@sentry/nestjs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const client = Sentry.instrumentAnthropicAiClient(anthropic, {
  recordInputs: true,
  recordOutputs: true,
});

const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
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
| Beta messages | `client.beta.messages.create()` |

**Supported versions:** `@anthropic-ai/sdk` ≥0.19.2

---

## Token Usage Tracking

Sentry automatically captures token usage following OpenTelemetry GenAI semantic conventions:

| Span Attribute | Description |
|----------------|-------------|
| `gen_ai.request.model` | Model name |
| `gen_ai.usage.input_tokens` | Prompt/input token count |
| `gen_ai.usage.output_tokens` | Completion/output token count |
| `gen_ai.usage.input_tokens.cached` | Cached input tokens |
| `gen_ai.usage.output_tokens.reasoning` | Reasoning tokens (e.g., o1 models) |

**Cost estimates** are sourced from models.dev and OpenRouter. Unrecognized models show no estimate.

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

> ⚠️ **PII warning:** Prompts often contain user-supplied text. If users include personal data in prompts, enabling `recordInputs` will send that data to Sentry. Review your privacy policy before enabling.

---

## Complete NestJS Example

```typescript
// instrument.ts
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  enableLogs: true,
  integrations: [
    Sentry.openAIIntegration({ recordInputs: true, recordOutputs: true }),
    Sentry.vercelAIIntegration({ recordInputs: true, recordOutputs: true }),
    Sentry.anthropicAIIntegration({ recordInputs: true, recordOutputs: true }),
  ],
});
```

```typescript
// ai.controller.ts
import { Controller, Post, Body } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  async chat(@Body() body: { prompt: string }) {
    return this.aiService.chat(body.prompt);
  }
}
```

```typescript
// ai.service.ts
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import * as Sentry from "@sentry/nestjs";

@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(prompt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content ?? "";
  }
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

## Sampling Strategy

If your `tracesSampleRate` is below 1.0, you may be losing entire agent runs. See the [AI sampling guide](../../sentry-setup-ai-monitoring/references/sampling.md) for `tracesSampler` patterns that keep 100% of gen_ai-related transactions while sampling other traffic at a lower rate.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AI spans appearing | Verify `tracesSampleRate` > 0; AI monitoring requires tracing |
| Token counts missing in streams | Add `stream_options: { include_usage: true }` to all OpenAI streaming calls |
| `recordInputs`/`recordOutputs` not capturing | Set `sendDefaultPii: true` or explicitly pass `recordInputs: true` to the integration |
| Anthropic spans missing | Check SDK version; add `anthropicAIIntegration()` explicitly |
| Cost estimates not showing | Model name must match models.dev/OpenRouter pricing data; custom models may show no estimate |
| Vercel AI spans not tracked | Pass `experimental_telemetry: { isEnabled: true }` to every AI SDK call |
| No data in AI Agents dashboard | Ensure traces are being sent; check DSN and `tracesSampleRate` |
