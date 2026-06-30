---
name: sentry-setup-ai-monitoring
description: Setup Sentry AI Agent Monitoring in any project. Use when asked to monitor LLM calls, track AI agents, track conversations, or instrument OpenAI/Anthropic/Vercel AI/LangChain/Google GenAI/Pydantic AI. Detects installed AI SDKs and configures appropriate integrations.
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

If the app has multi-turn chats, set a conversation ID by default anywhere it makes sense to identify a chat session. Sentry uses `gen_ai.conversation.id` to group related AI spans into Conversations. Some integrations infer it automatically, but many setups need to set it explicitly.

## Data Capture Warning

**Prompt and output recording captures user content that is likely PII.** In JavaScript, genAI input/output capture is **on by default** (governed by `dataCollection.genAI`); in Python it is enabled via `send_default_pii=True`. Before relying on this capture (or per-integration overrides — `recordInputs`/`recordOutputs` in JS, `include_prompts` in Python), confirm:

- The application's privacy policy permits capturing user prompts and model responses
- Captured data complies with applicable regulations (GDPR, CCPA, etc.)
- Sentry data retention settings are appropriate for the sensitivity of the data

**Ask the user** whether they want prompt/output capture enabled. Do not enable prompt/output capture without explicit confirmation. Use `tracesSampleRate: 1.0` only in development; in production, use a lower value or a `tracesSampler` function.

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
| `openai` | `openAIIntegration()` | 10.53.0 | Yes |
| `@anthropic-ai/sdk` | `anthropicAIIntegration()` | 10.53.0 | Yes |
| `ai` (Vercel) | `vercelAIIntegration()` | 10.53.0 | Yes* |
| `@langchain/*` | `langChainIntegration()` | 10.53.0 | Yes |
| `@langchain/langgraph` | `langGraphIntegration()` | 10.53.0 | Yes |
| `@google/genai` | `googleGenAIIntegration()` | 10.53.0 | Yes |

*Vercel AI: 10.53.0+ required. Requires `experimental_telemetry` per-call.

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

To customize (e.g., enable prompt capture after user confirmation — see Data Capture Warning):

```javascript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [
    Sentry.openAIIntegration({
      // recordInputs/recordOutputs default to true (governed by dataCollection.genAI)
    }),
  ],
});
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
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [
    Sentry.langChainIntegration(),
    Sentry.langGraphIntegration(),
  ],
});
```

### Vercel AI SDK

Add to `sentry.edge.config.ts` for Edge runtime:
```javascript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  integrations: [Sentry.vercelAIIntegration()],
});
```

Enable telemetry per-call:
```javascript
await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
  experimental_telemetry: {
    isEnabled: true,
    recordInputs: true,
    recordOutputs: true,
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
    send_default_pii=True,
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
      parts: [
        // Thinking/reasoning content goes in a `reasoning` part, NOT a `text` part.
        // Sentry surfaces it separately and filters it out of the Conversations view.
        { type: "reasoning", content: result.reasoning },
        { type: "text", content: result.text },
      ],
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

**Model config (LLM call spans):**

| Attribute | Description |
|-----------|-------------|
| `gen_ai.request.reasoning_effort` | Reasoning effort level for reasoning models (e.g., `low`, `medium`, `high`). Supported values vary by provider. |

**Request / response content (PII — enable only after confirming; see Data Capture Warning above):**

| Attribute | Description |
|-----------|-------------|
| `gen_ai.input.messages` | JSON-stringified array of input messages. Each item uses `{role, parts}` where `parts` is `[{type, content}]`; `role` is `"user"`, `"assistant"`, `"tool"`, or `"system"`. Common part `type`s: `"text"`, `"reasoning"`, `"tool_call"`, `"tool_call_response"` |
| `gen_ai.output.messages` | JSON-stringified array of response messages (text + tool calls), same shape as inputs |

**Thinking / reasoning messages:** Models with extended thinking (Anthropic `thinking` blocks, Gemini `thought`, DeepSeek `reasoning_content`) produce internal reasoning that isn't part of the user-visible reply. Represent it as a `reasoning` part inside the assistant message — `{"type": "reasoning", "content": "..."}` — alongside the user-facing `text` part. Sentry surfaces reasoning parts separately and filters them out of the user-facing Conversations view, so do **not** fold thinking into a `text` part. When previous thinking is fed back into a multi-turn request, include the same `reasoning` parts in the assistant messages within `gen_ai.input.messages`. Record reasoning token counts via `gen_ai.usage.output_tokens.reasoning` (a subset of `gen_ai.usage.output_tokens`).
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


### Token Usage and Cost Calculation

Sentry uses token attributes to [calculate model costs](https://docs.sentry.io/ai/monitoring/agents/costs/). **Cached and reasoning tokens are subsets, not separate counts** — `gen_ai.usage.input_tokens` already includes `gen_ai.usage.input_tokens.cached`, and `gen_ai.usage.output_tokens` already includes `gen_ai.usage.output_tokens.reasoning`.

Sentry subtracts the cached/reasoning counts from the totals to compute the uncached/non-reasoning portion. Reporting a cached or reasoning count greater than its total produces negative costs in the dashboard.

Example — 100 input tokens total, 90 served from cache:

- Correct: `input_tokens = 100`, `input_tokens.cached = 90`
- Wrong: `input_tokens = 10`, `input_tokens.cached = 90` (cached larger than total → negative cost)

The same rule applies to `gen_ai.usage.output_tokens` vs. `gen_ai.usage.output_tokens.reasoning`.

## Verification

After configuring, make an LLM call and check the Sentry Traces dashboard. AI spans appear with `gen_ai.*` operations showing model, token counts, and latency.

## Conversations

Conversations gives a readable, chat-style view of past sessions with your AI agent. It groups spans by `gen_ai.conversation.id` — so whether a user talked across multiple traces or multiple conversations happened inside one trace, you get a timeline of every message, tool call, and response.

When the user asks for AI monitoring setup, proactively mention this requirement if the app has multi-turn chats. Without a conversation ID, the agent-monitoring spans still work, but the Conversations view cannot group the session correctly.

Find it at **Explore > Conversations** in Sentry.

### Prerequisites for Conversations

- Tracing enabled with `tracesSampleRate > 0`
- Gen AI span streaming is on by default — `streamGenAiSpans` defaults to `true` since JS SDK 10.61.0 and `stream_gen_ai_spans` defaults to `True` since Python SDK 2.64.0. This sends AI spans as standalone items, so spans with large inputs/outputs don't hit transaction payload size limits and get dropped. (The options are available since JS 10.53.0 / Python 2.60.0 if you need to set them explicitly on older SDKs.)
- **Input and output capture enabled** — Conversations reconstructs the chat from `gen_ai.input.messages` and `gen_ai.output.messages` attributes. In JS this is on by default (via `dataCollection`); in Python, set `send_default_pii=True`. Without it, conversations appear empty.

### Setting a Conversation ID

Some integrations (OpenAI Agents SDK for Python, OpenAI SDK for Node) infer the conversation ID automatically. For all others, set it manually.

#### JavaScript

```javascript
import * as Sentry from "@sentry/node"; // or @sentry/nextjs, @sentry/nestjs, etc.

