import { dirname, join } from "node:path";
import { applyEdits, findNodeAtLocation, modify, parseTree } from "jsonc-parser";
import mcp from "../../../../mcp.json";
import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runCommand } from "./shell";

const MCP_URL = mcp.mcpServers.sentry.url;

interface OpenCodeHarnessOptions {
  id: string;
  name: string;
  binary: string;
  repository: string;
  mcpCommand: string;
  mcpConfigPath: string[];
  incompatibleMcpConfigPath: string[];
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

function markerPath(system: SystemDeps, marker: string): string {
  return join(bundleDir(system), marker);
}

function removeMcpConfigPaths(system: SystemDeps, mcpConfigPaths: string[][]): boolean {
  const configDir = join(system.homedir, ".config", "opencode");
  let removed = false;

  for (const filename of ["opencode.json", "opencode.jsonc"]) {
    const configPath = join(configDir, filename);
    if (!system.exists(configPath)) {
      continue;
    }

    let contents = system.readTextFile(configPath);
    let changed = false;
    for (const mcpConfigPath of mcpConfigPaths) {
      const tree = parseTree(contents);
      if (!tree || !findNodeAtLocation(tree, mcpConfigPath)) {
        continue;
      }

      const edits = modify(contents, mcpConfigPath, undefined, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      });
      contents = applyEdits(contents, edits);
      changed = true;
    }

    if (changed) {
      system.writeTextFile(configPath, contents);
      removed = true;
    }
  }

  return removed;
}

export function createOpenCodeHarness(
  system: SystemDeps,
  options: OpenCodeHarnessOptions,
): Harness {
  const hasOwnBundle = () => system.exists(markerPath(system, options.marker));
  const hasIncompatibleBundle = () => system.exists(markerPath(system, options.incompatibleMarker));
  const configureMcp = async (output?: OutputSink) => {
    removeMcpConfigPaths(system, [options.incompatibleMcpConfigPath]);
    await runCommand(system, `${options.mcpCommand} "${MCP_URL}"`, output);
  };

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

    // The active OpenCode CLI owns the shared bundle even when it was installed
    // by the other version. This keeps removal available and lets installation
    // replace an incompatible checkout instead of hiding it.
    isInstalled: async () => hasOwnBundle() || hasIncompatibleBundle(),

    canInstall: async () =>
      (await detectOnPath(system, "git"))
        ? { ok: true }
        : { ok: false, reason: `git is required to clone the ${options.name} bundle` },

    cleanup: async (output) => {
      const incompatibleBundle = hasIncompatibleBundle();
      const partialBundle = system.exists(bundleDir(system)) && !hasOwnBundle();

      if (incompatibleBundle || partialBundle) {
        await removeBundle(system, output);
      }

      const incompatibleMcp = removeMcpConfigPaths(system, [options.incompatibleMcpConfigPath]);

      if (incompatibleBundle) {
        return incompatibleMcp
          ? "Removed the incompatible Sentry OpenCode bundle and MCP configuration"
          : "Removed the incompatible Sentry OpenCode bundle";
      }
      if (partialBundle) {
        return "Removed a partial Sentry OpenCode installation";
      }
      if (incompatibleMcp) {
        return "Removed the incompatible Sentry OpenCode MCP configuration";
      }
      return null;
    },

    install: async (output): Promise<InstallOutcome> => {
      // Recover when install is called directly after a failed clone, without
      // relying on the orchestration layer to have run cleanup first.
      if (system.exists(bundleDir(system)) && !hasOwnBundle()) {
        await removeBundle(system, output);
      }

      await ensureParentDirectory(system, output);
      const command = `git clone ${options.repository} "${bundleDir(system)}"`;
      await runCommand(system, command, output);
      await configureMcp(output);
      return { kind: "done", command };
    },

    update: async (output): Promise<InstallOutcome> => {
      if (!hasOwnBundle()) {
        if (system.exists(bundleDir(system))) {
          await removeBundle(system, output);
        }
        await ensureParentDirectory(system, output);
        const command = `git clone ${options.repository} "${bundleDir(system)}"`;
        await runCommand(system, command, output);
        await configureMcp(output);
        return { kind: "done", command };
      }

      const command = `git -C "${bundleDir(system)}" pull`;
      await runCommand(system, command, output);
      await configureMcp(output);
      return { kind: "done", command };
    },

    remove: async (output): Promise<InstallOutcome> => {
      const command = await removeBundle(system, output);
      removeMcpConfigPaths(system, [options.mcpConfigPath, options.incompatibleMcpConfigPath]);
      return { kind: "done", command };
    },
  };
}
