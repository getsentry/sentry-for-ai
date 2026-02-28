---
name: sentry-setup-ai-monitoring
description: Setup Sentry AI Agent Monitoring in any project. Use when asked to monitor LLM calls, track AI agents, or instrument OpenAI/Anthropic/Vercel AI/LangChain/Google GenAI/Pydantic AI. Detects installed AI SDKs and configures appropriate integrations.
license: Apache-2.0
---

# Setup Sentry AI Agent Monitoring

Configure Sentry to track LLM calls, agent executions, tool usage, and token consumption.

## Invoke This Skill When

- User asks to "monitor AI/LLM calls" or "track OpenAI/Anthropic usage"
- User wants "AI observability" or "agent monitoring"
- User asks about token usage, model latency, or AI costs

**Important:** The SDK versions, API names, and code samples below are examples. Always verify against [docs.sentry.io](https://docs.sentry.io) before implementing, as APIs and minimum versions may have changed.

## Prerequisites

AI monitoring requires **tracing enabled** (`tracesSampleRate > 0`).

## Data Capture Warning

**Prompt and output recording captures user content that is likely PII.** Before enabling `recordInputs`/`recordOutputs` (JS) or `include_prompts`/`send_default_pii` (Python), confirm:

- The application's privacy policy permits capturing user prompts and model responses
- Captured data complies with applicable regulations (GDPR, CCPA, etc.)
- Sentry data retention settings are appropriate for the sensitivity of the data

**Ask the user** whether they want prompt/output capture enabled. Do not enable it by default — configure it only when explicitly requested or confirmed. Use `tracesSampleRate: 1.0` only in development; in production, use a lower value or a `tracesSampler` function.

## Detection First

**Always detect installed AI SDKs before configuring:**

```bash
# JavaScript
grep -E '"(openai|@anthropic-ai/sdk|ai|@langchain|@google/genai)"' package.json

# Python
grep -E '(openai|anthropic|langchain|huggingface)' requirements.txt pyproject.toml 2>/dev/null
```

## Supported SDKs

### JavaScript

| Package | Integration | Min Sentry SDK | Auto? |
|---------|-------------|----------------|-------|
| `openai` | `openAIIntegration()` | 10.28.0 | Yes |
| `@anthropic-ai/sdk` | `anthropicAIIntegration()` | 10.28.0 | Yes |
| `ai` (Vercel) | `vercelAIIntegration()` | 10.6.0 | Yes* |
| `@langchain/*` | `langChainIntegration()` | 10.28.0 | Yes |
| `@langchain/langgraph` | `langGraphIntegration()` | 10.28.0 | Yes |
| `@google/genai` | `googleGenAIIntegration()` | 10.28.0 | Yes |

*Vercel AI: 10.6.0+ for Node.js, Cloudflare Workers, Vercel Edge Functions, Bun. 10.12.0+ for Deno. Requires `experimental_telemetry` per-call.

### Python

Integrations auto-enable when the AI package is installed — no explicit registration needed:

| Package | Auto? | Notes |
|---------|-------|-------|
| `openai` | Yes | Includes OpenAI Agents SDK |
| `anthropic` | Yes | |
| `langchain` / `langgraph` | Yes | |
| `huggingface_hub` | Yes | |
| `google-genai` | Yes | |
| `pydantic-ai` | Yes | |
| `litellm` | **No** | Requires explicit integration |
| `mcp` (Model Context Protocol) | Yes | |

## JavaScript Configuration

### Node.js — auto-enabled integrations

Just ensure tracing is enabled. Integrations auto-enable when the AI package is installed:

```javascript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0, // Lower in production (e.g., 0.1)
  // OpenAI, Anthropic, Google GenAI, LangChain integrations auto-enable in Node.js
});
```

To customize (e.g., enable prompt capture — see Data Capture Warning):

```javascript
integrations: [
  Sentry.openAIIntegration({
    // recordInputs: true,  // Opt-in: captures prompt content (PII)
    // recordOutputs: true, // Opt-in: captures response content (PII)
  }),
],
```

### Browser / Next.js OpenAI (manual wrapping required)

In browser-side code or Next.js meta-framework apps, auto-instrumentation is not available. Wrap the client manually:

```javascript
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs"; // or @sentry/react, @sentry/browser

const openai = Sentry.instrumentOpenAiClient(new OpenAI());
// Use 'openai' client as normal
```

### LangChain / LangGraph (auto-enabled)

```javascript
integrations: [
  Sentry.langChainIntegration({
    // recordInputs: true,  // Opt-in: captures prompt content (PII)
    // recordOutputs: true, // Opt-in: captures response content (PII)
  }),
  Sentry.langGraphIntegration({
    // recordInputs: true,
    // recordOutputs: true,
  }),
],
```

### Vercel AI SDK

Add to `sentry.edge.config.ts` for Edge runtime:
```javascript
integrations: [Sentry.vercelAIIntegration()],
```

Enable telemetry per-call:
```javascript
await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
  experimental_telemetry: {
    isEnabled: true,
    // recordInputs: true,  // Opt-in: captures prompt content (PII)
    // recordOutputs: true, // Opt-in: captures response content (PII)
  },
});
```

## Python Configuration

Integrations auto-enable — just init with tracing. Only add explicit imports to customize options:

```python
import sentry_sdk

sentry_sdk.init(
    dsn="YOUR_DSN",
    traces_sample_rate=1.0,  # Lower in production (e.g., 0.1)
    # send_default_pii=True,  # Opt-in: required for prompt capture (sends user PII)
    # Integrations auto-enable when the AI package is installed.
    # Only specify explicitly to customize (e.g., include_prompts):
    # integrations=[OpenAIIntegration(include_prompts=True)],
)
```

## Manual Instrumentation

Use when no supported SDK is detected.

### Span Types

| `op` Value | Purpose |
|------------|---------|
| `gen_ai.request` | Individual LLM calls |
| `gen_ai.invoke_agent` | Agent execution lifecycle |
| `gen_ai.execute_tool` | Tool/function calls |
| `gen_ai.handoff` | Agent-to-agent transitions |

### Example (JavaScript)

```javascript
await Sentry.startSpan({
  op: "gen_ai.request",
  name: "LLM request gpt-4o",
  attributes: { "gen_ai.request.model": "gpt-4o" },
}, async (span) => {
  span.setAttribute("gen_ai.request.messages", JSON.stringify(messages));
  const result = await llmClient.complete(prompt);
  span.setAttribute("gen_ai.usage.input_tokens", result.inputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.outputTokens);
  return result;
});
```

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `gen_ai.request.model` | Model identifier |
| `gen_ai.request.messages` | JSON input messages |
| `gen_ai.usage.input_tokens` | Input token count |
| `gen_ai.usage.output_tokens` | Output token count |
| `gen_ai.agent.name` | Agent identifier |
| `gen_ai.tool.name` | Tool identifier |

Enable prompt/output capture only after confirming with the user (see Data Capture Warning above).

## Verification

After configuring, make an LLM call and check the Sentry Traces dashboard. AI spans appear with `gen_ai.*` operations showing model, token counts, and latency.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI spans not appearing | Verify `tracesSampleRate > 0`, check SDK version |
| Token counts missing | Some providers don't return tokens for streaming |
| Prompts not captured | Enable `recordInputs`/`include_prompts` |
| Vercel AI not working | Add `experimental_telemetry` to each call |
