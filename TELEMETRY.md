# Telemetry

## Goal

Use this when investigating Sentry for AI plugin usage or installer failures.

The primary usage signal is MCP server traffic attributed with `app.utm_source:plugin`.
When plugin-distributed MCP configs connect to `https://mcp.sentry.dev/mcp?utm_source=plugin`,
the MCP server records this on spans as `app.utm_source:plugin`. Query the `sentry/mcp-server`
project to measure plugin-driven adoption, tool usage, and error rates.

The installer package (`npx @sentry/ai`) reports to a separate Sentry project
(`sentry/sentry-for-ai-installer`). That surface is diagnostic only — it captures crashes
and uncaught errors, not install counts or per-agent outcomes.

**Attribution gap:** Claude's plugin (`plugin-claude`) declares the MCP server inline in its
`plugin.json` without the `utm_source` query parameter, so Claude-originated MCP traffic does
not appear under `app.utm_source:plugin`. Cursor, Codex, and Grok all include
`?utm_source=plugin` in their distributed MCP configs and are fully attributed.

## Where To Query

| Starting Point | Query Surface | Pivot | Answers | Next Step |
| --- | --- | --- | --- | --- |
| Plugin usage or adoption question | `sentry/mcp-server`, spans | `app.utm_source:plugin` | Volume, tool usage, client families for plugin-attributed traffic | Break down by `app.client.family`, `gen_ai.tool.name`, `mcp.tool.name` |
| Tool failure or slow Sentry operation | `sentry/mcp-server`, spans and issues | `app.utm_source:plugin`, `gen_ai.tool.name`, `trace_id` | Which plugin-attributed tool call failed or was slow | Open trace; inspect child spans |
| HTTP status or error rate | `sentry/mcp-server`, spans | `app.utm_source:plugin`, `http.response.status_code` | 4xx/5xx mix for plugin traffic vs overall | Compare with baseline MCP metrics |
| Client or harness identification | `sentry/mcp-server`, spans | `app.client.family`, `user_agent.original` | Approximate Cursor/Codex/Grok bucket split | Note: Claude is not attributed |
| Installer crash or error | `sentry/sentry-for-ai-installer`, issues | `event_id`, `trace_id`, exception | CLI crashes and uncaught installer errors | Inspect issue event and trace |

## Investigation Pivots

### MCP Server (`sentry/mcp-server`)

| Pivot | Meaning | Found In | First Query |
| --- | --- | --- | --- |
| `app.utm_source` | sanitized `utm_source` query param; `plugin` for plugin-attributed traffic | spans | filter `app.utm_source:plugin` |
| `app.client.family` | bucketed MCP client family | spans, metrics | client-family breakdown |
| `user_agent.original` | raw HTTP user agent | request data, spans | client identification |
| `trace_id` | one request or tool call trace | errors, logs, spans | open trace |
| `span_id` | one span in a trace | logs, spans | inspect span |
| `event_id` | captured Sentry error | Sentry issue or event | open event |
| `user.id` | authenticated Sentry user ID | events, logs | user request history |
| `http.route` | normalized route template | metrics, logs, spans | route health |
| `http.response.status_code` | final HTTP response code | metrics, logs, spans | response distribution |
| `gen_ai.tool.name` | MCP tool name on the span | spans | tool failures |
| `mcp.tool.name` | canonical MCP tool name | spans | renamed tool pivot |
| `mcp.session.id` | MCP session identity | spans | session timeline |
| `app.transport` | MCP transport (`http`, `sse`, `stdio`) | spans | transport-specific behavior |
| `app.server.version` | MCP server package version | spans | version-specific behavior |

### Installer (`sentry/sentry-for-ai-installer`)

| Pivot | Meaning | Found In | First Query |
| --- | --- | --- | --- |
| `event_id` | captured error | Sentry issue or event | open event |
| `trace_id` | installer CLI trace | spans | open trace |
| `transaction` | active transaction/route | events | identify install phase |
| `release` | package release tag | events | version-specific errors |
| `error.type` | exception class | issues, events | error classification |
| `exception.message` | exception message | issues, events | error detail |

