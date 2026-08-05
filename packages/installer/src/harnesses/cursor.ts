import { join } from "node:path";
import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { STABLE_BRANCH, type HarnessOptions } from "./channel";
import { detectOnPath, runCommand } from "./shell";

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

// Recursive directory delete, spelled for the platform. Windows has no `rm`.
function removeDirCommand(system: SystemDeps, dir: string): string {
  return system.platform === "win32" ? `rmdir /s /q "${dir}"` : `rm -rf "${dir}"`;
}

// Which branch the existing checkout is on, or null when there is no checkout to
// read. The plugin is a plain clone, so the branch *is* the installed channel.
async function checkedOutBranch(system: SystemDeps): Promise<string | null> {
  const dir = pluginDir(system);

  if (!system.exists(dir)) {
    return null;
  }

  const result = await system.run(`git -C "${dir}" rev-parse --abbrev-ref HEAD`);
  return result.ok ? (result.stdout ?? "").trim() : null;
}

export function createCursor(system: SystemDeps, options: HarnessOptions = {}): Harness {
  const branch = options.ref ?? STABLE_BRANCH;

  return {
    id: "cursor",
    name: "Cursor",

    detect: async () => {
      if (await detectOnPath(system, "cursor")) {
        return true;
      }

      return appLocations(system).some((path) => system.exists(path));
    },

    // A checkout of the other channel is not this channel's install, so the
    // branch has to match — otherwise switching channels would take the update
    // path and just pull the branch it is already on. Under anyChannel the
    // directory existing is enough, so `remove` clears whichever branch is there.
    isInstalled: async () =>
      options.anyChannel
        ? system.exists(pluginDir(system))
        : (await checkedOutBranch(system)) === branch,

    canInstall: async () =>
      (await detectOnPath(system, "git"))
        ? { ok: true }
        : { ok: false, reason: "git is required to clone the Cursor plugin" },

    cleanup: async (output) => {
      // The checkout lives at one fixed path, so switching channels means the
      // existing clone has to go; `install` then re-clones on the right branch.
      // A checkout already on this branch is left alone for `update` to pull.
      const current = await checkedOutBranch(system);

      if (current === null || current === branch) {
        return null;
      }

      await runCommand(system, removeDirCommand(system, pluginDir(system)), output);
      return `Removed the ${current} checkout`;
    },

    install: async (output): Promise<InstallOutcome> => {
      // Quote the target: Windows home paths routinely contain spaces.
      const command = `git clone --branch ${branch} ${PLUGIN_REPO} "${pluginDir(system)}"`;
      await runCommand(system, command, output);
      return { kind: "done", command };
    },

    update: async (output): Promise<InstallOutcome> => {
      const command = `git -C "${pluginDir(system)}" pull`;
      await runCommand(system, command, output);
      return { kind: "done", command };
    },

    remove: async (output): Promise<InstallOutcome> => {
      // The plugin is just a checkout, so removal is a recursive directory
      // delete.
      const command = removeDirCommand(system, pluginDir(system));
      await runCommand(system, command, output);
      return { kind: "done", command };
    },
  };
}
