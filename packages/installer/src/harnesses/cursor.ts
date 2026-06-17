import { join } from "node:path";
import { realSystem, type OutputSink, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runInstallCommand } from "./shell";

const PLUGIN_REPO = "https://github.com/getsentry/plugin-cursor.git";

function pluginDir(system: SystemDeps): string {
  return join(system.homedir, ".cursor", "plugins", "local", "sentry");
}

// Where the Cursor app installs by default, for platforms where the `cursor`
// CLI shim is not reliably on PATH. Linux has no single canonical location, so
// it relies on the CLI being on PATH.
function appLocations(system: SystemDeps): string[] {
  if (system.platform === "darwin") {
    return ["/Applications/Cursor.app"];
  }

  if (system.platform === "win32") {
    return [join(system.homedir, "AppData", "Local", "Programs", "cursor", "Cursor.exe")];
  }

  return [];
}

export function createCursor(system: SystemDeps): Harness {
  return {
    id: "cursor",
    name: "Cursor",

    detect: async () => {
      if (await detectOnPath(system, "cursor")) {
        return true;
      }

      return appLocations(system).some((path) => system.exists(path));
    },

    isInstalled: async () => system.exists(pluginDir(system)),

    canInstall: async () =>
      (await detectOnPath(system, "git"))
        ? { ok: true }
        : { ok: false, reason: "git is required to clone the Cursor plugin" },

    install: async (output): Promise<InstallOutcome> => {
      // Quote the target: Windows home paths routinely contain spaces.
      const command = `git clone ${PLUGIN_REPO} "${pluginDir(system)}"`;
      await runInstallCommand(system, command, output);
      return { kind: "done", command };
    },

    update: async (output): Promise<InstallOutcome> => {
      const command = `git -C "${pluginDir(system)}" pull`;
      await runInstallCommand(system, command, output);
      return { kind: "done", command };
    },
  };
}

export const cursor = createCursor(realSystem);