## Query Recipes

Recent plugin-attributed MCP traffic.

```text
dataset=spans query='app.utm_source:plugin'
fields=timestamp,trace,span_id,span.op,span.description,span.duration,http.route,http.response.status_code,app.client.family,user_agent.original,gen_ai.tool.name,mcp.tool.name,error.type
sort=-timestamp
```

Plugin-attributed traffic by client family.

```text
dataset=spans query='app.utm_source:plugin'
fields=timestamp,app.client.family,user_agent.original,http.route,http.response.status_code,span.duration,error.type
aggregate=count() by app.client.family,http.response.status_code
```

Plugin-attributed MCP tool usage.

```text
dataset=spans query='app.utm_source:plugin (has:gen_ai.tool.name OR has:mcp.tool.name)'
fields=timestamp,trace,span_id,gen_ai.tool.name,mcp.tool.name,span.duration,app.client.family,user.id,error.type
sort=-timestamp
```

Aggregate tool call counts by name and client family.

```text
dataset=spans query='app.utm_source:plugin (has:gen_ai.tool.name OR has:mcp.tool.name)'
fields=gen_ai.tool.name,mcp.tool.name,app.client.family
aggregate=count() by mcp.tool.name,gen_ai.tool.name,app.client.family
```

Failed plugin-attributed tool calls.

```text
dataset=spans query='app.utm_source:plugin (has:gen_ai.tool.name OR has:mcp.tool.name) has:error.type'
fields=timestamp,trace,span_id,gen_ai.tool.name,mcp.tool.name,span.duration,app.client.family,user.id,error.type
sort=-timestamp
```

Slow plugin-attributed tool calls.

```text
dataset=spans query='app.utm_source:plugin (has:gen_ai.tool.name OR has:mcp.tool.name)'
fields=timestamp,trace,span_id,span.duration,gen_ai.tool.name,mcp.tool.name,app.client.family,user.id,error.type
sort=-span.duration
```

Plugin-attributed HTTP status distribution.

```text
dataset=spans query='app.utm_source:plugin has:http.response.status_code'
fields=timestamp,http.route,http.response.status_code,app.client.family,span.duration,error.type
aggregate=count() by http.route,http.response.status_code,app.client.family
```

Compare plugin-attributed traffic against all MCP traffic.

Plugin-attributed:

```text
dataset=spans query='app.utm_source:plugin'
fields=timestamp,span.duration,http.route,http.response.status_code,app.client.family,error.type
aggregate=count() by http.response.status_code,app.client.family
```

All MCP traffic with `utm_source` breakdown:

```text
dataset=spans query='http.route:"/mcp/:organizationSlug?/:projectSlug?"'
fields=timestamp,span.duration,http.route,http.response.status_code,app.client.family,app.utm_source,error.type
aggregate=count() by app.utm_source,http.response.status_code,app.client.family
```

Full trace timeline for a plugin-attributed request.

```text
dataset=spans query='trace_id:"<trace_id>"'
fields=timestamp,trace,span_id,span.op,span.description,span.duration,app.utm_source,app.client.family,gen_ai.tool.name,mcp.tool.name,error.type
sort=timestamp
```

Log history for a trace.

```text
dataset=logs query='trace_id:"<trace_id>"'
fields=timestamp,level,message,trace_id,span_id,http.route,http.response.status_code,app.client.family,error.type,exception.message
sort=timestamp
```

Unresolved installer crashes (`sentry/sentry-for-ai-installer`).

```text
dataset=issues query='is:unresolved'
fields=timestamp,event_id,trace_id,error.type,exception.message,transaction,release,environment
sort=-timestamp
```

Installer trace for a specific error.

```text
dataset=spans query='trace_id:"<trace_id>"'
fields=timestamp,trace,span_id,span.op,span.description,span.duration,error.type
sort=timestamp
```

## Domains

### MCP Plugin Attribution