// Set at the start of a conversation
Sentry.setConversationId("conv_abc123");

// All subsequent AI calls carry gen_ai.conversation.id: "conv_abc123"
await openai.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "Hello" }],
});
```

#### Python

```python
import sentry_sdk.ai

# Set at the start of a conversation
sentry_sdk.ai.set_conversation_id("conv_abc123")

# All subsequent AI calls carry gen_ai.conversation.id = "conv_abc123"
```

Some integrations infer the conversation ID automatically. For example, the Python OpenAI integration picks it up when you use the `conversation` parameter:

```python
import openai
import sentry_sdk

sentry_sdk.init(...)

conversation = openai.conversations.create()
response = openai.responses.create(
    model="gpt-5.4",
    input=[{"role": "user", "content": "What are the 5 Ds of dodgeball?"}],
    conversation=conversation.id  # automatically sets gen_ai.conversation.id
)
```

### User Attribution

The Conversations view shows a **User** column. To populate it, call `setUser` / `set_user` once per request or session, before any AI calls:

#### JavaScript

```javascript
import * as Sentry from "@sentry/node"; // or @sentry/nextjs, @sentry/nestjs, etc.

Sentry.setUser({ id: "user_123", email: "jane@example.com", username: "jane" });
```

#### Python

```python
import sentry_sdk

sentry_sdk.set_user({"id": "user_123", "email": "jane@example.com", "username": "jane"})
```

Any of `id`, `email`, or `username` is sufficient — Conversations will display whichever fields are present.

### Conversations vs Traces

These are independent concepts:
- A single conversation can span **multiple traces** (e.g., user refreshes the page mid-conversation — new trace, same conversation ID)
- A single trace can contain spans from **different conversations** (e.g., user starts a new chat without refreshing)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI spans not appearing | Verify `tracesSampleRate > 0`, check SDK version |
| Token counts missing | Some providers don't return tokens for streaming |
| Negative or wrong costs in dashboard | Cached/reasoning tokens are subsets of totals — see Token Usage and Cost Calculation |
| Prompts not captured | In JS, genAI capture is on by default — ensure you haven't set `dataCollection: { genAI: { inputs: false } }`, or pass `recordInputs: true` explicitly. In Python, set `send_default_pii=True`; use `include_prompts` only for explicit overrides |
| Vercel AI not working | Add `experimental_telemetry` to each call |
| Conversations view empty | Ensure Gen AI span streaming is enabled (default since JS SDK 10.61.0 / Python SDK 2.64.0), genAI input/output capture enabled (on by default in JS via `dataCollection`; `send_default_pii=True` in Python), and a conversation ID is set |
| User column shows "Unknown" | Call `Sentry.setUser()` (JS) or `sentry_sdk.set_user()` (Python) once per request or session |
