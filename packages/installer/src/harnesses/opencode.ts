import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { createOpenCodeHarness } from "./opencode-common";

export function createOpenCode(system: SystemDeps): Harness {
  return createOpenCodeHarness(system, {
    id: "opencode",
    name: "OpenCode V1",
    binary: "opencode",
    repository: "https://github.com/getsentry/plugin-opencode.git",
    mcpCommand: "opencode mcp add sentry --url",
    mcpConfigPath: "mcp.sentry",
    marker: ".sentry-opencode-v1",
    incompatibleMarker: ".sentry-opencode-v2",
    supersededBy: "opencode2",
  });
}

export const opencode = createOpenCode(realSystem);
