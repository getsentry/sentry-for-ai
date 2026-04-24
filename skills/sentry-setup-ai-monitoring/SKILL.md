---
name: sentry-setup-ai-monitoring
description: Setup Sentry AI Agent Monitoring in any project. Use when asked to monitor LLM calls, track AI agents, or instrument OpenAI/Anthropic/Vercel AI/LangChain/Google GenAI/Pydantic AI. Detects installed AI SDKs and configures appropriate integrations.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > AI Monitoring

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

## Sampling Check

After detecting AI SDKs, check the current sampling configuration:

```bash
# JavaScript
grep -E 'tracesSampleRate|tracesSampler' sentry.*.config.* instrument.* src/instrument.* app/instrument.* 2>/dev/null

# Python
grep -E 'traces_sample_rate|traces_sampler' *.py **/*.py 2>/dev/null
```

**If `tracesSampleRate` / `traces_sample_rate` is below 1.0 AND no `tracesSampler` / `traces_sampler` is configured:**

Ask the user:

> "Your current sample rate is {rate}. Agent runs are sampled as complete span trees — if the root span is dropped, all child gen_ai spans are lost. For full AI visibility, gen_ai-related transactions should be sampled at 100%. Would you like me to set up a `tracesSampler` that keeps AI traces at 100% while sampling other traffic at your current rate?"

If user confirms, read `${SKILL_ROOT}/references/sampling.md` for implementation patterns.

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

Use when no supported SDK is detected. Follow the canonical [Sentry Conventions for `gen_ai.*` attributes](https://getsentry.github.io/sentry-conventions/attributes/gen_ai/) — the [JS docs](https://docs.sentry.io/platforms/javascript/guides/connect/ai-agent-monitoring/#manual-instrumentation) may lag behind; do not set attributes marked deprecated in the conventions.

### Span Types

| `op` | Span `name` pattern | Purpose |
|------|---------------------|---------|
| `gen_ai.{operation}` (e.g. `gen_ai.chat`, `gen_ai.request`) | `{operation} {model}` (e.g. `chat gpt-4o`) | Individual LLM call |
| `gen_ai.invoke_agent` | `invoke_agent {agent_name}` | Agent execution lifecycle |
| `gen_ai.execute_tool` | `execute_tool {tool_name}` | Tool/function call |
| `gen_ai.handoff` | `handoff from {source} to {target}` | Agent-to-agent transition |

For LLM-call spans, the `op` follows the pattern `gen_ai.{gen_ai.operation.name}` — use `gen_ai.chat`, `gen_ai.embeddings`, `gen_ai.generate_content`, or `gen_ai.text_completion` where the operation is known. Span attributes only accept primitives; arrays/objects must be JSON-stringified.

### Example (JavaScript)

```javascript
const inputMessages = [
  { role: "user", parts: [{ type: "text", content: "Tell me a joke" }] },
];

await Sentry.startSpan({
  op: "gen_ai.chat",
  name: "chat gpt-4o",
  attributes: {
    "gen_ai.request.model": "gpt-4o",
    "gen_ai.operation.name": "chat",
    "gen_ai.input.messages": JSON.stringify(inputMessages),
  },
}, async (span) => {
  const result = await llmClient.complete(inputMessages);

  const outputMessages = [
    {
      role: "assistant",
      parts: [{ type: "text", content: result.text }],
      finish_reason: result.finishReason,
    },
  ];
  span.setAttribute("gen_ai.output.messages", JSON.stringify(outputMessages));
  span.setAttribute("gen_ai.usage.input_tokens", result.inputTokens);
  span.setAttribute("gen_ai.usage.output_tokens", result.outputTokens);
  return result;
});
```

### Key Attributes

**Common (all AI spans):**

| Attribute | Required | Description |
|-----------|----------|-------------|
| `gen_ai.request.model` | Yes | Model identifier (e.g., `gpt-4o`, `claude-sonnet-4-6`) |
| `gen_ai.operation.name` | No | Operation label (`chat`, `embeddings`, `invoke_agent`, `execute_tool`, `handoff`, etc.) |
| `gen_ai.agent.name` | No | Agent name (set on agent and tool spans) |

**Request / response content (PII — enable only after confirming; see Data Capture Warning above):**

| Attribute | Description |
|-----------|-------------|
| `gen_ai.input.messages` | JSON-stringified array of input messages. Each item uses `{role, parts}` where `parts` is `[{type, content}]`; `role` is `"user"`, `"assistant"`, `"tool"`, or `"system"` |
| `gen_ai.output.messages` | JSON-stringified array of response messages (text + tool calls), same shape as inputs |
| `gen_ai.system_instructions` | System prompt passed to the model |
| `gen_ai.tool.definitions` | JSON-stringified list of tools available to the model |

**Token usage:**

| Attribute | Description |
|-----------|-------------|
| `gen_ai.usage.input_tokens` | Total input tokens — **includes** cached tokens |
| `gen_ai.usage.input_tokens.cached` | Subset of input tokens served from cache |
| `gen_ai.usage.input_tokens.cache_write` | Tokens written to cache while processing input |
| `gen_ai.usage.output_tokens` | Total output tokens — **includes** reasoning tokens |
| `gen_ai.usage.output_tokens.reasoning` | Subset of output tokens used for reasoning |
| `gen_ai.usage.total_tokens` | Sum of input + output tokens |

**Tool spans (`gen_ai.execute_tool`):**

| Attribute | Description |
|-----------|-------------|
| `gen_ai.tool.name` | Tool identifier |
| `gen_ai.tool.description` | Human-readable tool description |
| `gen_ai.tool.call.arguments` | JSON-stringified tool arguments |
| `gen_ai.tool.call.result` | JSON-stringified tool result |

> Do not set the deprecated `gen_ai.tool.input`, `gen_ai.tool.output`, `gen_ai.tool.message`, or `gen_ai.tool.type`. Use `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result`; `gen_ai.tool.type` has no replacement and should not be set.

### Token Usage and Cost Calculation

Sentry uses token attributes to [calculate model costs](https://docs.sentry.io/ai/monitoring/agents/costs/). **Cached and reasoning tokens are subsets, not separate counts** — `gen_ai.usage.input_tokens` already includes `gen_ai.usage.input_tokens.cached`, and `gen_ai.usage.output_tokens` already includes `gen_ai.usage.output_tokens.reasoning`.

Sentry subtracts the cached/reasoning counts from the totals to compute the uncached/non-reasoning portion. Reporting a cached or reasoning count greater than its total produces negative costs in the dashboard.

Example — 100 input tokens total, 90 served from cache:

- Correct: `input_tokens = 100`, `input_tokens.cached = 90`
- Wrong: `input_tokens = 10`, `input_tokens.cached = 90` (cached larger than total → negative cost)

The same rule applies to `gen_ai.usage.output_tokens` vs. `gen_ai.usage.output_tokens.reasoning`.

## Verification

After configuring, make an LLM call and check the Sentry Traces dashboard. AI spans appear with `gen_ai.*` operations showing model, token counts, and latency.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI spans not appearing | Verify `tracesSampleRate > 0`, check SDK version |
| Token counts missing | Some providers don't return tokens for streaming |
| Negative or wrong costs in dashboard | Cached/reasoning tokens are subsets of totals — see Token Usage and Cost Calculation |
| Prompts not captured | Enable `recordInputs`/`include_prompts` |
| Vercel AI not working | Add `experimental_telemetry` to each call |
