import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { createOpenCodeHarness } from "./opencode-common";

export function createOpenCode2(system: SystemDeps): Harness {
  return createOpenCodeHarness(system, {
    id: "opencode2",
    name: "OpenCode V2 (Beta)",
    binary: "opencode2",
    repository: "https://github.com/getsentry/plugin-opencode2.git",
    mcpCommand: "opencode2 mcp add sentry --global --url",
    mcpConfigPath: ["mcp", "servers", "sentry"],
    incompatibleMcpConfigPath: ["mcp", "sentry"],
    marker: ".sentry-opencode-v2",
    incompatibleMarker: ".sentry-opencode-v1",
  });
}

export const opencode2 = createOpenCode2(realSystem);
