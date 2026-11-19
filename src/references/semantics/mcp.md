# MCP attributes

Model Context Protocol attributes for MCP client/server spans.

| Key | Type | Brief |
| --- | --- | --- |
| `mcp.cancelled.reason` | `string` | Reason for the cancellation of an MCP operation. |
| `mcp.cancelled.request_id` | `string` | Request ID of the cancelled MCP operation. |
| `mcp.client.name` | `string` | Name of the MCP client application. |
| `mcp.client.title` | `string` | Display title of the MCP client application. |
| `mcp.client.version` | `string` | Version of the MCP client application. |
| `mcp.lifecycle.phase` | `string` | Lifecycle phase indicator for MCP operations. |
| `mcp.logging.data_type` | `string` | Data type of the logged message content. |
| `mcp.logging.level` | `string` | Log level for MCP logging operations. |
| `mcp.logging.logger` | `string` | Logger name for MCP logging operations. |
| `mcp.logging.message` | `string` | Log message content from MCP logging operations. |
| `mcp.method.name` | `string` | The name of the MCP request or notification method being called. |
| `mcp.progress.current` | `integer` | Current progress value of an MCP operation. |
| `mcp.progress.message` | `string` | Progress message describing the current state of an MCP operation. |
| `mcp.progress.percentage` | `double` | Calculated progress percentage of an MCP operation. Computed from current/total * 100. |
| `mcp.progress.token` | `string` | Token for tracking progress of an MCP operation. |
| `mcp.progress.total` | `integer` | Total progress target value of an MCP operation. |
| `mcp.prompt.result.description` | `string` | Description of the prompt result. |
| `mcp.prompt.result.message_content` | `string` | Content of the message in the prompt result. Used for single message results only. |
| `mcp.prompt.result.message_count` | `integer` | Number of messages in the prompt result. |
| `mcp.prompt.result.message_role` | `string` | Role of the message in the prompt result. Used for single message results only. |
| `mcp.protocol.ready` | `integer` | Protocol readiness indicator for MCP session. Non-zero value indicates the protocol is ready. |
| `mcp.protocol.version` | `string` | MCP protocol version used in the session. |
| `mcp.request.argument.<key>` | `string` | MCP request argument with dynamic key suffix. The <key> is replaced with the actual argument name. The value is a JSON-stringified representation of the argument value. |
| `mcp.request.argument.name` | `string` | Name argument from prompts/get MCP request. |
| `mcp.request.argument.uri` | `string` | URI argument from resources/read MCP request. |
| `mcp.resource.uri` | `string` | The resource URI being accessed in an MCP operation. |
| `mcp.server.name` | `string` | Name of the MCP server application. |
| `mcp.server.title` | `string` | Display title of the MCP server application. |
| `mcp.server.version` | `string` | Version of the MCP server application. |
| `mcp.session.id` | `string` | Identifier for the MCP session. |
| `mcp.tool.result.content_count` | `integer` | Number of content items in the tool result. |
