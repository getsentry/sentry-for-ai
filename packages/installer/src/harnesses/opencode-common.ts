import { dirname, join } from "node:path";
import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runCommand } from "./shell";

const MCP_URL = "https://mcp.sentry.dev/mcp?utm_source=plugin";

interface OpenCodeHarnessOptions {
  id: string;
  name: string;
  binary: string;
  repository: string;
  mcpCommand: string;
  mcpConfigPath: string;
  marker: string;
  incompatibleMarker: string;
  supersededBy?: string;
}

function bundleDir(system: SystemDeps): string {
  return join(system.homedir, ".config", "opencode", "skills", "sentry");
}

async function ensureParentDirectory(system: SystemDeps, output?: OutputSink): Promise<void> {
  const parent = dirname(bundleDir(system));
  const command =
    system.platform === "win32"
      ? `if not exist "${parent}" mkdir "${parent}"`
      : `mkdir -p "${parent}"`;
  await runCommand(system, command, output);
}

async function removeBundle(system: SystemDeps, output?: OutputSink): Promise<string> {
  const dir = bundleDir(system);
  const command = system.platform === "win32" ? `rmdir /s /q "${dir}"` : `rm -rf "${dir}"`;
  await runCommand(system, command, output);
  return command;
}

export function createOpenCodeHarness(
  system: SystemDeps,
  options: OpenCodeHarnessOptions,
): Harness {
  const configureMcp = (output?: OutputSink) =>
    runCommand(system, `${options.mcpCommand} "${MCP_URL}"`, output);

  return {
    id: options.id,
    name: options.name,

    detect: async () => {
      if (!(await detectOnPath(system, options.binary))) {
        return false;
      }

      // V1 and V2 share a config path but use incompatible MCP shapes. Prefer
      // the V2 beta when both explicit binaries are installed so unattended
      // installs never race while writing the same file.
      return !options.supersededBy || !(await detectOnPath(system, options.supersededBy));
    },

    isInstalled: async () => system.exists(join(bundleDir(system), options.marker)),

    canInstall: async () =>
      (await detectOnPath(system, "git"))
        ? { ok: true }
        : { ok: false, reason: `git is required to clone the ${options.name} bundle` },

    cleanup: async (output) => {
      if (!system.exists(join(bundleDir(system), options.incompatibleMarker))) {
        return null;
      }

      await removeBundle(system, output);
      return "Removed the incompatible Sentry OpenCode bundle";
    },

    install: async (output): Promise<InstallOutcome> => {
      await ensureParentDirectory(system, output);
      const command = `git clone ${options.repository} "${bundleDir(system)}"`;
      await runCommand(system, command, output);
      await configureMcp(output);
      return { kind: "done", command };
    },

    update: async (output): Promise<InstallOutcome> => {
      const command = `git -C "${bundleDir(system)}" pull`;
      await runCommand(system, command, output);
      await configureMcp(output);
      return { kind: "done", command };
    },

    remove: async (output): Promise<InstallOutcome> => {
      const command = await removeBundle(system, output);
      return {
        kind: "done",
        command,
        note: `The CLI has no MCP remove command; delete ${options.mcpConfigPath} from your OpenCode config to remove Sentry completely.`,
      };
    },
  };
}
