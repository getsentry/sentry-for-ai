import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { detectOnPath, outputIncludes, runInstallCommand } from "./shell";

const MARKETPLACE = "claude-plugins-official";
const MARKETPLACE_SOURCE = "anthropics/claude-plugins-official";
const INSTALL_COMMAND = `claude plugin install sentry@${MARKETPLACE}`;
const UPDATE_COMMAND = `claude plugin update sentry@${MARKETPLACE}`;

export function createClaude(system: SystemDeps): Harness {
  return {
    id: "claude",
    name: "Claude Code",

    detect: async () => detectOnPath(system, "claude"),

    isInstalled: async () => outputIncludes(system, "claude plugin list", "sentry"),

    canInstall: async () => ({ ok: true }),

    install: async () => {
      // A fresh CLI has no marketplaces registered, so register the official one
      // if it is missing; otherwise refresh its index so the plugin resolves.
      const registered = await outputIncludes(
        system,
        "claude plugin marketplace list",
        MARKETPLACE,
      );
      await runInstallCommand(
        system,
        registered
          ? `claude plugin marketplace update ${MARKETPLACE}`
          : `claude plugin marketplace add ${MARKETPLACE_SOURCE}`,
      );

      const command = (await outputIncludes(system, "claude plugin list", "sentry"))
        ? UPDATE_COMMAND
        : INSTALL_COMMAND;

      await runInstallCommand(system, command);
      return { kind: "done", command };
    },
  };
}

export const claude = createClaude(realSystem);
