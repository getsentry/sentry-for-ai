import { join } from "node:path";
import { realSystem, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runInstallCommand } from "./shell";

const PLUGIN_REPO = "https://github.com/getsentry/plugin-cursor.git";
const RESTART_NOTE = 'Restart Cursor or run "Developer: Reload Window" to activate the plugin.';

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

    install: async (): Promise<InstallOutcome> => {
      // Quote the target: Windows home paths routinely contain spaces.
      const command = `git clone ${PLUGIN_REPO} "${pluginDir(system)}"`;
      await runInstallCommand(system, command);
      return { kind: "done", command, note: RESTART_NOTE };
    },

    update: async (): Promise<InstallOutcome> => {
      const command = `git -C "${pluginDir(system)}" pull`;
      await runInstallCommand(system, command);
      return { kind: "done", command, note: RESTART_NOTE };
    },
  };
}

export const cursor = createCursor(realSystem);
