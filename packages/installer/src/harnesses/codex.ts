import { realSystem, type SystemDeps } from "../system";
import type { Harness } from "./types";
import { detectOnPath, outputIncludes, runInstallCommand } from "./shell";

// TODO: Codex is the only agent we install from our OWN marketplace
// (getsentry/plugin-codex) rather than the agent vendor's official marketplace
// like Claude (claude-plugins-official) and Grok (xai-official). That repo
// vendors a copy of the skill files, so every plugin update means regenerating
// and republishing the vendored marketplace. Move Codex onto an official
// marketplace once one is available so updates flow without re-vendoring.
const MARKETPLACE = "sentry-plugin-marketplace";
const MARKETPLACE_SOURCE = "getsentry/plugin-codex";
const INSTALL_COMMAND = `codex plugin add sentry@${MARKETPLACE}`;

export function createCodex(system: SystemDeps): Harness {
  return {
    id: "codex",
    name: "Codex",

    detect: async () => detectOnPath(system, "codex"),

    isInstalled: async () => outputIncludes(system, "codex plugin list", "sentry"),

    canInstall: async () => ({ ok: true }),

    install: async () => {
      // The Sentry plugin lives in its own marketplace, not a Codex default, so
      // register it if missing; otherwise refresh its snapshot so it resolves.
      const registered = await outputIncludes(system, "codex plugin marketplace list", MARKETPLACE);
      await runInstallCommand(
        system,
        registered
          ? `codex plugin marketplace upgrade ${MARKETPLACE}`
          : `codex plugin marketplace add ${MARKETPLACE_SOURCE}`,
      );

      // Codex has no plugin update command; `add` is idempotent and re-points an
      // already-installed plugin at the refreshed snapshot.
      await runInstallCommand(system, INSTALL_COMMAND);
      return { kind: "done", command: INSTALL_COMMAND };
    },
  };
}

export const codex = createCodex(realSystem);
