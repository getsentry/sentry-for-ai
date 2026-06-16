import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { detectOnPath, runInstallCommand } from "./shell";

export function createCodex(system: SystemDeps): Harness {
  return {
    id: "codex",
    name: "Codex",

    detect: async () => detectOnPath(system, "codex"),

    isInstalled: async () => {
      const result = await system.run("codex plugin list");
      return result.ok && (result.stdout?.toLowerCase().includes("sentry") ?? false);
    },

    canInstall: async () => ({ ok: true }),

    install: async () => {
      const command = "codex plugin add sentry@openai-curated";
      await runInstallCommand(system, command);
      return { kind: "done", command };
    },
  };
}

export const codex = createCodex(realSystem);
