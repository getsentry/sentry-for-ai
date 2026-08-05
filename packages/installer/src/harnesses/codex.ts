import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { isDevelopVersion, matchesChannel, type HarnessOptions } from "./channel";
import { detectOnPath, runCommand, runJson } from "./shell";

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
const UNINSTALL_COMMAND = `codex plugin remove ${PLUGIN_ID}`;

// Codex ships an "official" Sentry plugin from its own curated marketplace. It
// shadows ours, so remove it before installing. Drop this once we publish to
// that marketplace and our plugin becomes the official one.
const LEGACY_PLUGIN_ID = "sentry@openai-curated";

// `codex plugin list --json` wraps installed plugins under `installed`, each
// keyed by a marketplace-qualified pluginId and carrying the manifest version —
// which is what tells the two channels apart, since both install under the same
// pluginId from the same marketplace name.
interface CodexPlugin {
  pluginId?: string;
  version?: string;
}
interface CodexPluginList {
  installed?: CodexPlugin[];
}

// `codex plugin marketplace list --json` wraps registered marketplaces under
// `marketplaces`, each with a `name`. It does not report the ref a git source was
// added with, which is why the channel is read off the installed plugin instead.
interface CodexMarketplaceList {
  marketplaces?: { name?: string }[];
}

async function installedPlugins(system: SystemDeps): Promise<CodexPlugin[]> {
  const data = await runJson<CodexPluginList>(system, "codex plugin list --json");
  return data?.installed ?? [];
}

async function findPlugin(system: SystemDeps, pluginId: string): Promise<CodexPlugin | undefined> {
  return (await installedPlugins(system)).find((plugin) => plugin.pluginId === pluginId);
}

async function isMarketplaceRegistered(system: SystemDeps): Promise<boolean> {
  const data = await runJson<CodexMarketplaceList>(system, "codex plugin marketplace list --json");
  return (data?.marketplaces ?? []).some((entry) => entry.name === MARKETPLACE);
}

// The Sentry plugin lives in its own marketplace, not a Codex default, so
// register it if missing; otherwise refresh its snapshot so it resolves.
// Required by both install and update.
//
// Codex cannot re-point a registered marketplace at a different ref: `marketplace
// upgrade` only refreshes the snapshot it already has, and there is no way to read
// back which ref it was added with. So the source is removed and re-added whenever
// the ref has to change — always for a ref-pinned install, and for a stable
// install only when a develop build is what is currently installed, which is the
// one way a stable run can find the marketplace pinned somewhere else. The remove
// runs through `system.run` rather than `runCommand` because it is allowed to
// fail: nothing is registered yet on a first install.
async function ensureMarketplace(
  system: SystemDeps,
  options: HarnessOptions,
  output?: OutputSink,
): Promise<void> {
  const installed = await findPlugin(system, PLUGIN_ID);
  const repoint = options.ref !== undefined || isDevelopVersion(installed?.version);

  if (repoint) {
    const source =
      options.ref === undefined ? MARKETPLACE_SOURCE : `${MARKETPLACE_SOURCE} --ref ${options.ref}`;
    await system.run(`codex plugin marketplace remove ${MARKETPLACE}`);
    await runCommand(system, `codex plugin marketplace add ${source}`, output);
    return;
  }

  const registered = await isMarketplaceRegistered(system);
  await runCommand(
    system,
    registered
      ? `codex plugin marketplace upgrade ${MARKETPLACE}`
      : `codex plugin marketplace add ${MARKETPLACE_SOURCE}`,
    output,
  );
}

// Codex has no plugin update command; `add` is idempotent and re-points an
// already-installed plugin at the refreshed snapshot, so install and update
// share this single path.
async function addPlugin(
  system: SystemDeps,
  options: HarnessOptions,
  output?: OutputSink,
): Promise<InstallOutcome> {
  await ensureMarketplace(system, options, output);
  await runCommand(system, INSTALL_COMMAND, output);
  return { kind: "done", command: INSTALL_COMMAND };
}

export function createCodex(system: SystemDeps, options: HarnessOptions = {}): Harness {
  return {
    id: "codex",
    name: "Codex",

    detect: async () => detectOnPath(system, "codex"),

    // Both channels install the same pluginId, so presence alone would report the
    // other channel's build as ours; the version is what settles it.
    isInstalled: async () => {
      const installed = await findPlugin(system, PLUGIN_ID);
      return installed !== undefined && matchesChannel(installed.version, options);
    },

    canInstall: async () => ({ ok: true }),

    cleanup: async (output) => {
      if ((await findPlugin(system, LEGACY_PLUGIN_ID)) === undefined) {
        return null;
      }

      await runCommand(system, `codex plugin remove ${LEGACY_PLUGIN_ID}`, output);
      return `Removed conflicting plugin ${LEGACY_PLUGIN_ID}`;
    },

    install: async (output) => addPlugin(system, options, output),

    update: async (output) => addPlugin(system, options, output),

    remove: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UNINSTALL_COMMAND, output);
      return { kind: "done", command: UNINSTALL_COMMAND };
    },
  };
}
