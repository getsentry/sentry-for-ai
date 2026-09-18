# AI Monitoring — Sentry Python SDK

Use this file as a docs router.
The Sentry docs are the source of truth for package versions, integration APIs, options,
examples, and troubleshooting.
Do not copy setup snippets from this reference into the user’s app; open the matching
docs page and follow it.

## Follow the docs

| Project state | Follow |
| --- | --- |
| Python app | [Python Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/) |
| OpenAI | [OpenAI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/openai/) |
| OpenAI Agents SDK | [OpenAI Agents SDK Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/openai-agents/) |
| Anthropic | [Anthropic Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/anthropic/) |
| Google Gen AI SDK | [Google Gen AI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/google-genai/) |
| LangChain | [LangChain Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/langchain/) |
| LangGraph | [LangGraph Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/langgraph/) |
| LiteLLM | [LiteLLM Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/litellm/) |
| Pydantic AI | [Pydantic AI Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/pydantic-ai/) |
| Hugging Face Hub | [Hugging Face Hub Agent Tracing](https://docs.sentry.io/platforms/python/agent-tracing/huggingface_hub/) |
| Custom or unsupported library | [Python manual instrumentation](https://docs.sentry.io/platforms/python/agent-tracing/manual-instrumentation/) and [Sentry GenAI conventions](https://github.com/getsentry/sentry-conventions/) |

## Local guardrails

- Preserve the existing `sentry_sdk.init()` call and modify it in place.
- Choose one AI span producer per runtime or process.
- Keep prompt, response, tool argument, and tool result capture enabled by default for
  AI monitoring; if the user raises a privacy, security, or compliance concern, follow
  the docs to disable or scope capture.
- Verify by exercising the real request, task, job, or command that performs the AI
  call.