Plugin users are driving MCP traffic through Cursor, Codex, or Grok's distributed
MCP config, which sets `utm_source=plugin` on every request. The MCP server captures
this as `app.utm_source:plugin` on spans.

Use for: adoption volume, tool popularity, client family distribution, error rates,
and latency for plugin-originated traffic vs the broader MCP baseline.

Attributes: `app.utm_source`, `app.client.family`, `user_agent.original`,
`http.route`, `http.response.status_code`, `trace_id`, `span_id`

**Attribution note:** Only Cursor, Codex, and Grok plugin installs carry
`?utm_source=plugin`. Claude plugin installs do not; that traffic is not
separable from other MCP clients in this pivot.

### MCP Tool Execution

When a plugin user runs a workflow skill (like `sentry-fix-issues`), the agent
calls Sentry MCP tools. These appear on the MCP server as tool spans.

Use for: which tools plugin users invoke, failed tool calls, slow Sentry API
operations, tool result counts.

Spans: tool call spans and downstream Sentry API spans

Attributes: `gen_ai.tool.name`, `mcp.tool.name`, `mcp.session.id`, `user.id`,
`error.type`, `span.duration`, `app.utm_source`

### Installer CLI

The `npx @sentry/ai install` CLI reports to `sentry/sentry-for-ai-installer`.
Currently only default `@sentry/node` auto-instrumentation is active.

Use for: diagnosing installer crashes and unhandled errors.

**Not available:** per-harness detection, install results, agent selection,
install success counts. Add custom spans/events to `packages/installer/src/`
if those signals are needed.

Attributes (standard SDK only): `event_id`, `trace_id`, `transaction`,
`release`, `environment`, `error.type`, `exception.message`

### Static Plugin Content

Skills (`skills/`) and plugin manifests are static
content — they are not directly instrumented. Their usage is only observable
indirectly when they trigger Sentry MCP tool calls (captured under MCP Tool
Execution above) or when the installer fails while deploying them.

## Configuration

MCP URL expected in distributed plugin configs for attribution:

```
https://mcp.sentry.dev/mcp?utm_source=plugin
```

The MCP server sanitizes the `utm_source` query param and stores it as:

```
app.utm_source=plugin
```

Installer Sentry SDK init (`packages/installer/src/instrument.ts`):

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "https://229b213cf5670aeb117d4de56ba6814e@o1.ingest.us.sentry.io/4511570959335425",
  tracesSampleRate: 1.0,
});
```

| Setting | Controls | Default |
| --- | --- | --- |
| `SENTRY_DSN` | installer Sentry project override | `sentry/sentry-for-ai-installer` (hardcoded DSN) |

## Attribute Notes

- `app.utm_source` comes from the MCP server sanitizing the `utm_source` query parameter
  on the MCP endpoint URL. It is not set by sentry-for-ai directly.
- `app.utm_source:plugin` measures MCP usage from plugin-attributed configs, not
  install counts. A user who installs the plugin but never runs an MCP tool call will
  not appear here.
- Users can manually copy the plugin MCP URL (including `?utm_source=plugin`) into their
  config, so attribution means "used plugin-attributed URL," not guaranteed installer
  provenance.
- Skill file reads and command invocations are not counted. Only downstream MCP tool
  calls made by the AI agent are observable.
- `app.client.family` is inferred by the MCP server from the User-Agent header; it is
  not set by sentry-for-ai.
- `gen_ai.tool.name` and `mcp.tool.name` both identify the MCP tool. Use `mcp.tool.name`
  when pivoting on renamed tools.
- Keep metric attributes low-cardinality. Avoid raw URLs, tokens, prompts, or full
  request bodies in filters or group-bys.

## References

- `packages/installer/src/instrument.ts`
- `mcp.json` (Cursor MCP config with `utm_source=plugin`)
- `plugin-src/claude/plugin.json` (Claude inline config — no `utm_source`)
- `getsentry/sentry-mcp` `TELEMETRY.md` — full MCP server telemetry reference
- [MCP server spans reference](https://github.com/getsentry/sentry-mcp/blob/main/TELEMETRY.md)
