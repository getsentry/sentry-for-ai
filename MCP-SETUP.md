# Sentry MCP Server Setup

The Sentry plugin works best with the Sentry MCP server. Since remote MCP servers must be configured via CLI (not through plugin.json), follow these steps:

## Add the Sentry MCP Server

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

## Verify Installation

```bash
/mcp
```

You should see `sentry` in the list of configured MCP servers.

## Authentication (if required)

If the Sentry MCP server requires authentication, add headers:

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

## Restart Claude Code

After adding the MCP server, restart Claude Code to activate it.

## Using with the Plugin

Once the MCP server is configured:
- `/getIssues` will use the Sentry MCP tools to fetch issues
- The `issue-summarizer` agent will use Sentry MCP tools for analysis
- All Sentry API calls will go through the MCP server

## Troubleshooting

If commands can't find Sentry tools:
1. Verify MCP server is added: `/mcp`
2. Check server status in the MCP list
3. Restart Claude Code
4. Try running a test command: `/getIssues`
