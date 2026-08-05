import type { SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { matchesChannel, type HarnessOptions } from "./channel";
import { detectOnPath, runCommand, runJson } from "./shell";

// Grok has no headless install-by-name; its marketplace install is TUI-only. So
// we install from the plugin repo directly — the exact source grok's built-in
// "xAI Official" marketplace catalogs for sentry. Hence a MARKETPLACE_SOURCE (the
// repo) but no MARKETPLACE registration step.
// TODO: install sentry by name from the official "xAI Official" marketplace once
// grok exposes a headless command for it (today that is TUI-only).
const MARKETPLACE_SOURCE = "getsentry/plugin-grok";
const UPDATE_COMMAND = "grok plugin update sentry";
const UNINSTALL_COMMAND = "grok plugin uninstall sentry";

// `grok plugin list --json` emits an array of plugins. The two ways sentry can
// be installed both report our repo as `source`, so `marketplace` is what tells
// them apart: a direct repo install (ours) has `marketplace: null`, while a
// marketplace install (e.g. "xAI Official") names that marketplace. `version`
// then tells our two channels apart, since both install from the same repo.
interface GrokPlugin {
  name?: string;
  source?: string;
  marketplace?: string | null;
  version?: string;
}

async function listPlugins(system: SystemDeps): Promise<GrokPlugin[]> {
  const plugins = await runJson<GrokPlugin[]>(system, "grok plugin list --json");
  return Array.isArray(plugins) ? plugins : [];
}

// Ours: the sentry plugin installed directly from our repo, with no marketplace.
function isOurs(plugin: GrokPlugin): boolean {
  return (
    plugin.name === "sentry" &&
    !plugin.marketplace &&
    (plugin.source ?? "").includes(MARKETPLACE_SOURCE)
  );
}

export function createGrok(system: SystemDeps, options: HarnessOptions = {}): Harness {
  // `owner/repo@ref` is how grok's install source pins a branch or tag.
  const source =
    options.ref === undefined ? MARKETPLACE_SOURCE : `${MARKETPLACE_SOURCE}@${options.ref}`;
  const installCommand = `grok plugin install ${source} --trust`;

  // Ours, on the channel we were asked for. Grok records the source without the
  // ref, so the version is what distinguishes the channels.
  const isThisChannel = (plugin: GrokPlugin): boolean =>
    isOurs(plugin) && matchesChannel(plugin.version, options);

  return {
    id: "grok",
    name: "Grok",

    detect: async () => detectOnPath(system, "grok"),

    isInstalled: async () => (await listPlugins(system)).some(isThisChannel),

    canInstall: async () => ({ ok: true }),

    cleanup: async (output) => {
      // Grok has a single `sentry` slot, so anything in it that is not this
      // channel's build has to come out: a marketplace install (e.g. "xAI
      // Official") would shadow ours, and the other channel's build would make
      // `grok plugin install` fail as already-installed.
      const conflicting = (await listPlugins(system)).find(
        (plugin) => plugin.name === "sentry" && !isThisChannel(plugin),
      );

      if (!conflicting) {
        return null;
      }

      await runCommand(system, UNINSTALL_COMMAND, output);
      const via = conflicting.marketplace
        ? ` (installed via ${conflicting.marketplace})`
        : ` (version ${conflicting.version ?? "unknown"})`;
      return `Removed conflicting sentry plugin${via}`;
    },

    install: async (output): Promise<InstallOutcome> => {
      await runCommand(system, installCommand, output);
      return { kind: "done", command: installCommand };
    },

    // `grok plugin install` errors on an already-installed repo, so update in
    // place instead of reinstalling. Only reached when the installed build is
    // already on this channel, so the recorded source is the right one to pull.
    update: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UPDATE_COMMAND, output);
      return { kind: "done", command: UPDATE_COMMAND };
    },

    remove: async (output): Promise<InstallOutcome> => {
      await runCommand(system, UNINSTALL_COMMAND, output);
      return { kind: "done", command: UNINSTALL_COMMAND };
    },
  };
}
