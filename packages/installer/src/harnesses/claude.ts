import { realSystem, type OutputSink, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runCommand, runJson } from "./shell";

const MARKETPLACE = "claude-plugins-official";
const MARKETPLACE_SOURCE = "anthropics/claude-plugins-official";
const PLUGIN_ID = `sentry@${MARKETPLACE}`;
const INSTALL_COMMAND = `claude plugin install ${PLUGIN_ID}`;
const UPDATE_COMMAND = `claude plugin update ${PLUGIN_ID}`;
const UNINSTALL_COMMAND = `claude plugin uninstall ${PLUGIN_ID}`;

// `claude plugin list --json` emits an array of installed plugins. We only care
// about the marketplace-qualified id of each entry.
interface ClaudePlugin {
  id?: string;
}

// `claude plugin marketplace list --json` emits an array of registered
// marketplaces, each with a `name`.
interface ClaudeMarketplace {
  name?: string;
}

async function isSentryInstalled(system: SystemDeps): Promise<boolean> {
  const plugins = await runJson<ClaudePlugin[]>(system, "claude plugin list --json");
  return Array.isArray(plugins) && plugins.some((plugin) => plugin.id === PLUGIN_ID);
}

async function isMarketplaceRegistered(system: SystemDeps): Promise<boolean> {
  const list = await runJson<ClaudeMarketplace[]>(system, "claude plugin marketplace list --json");
  return Array.isArray(list) && list.some((entry) => entry.name === MARKETPLACE);
}

// A fresh CLI has no marketplaces registered, so register the official one if it
// is missing; otherwise refresh its index so the plugin resolves. Required by
// both install and update.
async function ensureMarketplace(system: SystemDeps, output?: OutputSink): Promise<void> {
  const registered = await isMarketplaceRegistered(system);
  await runCommand(
    system,
    registered
      ? `claude plugin marketplace update ${MARKETPLACE}`
      : `claude plugin marketplace add ${MARKETPLACE_SOURCE}`,
    output,
  );
}

export function createClaude(system: SystemDeps): Harness {
  return {
    id: "claude",
    name: "Claude Code",

    detect: async () => detectOnPath(system, "claude"),

    isInstalled: async () => isSentryInstalled(system),

    canInstall: async () => ({ ok: true }),

    install: async (output): Promise<InstallOutcome> => {
      await ensureMarketplace(system, output);
      await runCommand(system, INSTALL_COMMAND, output);
      return { kind: "done", command: INSTALL_COMMAND };
    },

    update: async (output): Promise<InstallOutcome> => {
      await ensureMarketplace(system, output);
      await runCommand(system, UPDATE_COMMAND, output);
      return { kind: "done", command: UPDATE_COMMAND };
    },

    remove: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UNINSTALL_COMMAND, output);
      return { kind: "done", command: UNINSTALL_COMMAND };
    },
  };
}

export const claude = createClaude(realSystem);
