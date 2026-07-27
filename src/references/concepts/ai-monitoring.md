# AI / Agent Monitoring — What & Why

## What it is

Tracing specialized for LLM apps. LLM calls, agent runs, tool calls, and
agent-to-agent handoffs are captured as `gen_ai.*` spans carrying model, token
usage, cost, and latency. It is built on [tracing](tracing.md), so tracing must
be on (`tracesSampleRate`/`traces_sample_rate` > 0) — without spans there is
nothing to attach `gen_ai` data to.

Auto-instrumented for detected AI SDKs on **JavaScript, Python, and Laravel** (OpenAI,
Anthropic, Vercel AI, LangChain/LangGraph, Google GenAI, HuggingFace, Pydantic
AI, and Laravel AI; `litellm` needs explicit registration). Every other platform is manual
`gen_ai.*` instrumentation, or unsupported — the platform `index.md` says which.

## What the artifact shows

A trace *is* the agent run: a `gen_ai.invoke_agent` span parents the
`gen_ai.chat` (LLM call), `gen_ai.execute_tool`, and `gen_ai.handoff` children
it triggered. Read cost and latency off the child spans' token attributes. Two
views surface it: the **AI Agents** dashboard and **Explore > Conversations**.

The span `op` is `gen_ai.{operation}` — `chat`, `embeddings`,
`generate_content`, `text_completion` for calls, plus `invoke_agent`,
`execute_tool`, `handoff`. Attributes accept primitives only; arrays/objects are
JSON-stringified. The canonical attribute set is the [Sentry gen_ai
conventions](https://getsentry.github.io/sentry-conventions/attributes/gen_ai/) —
the SDK docs can lag, and attributes marked deprecated there should not be set.

## Conversations

Conversations groups spans by `gen_ai.conversation.id` into a chat-style
timeline. A conversation can span multiple traces (a page refresh mid-chat), and
one trace can hold spans from multiple conversations — the two are independent.

**Conversation ID format matters:** use a short, opaque identifier — alphanumeric
with dashes or underscores only (a UUID, or a prefixed id like `conv_5j66Up…`).
Never use a URL, email, or other free-form text: Sentry uses the id as a URL path
segment, so a value containing a slash breaks Conversations for that session.
Some integrations infer the id automatically (Python OpenAI Agents, Node OpenAI,
Laravel AI agents using `Conversational` + `RemembersConversations`); everything
else sets it explicitly. The view also needs input/output capture and gen_ai span
streaming (both on by default on recent JS/Python SDKs; Laravel AI spans are
emitted directly) or it renders empty, and a `setUser`/`set_user` call to populate
the User column where supported.

## Token accounting (avoid negative costs)

Sentry computes cost from token attributes, and cached/reasoning counts are
**subsets** of the totals, not separate buckets: `gen_ai.usage.input_tokens`
already includes `.input_tokens.cached`, and `gen_ai.usage.output_tokens`
already includes `.output_tokens.reasoning`. Reporting a subset larger than its
total makes Sentry subtract past zero and show a negative cost.

## PII

Prompts and model outputs are user content and are **likely PII**. JavaScript
captures input/output by default (governed by `dataCollection.genAI`); Python
gates it behind `send_default_pii=True`; Laravel gates it behind
`SENTRY_SEND_DEFAULT_PII=true`. Confirm the privacy policy and regulations allow
it and **ask the user before enabling capture** — see
[data-scrubbing.md](data-scrubbing.md).

## Setup essentials

- Tracing must be on; then detect the AI SDK and let auto-instrumentation handle
  it (JS/Python/Laravel AI), or instrument `gen_ai.*` spans manually.
- Sample AI traces at **100%** — see Sampling below.
- Set a `gen_ai.conversation.id` wherever multi-turn chats need grouping.

## Sampling — keep the agent run whole

An agent run is sampled as one span tree: the sampler runs on the **root span
only** and children inherit unconditionally, so a dropped root loses every child
`gen_ai` span. At any rate below 1.0 you lose whole agent executions, not a
representative slice of them.

**Check the current rate, and ask before raising it.** Grep the app's Sentry
config for what's already set:

```bash
# JavaScript
grep -E 'tracesSampleRate|tracesSampler' sentry.*.config.* instrument.* src/instrument.* app/instrument.* 2>/dev/null
# Python
grep -rE 'traces_sample_rate|traces_sampler' --include='*.py' . 2>/dev/null
# PHP / Laravel
grep -E 'SENTRY_TRACES_SAMPLE_RATE|traces_sample_rate|traces_sampler' .env config/sentry.php 2>/dev/null
```

If the rate is below 1.0 and no sampler is configured, tell the user their
current rate, that a dropped root span loses every child `gen_ai` span, and that
the sampler below keeps AI traces at 1.0 while leaving other traffic where it is
— then wait for their answer. Raising trace volume is their cost decision, the
same as the PII gate above.

Two shapes, and a sampler has to handle both:

- **The `gen_ai` span is the root** (cron, queue consumer, CLI) — the sampler
  sees `gen_ai.*` directly and can match on it.
- **The `gen_ai` spans are children of an HTTP transaction** (most web apps) —
  `POST /api/chat` is sampled before any AI code runs, so the AI route itself is
  what needs to be kept at 1.0.

```javascript
Sentry.init({
  tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
    // Standalone gen_ai root spans
    if (attributes?.['sentry.op']?.startsWith('gen_ai.') || attributes?.['gen_ai.system']) {
      return 1.0;
    }
    // HTTP routes that trigger AI calls
    if (name?.includes('/api/chat') || name?.includes('/api/agent')) {
      return 1.0;
    }
    return inheritOrSampleWith(0.2); // the app's baseline rate
  },
});
```

```python
def traces_sampler(sampling_context):
    tx = sampling_context.get("transaction_context", {})
    op, name = tx.get("op", ""), tx.get("name", "")

    if op.startswith("gen_ai."):
        return 1.0
    if op == "http.server" and any(p in name for p in ["/api/chat", "/api/agent"]):
        return 1.0

    parent = sampling_context.get("parent_sampled")
    if parent is not None:
        return float(parent)
    return 0.2  # the app's baseline rate
```

When AI *is* the product, skip the sampler and set the rate to 1.0 outright.
When 100% tracing isn't affordable, emit a metric and a log per LLM call instead
— both are independent of trace sampling, so cost and usage stay complete even
where spans are dropped (see [metrics.md](metrics.md) and [logging.md](logging.md)).

Symptom to recognize: `gen_ai` spans missing even though the sampler returns 1.0
for them means the parent HTTP transaction was sampled lower — the route needs
the rule, not the span.

## Related

- [`tracing.md`](tracing.md) — AI monitoring is tracing; spans are the substrate.
- [`data-scrubbing.md`](data-scrubbing.md) — prompt/output capture is the PII decision.
- [`reduce-volume.md`](reduce-volume.md) — sampling the rest of the traffic down.
