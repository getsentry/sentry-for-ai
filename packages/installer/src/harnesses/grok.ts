import { realSystem, type OutputSink, type SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { detectOnPath, runInstallCommand, runJson } from "./shell";

// Grok has no headless install-by-name; its marketplace install is TUI-only. So
// we install from the plugin repo directly — the exact source grok's built-in
// "xAI Official" marketplace catalogs for sentry. Hence a MARKETPLACE_SOURCE (the
// repo) but no MARKETPLACE registration step.
// TODO: install sentry by name from the official "xAI Official" marketplace once
// grok exposes a headless command for it (today that is TUI-only).
const MARKETPLACE_SOURCE = "getsentry/plugin-grok";
const INSTALL_COMMAND = `grok plugin install ${MARKETPLACE_SOURCE} --trust`;
const UPDATE_COMMAND = "grok plugin update sentry";
const UNINSTALL_COMMAND = "grok plugin uninstall sentry";

// `grok plugin list --json` emits an array of plugins. The two ways sentry can
// be installed both report our repo as `source`, so `marketplace` is what tells
// them apart: a direct repo install (ours) has `marketplace: null`, while a
// marketplace install (e.g. "xAI Official") names that marketplace.
interface GrokPlugin {
  name?: string;
  source?: string;
  marketplace?: string | null;
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

export function createGrok(system: SystemDeps): Harness {
  return {
    id: "grok",
    name: "Grok",

    detect: async () => detectOnPath(system, "grok"),

    isInstalled: async () => (await listPlugins(system)).some(isOurs),

    canInstall: async () => ({ ok: true }),

    cleanup: async (output) => {
      // A sentry plugin installed from a marketplace (e.g. "xAI Official")
      // shadows ours. Uninstall it so our direct-repo install is the one that
      // resolves; ours (no marketplace) is left untouched.
      const foreign = (await listPlugins(system)).find(
        (plugin) => plugin.name === "sentry" && !isOurs(plugin),
      );

      if (!foreign) {
        return null;
      }

      await runInstallCommand(system, UNINSTALL_COMMAND, output);
      const via = foreign.marketplace ? ` (installed via ${foreign.marketplace})` : "";
      return `Removed conflicting sentry plugin${via}`;
    },

    install: async (output): Promise<InstallOutcome> => {
      await runInstallCommand(system, INSTALL_COMMAND, output);
      return { kind: "done", command: INSTALL_COMMAND };
    },

    // `grok plugin install` errors on an already-installed repo, so update in
    // place instead of reinstalling.
    update: async (output): Promise<InstallOutcome> => {
      await runInstallCommand(system, UPDATE_COMMAND, output);
      return { kind: "done", command: UPDATE_COMMAND };
    },
  };
}

export const grok = createGrok(realSystem);
