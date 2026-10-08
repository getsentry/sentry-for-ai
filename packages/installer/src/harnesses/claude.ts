import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runCommand, runLoginCommand, runJson } from "./shell";

const MARKETPLACE = "sentry-plugin-marketplace";
const MARKETPLACE_SOURCE = "getsentry/plugin-claude";
const PLUGIN_ID = `sentry@${MARKETPLACE}`;
const INSTALL_COMMAND = `claude plugin install ${PLUGIN_ID}`;
const UPDATE_COMMAND = `claude plugin update ${PLUGIN_ID}`;
const UNINSTALL_COMMAND = `claude plugin uninstall ${PLUGIN_ID}`;
const AUTHENTICATE_COMMAND = "claude mcp login plugin:sentry:sentry";

// Remove the official catalog's copy so only our marketplace's plugin serves
// Sentry's skills and MCP server.
const LEGACY_PLUGIN_ID = "sentry@claude-plugins-official";

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

async function hasPlugin(system: SystemDeps, pluginId: string): Promise<boolean> {
  const plugins = await runJson<ClaudePlugin[]>(system, "claude plugin list --json");
  return Array.isArray(plugins) && plugins.some((plugin) => plugin.id === pluginId);
}

async function isMarketplaceRegistered(system: SystemDeps): Promise<boolean> {
  const list = await runJson<ClaudeMarketplace[]>(system, "claude plugin marketplace list --json");
  return Array.isArray(list) && list.some((entry) => entry.name === MARKETPLACE);
}

// Register Sentry’s marketplace if missing; otherwise refresh its index so the
// plugin resolves. Required by both install and update.
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

    isInstalled: async () => hasPlugin(system, PLUGIN_ID),

    canInstall: async () => ({ ok: true }),

    cleanup: async (output) => {
      if (!(await hasPlugin(system, LEGACY_PLUGIN_ID))) {
        return null;
      }

      await runCommand(system, `claude plugin uninstall ${LEGACY_PLUGIN_ID}`, output);
      return `Removed conflicting plugin ${LEGACY_PLUGIN_ID}`;
    },

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

    authenticate: async (output) => {
      await runLoginCommand(system, AUTHENTICATE_COMMAND, output);
      return { command: AUTHENTICATE_COMMAND };
    },

    remove: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UNINSTALL_COMMAND, output);
      return { kind: "done", command: UNINSTALL_COMMAND };
    },
  };
}
