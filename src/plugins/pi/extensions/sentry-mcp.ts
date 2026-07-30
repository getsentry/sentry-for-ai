import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createMcpAdapter } from "pi-mcp-adapter";

const SENTRY_MCP_URL = "https://mcp.sentry.dev/mcp?utm_source=plugin";
const ADAPTER_PROXY_TOOL_NAME = "mcp";
const SENTRY_PROXY_TOOL_NAME = "sentry_mcp";
const EXTERNAL_MCP_TOOL_SENTINEL = "__sentry_adapter_external_mcp";
const SENTRY_MCP_PROMPT_GUIDELINE =
  "Use sentry_mcp for Sentry operations. Call search_sentry_tools and execute_sentry_tool through sentry_mcp instead of looking for those tools directly.";

/**
 * Give this package's adapter-private surfaces Sentry-specific names so it can
 * coexist with a user's separately installed pi-mcp-adapter. Sentry's actual
 * MCP tools keep their upstream names (for example, search_sentry_tools).
 */
function namespaceSentryMcpAdapter(pi: ExtensionAPI): ExtensionAPI {
  return new Proxy(pi as ExtensionAPI & { unregisterTool?: (name: string) => boolean }, {
    get(target, property, receiver) {
      if (property === "registerTool") {
        return (tool: {
          name: string;
          label?: string;
          description?: string;
          promptSnippet?: string;
          promptGuidelines?: string[];
        }) => {
          if (tool.name === ADAPTER_PROXY_TOOL_NAME) {
            const namespacedDescription = tool.description
              ?.replaceAll("mcp({", "sentry_mcp({")
              .replaceAll("/mcp-auth", "/sentry-mcp-auth")
              .replaceAll("/mcp ", "/sentry-mcp ");
            return target.registerTool({
              ...tool,
              name: SENTRY_PROXY_TOOL_NAME,
              label: "Sentry MCP",
              description: namespacedDescription,
              promptSnippet: "Connect to Sentry and call Sentry MCP tools",
              promptGuidelines: [SENTRY_MCP_PROMPT_GUIDELINE],
            } as Parameters<ExtensionAPI["registerTool"]>[0]);
          }

          return target.registerTool(tool as Parameters<ExtensionAPI["registerTool"]>[0]);
        };
      }

      if (property === "registerCommand") {
        return (name: string, options: unknown) => {
          const namespacedName =
            name === "mcp"
              ? "sentry-mcp"
              : name === "mcp-auth"
                ? "sentry-mcp-auth"
                : name.startsWith("mcp__")
                  ? `sentry_${name}`
                  : name;
          return target.registerCommand(
            namespacedName,
            options as Parameters<ExtensionAPI["registerCommand"]>[1],
          );
        };
      }

      if (property === "registerFlag") {
        return (name: string, options: unknown) =>
          target.registerFlag(
            name === "mcp-config" ? "sentry-mcp-config" : name,
            options as Parameters<ExtensionAPI["registerFlag"]>[1],
          );
      }

      if (property === "getAllTools") {
        return () =>
          target
            .getAllTools()
            .filter((tool) => tool.name !== ADAPTER_PROXY_TOOL_NAME)
            .map((tool) =>
              tool.name === SENTRY_PROXY_TOOL_NAME
                ? { ...tool, name: ADAPTER_PROXY_TOOL_NAME }
                : tool,
            );
      }

      if (property === "getActiveTools") {
        return () =>
          target.getActiveTools().map((name) => {
            if (name === ADAPTER_PROXY_TOOL_NAME) return EXTERNAL_MCP_TOOL_SENTINEL;
            if (name === SENTRY_PROXY_TOOL_NAME) return ADAPTER_PROXY_TOOL_NAME;
            return name;
          });
      }

      if (property === "setActiveTools") {
        return (names: string[]) =>
          target.setActiveTools(
            names.map((name) => {
              if (name === EXTERNAL_MCP_TOOL_SENTINEL) return ADAPTER_PROXY_TOOL_NAME;
              if (name === ADAPTER_PROXY_TOOL_NAME) return SENTRY_PROXY_TOOL_NAME;
              return name;
            }),
          );
      }

      if (property === "unregisterTool") {
        return (name: string) =>
          target.unregisterTool?.(
            name === ADAPTER_PROXY_TOOL_NAME ? SENTRY_PROXY_TOOL_NAME : name,
          ) ?? false;
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as ExtensionAPI;
}

const installSentryMcp = createMcpAdapter({
  config: {
    mcpServers: {
      sentry: {
        url: SENTRY_MCP_URL,
        auth: "oauth",
        directTools: false,
      },
    },
    settings: {
      autoAuth: true,
      disableProxyTool: false,
      showStatusIcon: false,
      toolPrefix: "none",
      authRequiredMessage:
        'Sentry authentication required. Run /sentry-mcp-auth sentry, then retry the tool call.',
    },
  },
});

export default function sentryMcpExtension(pi: ExtensionAPI) {
  installSentryMcp(namespaceSentryMcpAdapter(pi));
}
