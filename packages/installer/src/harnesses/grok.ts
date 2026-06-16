import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { detectOnPath, runInstallCommand } from "./shell";

const INSTALL_COMMAND = "grok plugin install getsentry/plugin-grok --trust";
const UPDATE_COMMAND = "grok plugin update sentry";

async function sentryInPluginList(system: SystemDeps): Promise<boolean> {
  const result = await system.run("grok plugin list");
  return result.ok && (result.stdout?.toLowerCase().includes("sentry") ?? false);
}

export function createGrok(system: SystemDeps): Harness {
  return {
    id: "grok",
    name: "Grok",

    detect: async () => detectOnPath(system, "grok"),

    isInstalled: async () => sentryInPluginList(system),

    canInstall: async () => ({ ok: true }),

    install: async () => {
      // `grok plugin install` errors on an already-installed repo, so update
      // in place when the plugin is already present.
      const command = (await sentryInPluginList(system)) ? UPDATE_COMMAND : INSTALL_COMMAND;

      await runInstallCommand(system, command);
      return { kind: "done", command };
    },
  };
}

export const grok = createGrok(realSystem);
