import { realSystem, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runInstallCommand, runJson } from "./shell";

// TODO: Codex is the only agent we install from our OWN marketplace
// (getsentry/plugin-codex) rather than the agent vendor's official marketplace
// like Claude (claude-plugins-official) and Grok (xai-official). That repo
// vendors a copy of the skill files, so every plugin update means regenerating
// and republishing the vendored marketplace. Move Codex onto an official
// marketplace once one is available so updates flow without re-vendoring.
const MARKETPLACE = "sentry-plugin-marketplace";
const MARKETPLACE_SOURCE = "getsentry/plugin-codex";
const PLUGIN_ID = `sentry@${MARKETPLACE}`;
const INSTALL_COMMAND = `codex plugin add ${PLUGIN_ID}`;

// Codex ships an "official" Sentry plugin from its own curated marketplace. It
// shadows ours, so remove it before installing. Drop this once we publish to
// that marketplace and our plugin becomes the official one.
const LEGACY_PLUGIN_ID = "sentry@openai-curated";

// `codex plugin list --json` wraps installed plugins under `installed`, each
// keyed by a marketplace-qualified pluginId.
interface CodexPlugin {
  pluginId?: string;
}
interface CodexPluginList {
  installed?: CodexPlugin[];
}

// `codex plugin marketplace list --json` wraps registered marketplaces under
// `marketplaces`, each with a `name`.
interface CodexMarketplaceList {
  marketplaces?: { name?: string }[];
}

async function installedPlugins(system: SystemDeps): Promise<CodexPlugin[]> {
  const data = await runJson<CodexPluginList>(system, "codex plugin list --json");
  return data?.installed ?? [];
}

async function hasPlugin(system: SystemDeps, pluginId: string): Promise<boolean> {
  return (await installedPlugins(system)).some((plugin) => plugin.pluginId === pluginId);
}

async function isMarketplaceRegistered(system: SystemDeps): Promise<boolean> {
  const data = await runJson<CodexMarketplaceList>(system, "codex plugin marketplace list --json");
  return (data?.marketplaces ?? []).some((entry) => entry.name === MARKETPLACE);
}

// The Sentry plugin lives in its own marketplace, not a Codex default, so
// register it if missing; otherwise refresh its snapshot so it resolves.
// Required by both install and update.
async function ensureMarketplace(system: SystemDeps): Promise<void> {
  const registered = await isMarketplaceRegistered(system);
  await runInstallCommand(
    system,
    registered
      ? `codex plugin marketplace upgrade ${MARKETPLACE}`
      : `codex plugin marketplace add ${MARKETPLACE_SOURCE}`,
  );
}

// Codex has no plugin update command; `add` is idempotent and re-points an
// already-installed plugin at the refreshed snapshot, so install and update
// share this single path.
async function addPlugin(system: SystemDeps): Promise<InstallOutcome> {
  await ensureMarketplace(system);
  await runInstallCommand(system, INSTALL_COMMAND);
  return { kind: "done", command: INSTALL_COMMAND };
}

export function createCodex(system: SystemDeps): Harness {
  return {
    id: "codex",
    name: "Codex",

    detect: async () => detectOnPath(system, "codex"),

    isInstalled: async () => hasPlugin(system, PLUGIN_ID),

    canInstall: async () => ({ ok: true }),

    cleanup: async () => {
      if (!(await hasPlugin(system, LEGACY_PLUGIN_ID))) {
        return null;
      }

      await runInstallCommand(system, `codex plugin remove ${LEGACY_PLUGIN_ID}`);
      return `Removed conflicting plugin ${LEGACY_PLUGIN_ID}`;
    },

    install: async () => addPlugin(system),

    update: async () => addPlugin(system),
  };
}

export const codex = createCodex(realSystem);
