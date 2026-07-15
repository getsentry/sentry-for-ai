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
- Sample AI traces at **100%**: an agent run is sampled as one span tree, so a
  dropped root loses every child `gen_ai` span. Keep `gen_ai` traffic at 1.0 via
  a `tracesSampler` while sampling the rest lower — see [reduce-volume.md](reduce-volume.md).
- Set a `gen_ai.conversation.id` wherever multi-turn chats need grouping.

## Related

- [`tracing.md`](tracing.md) — AI monitoring is tracing; spans are the substrate.
- [`data-scrubbing.md`](data-scrubbing.md) — prompt/output capture is the PII decision.
- [`reduce-volume.md`](reduce-volume.md) — the `tracesSampler` that keeps AI at 100%.
