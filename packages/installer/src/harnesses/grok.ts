import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { detectOnPath, outputIncludes, runInstallCommand } from "./shell";

// Grok has no headless install-by-name; its marketplace install is TUI-only. So
// we install from the plugin repo directly — the exact source grok's built-in
// "xai-official" marketplace catalogs for sentry. Hence a MARKETPLACE_SOURCE (the
// repo) but no MARKETPLACE registration step.
// TODO: install sentry by name from the official "xai-official" marketplace once
// grok exposes a headless command for it (today that is TUI-only).
const MARKETPLACE_SOURCE = "getsentry/plugin-grok";
const INSTALL_COMMAND = `grok plugin install ${MARKETPLACE_SOURCE} --trust`;
const UPDATE_COMMAND = "grok plugin update sentry";

export function createGrok(system: SystemDeps): Harness {
  return {
    id: "grok",
    name: "Grok",

    detect: async () => detectOnPath(system, "grok"),

    isInstalled: async () => outputIncludes(system, "grok plugin list", "sentry"),

    canInstall: async () => ({ ok: true }),

    install: async () => {
      // `grok plugin install` errors on an already-installed repo, so update
      // in place when the plugin is already present.
      const command = (await outputIncludes(system, "grok plugin list", "sentry"))
        ? UPDATE_COMMAND
        : INSTALL_COMMAND;

      await runInstallCommand(system, command);
      return { kind: "done", command };
    },
  };
}

export const grok = createGrok(realSystem);
