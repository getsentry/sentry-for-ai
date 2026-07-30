import { realSystem, type OutputSink, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runCommand } from "./shell";

const PACKAGE_SOURCE = "git:github.com/getsentry/plugin-pi";
const INSTALL_COMMAND = `pi install ${PACKAGE_SOURCE} --no-approve`;
const UPDATE_COMMAND = `pi update ${PACKAGE_SOURCE} --no-approve`;
const REMOVE_COMMAND = `pi remove ${PACKAGE_SOURCE} --no-approve`;

function listsSentryPiPackage(output: string | undefined): boolean {
  if (!output) {
    return false;
  }

  const normalized = output.toLowerCase();
  return (
    normalized.includes(PACKAGE_SOURCE) ||
    normalized.includes("github.com/getsentry/plugin-pi") ||
    normalized.includes("@sentry/pi-plugin")
  );
}

export function createPi(system: SystemDeps): Harness {
  return {
    id: "pi",
    name: "Pi",

    detect: async () => detectOnPath(system, "pi"),

    isInstalled: async () => {
      const result = await system.run("pi list --no-approve");
      return result.ok && listsSentryPiPackage(result.stdout);
    },

    canInstall: async () => ({ ok: true }),

    install: async (output): Promise<InstallOutcome> => {
      await runCommand(system, INSTALL_COMMAND, output);
      return { kind: "done", command: INSTALL_COMMAND };
    },

    update: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UPDATE_COMMAND, output);
      return { kind: "done", command: UPDATE_COMMAND };
    },

    remove: async (output): Promise<InstallOutcome> => {
      await runCommand(system, REMOVE_COMMAND, output);
      return { kind: "done", command: REMOVE_COMMAND };
    },
  };
}

export const pi = createPi(realSystem);
