import type { OutputSink } from "../system";

/**
 * Result of an install or update attempt.
 */
export type InstallOutcome =
  /**
   * The operation completed automatically. `command` is the command that was
   * run, with an optional `note` for any follow-up the user should know about.
   */
  | { kind: "done"; command: string; note?: string }
  /**
   * The operation could not be automated; `instructions` tell the user how to
   * finish it manually.
   */
  | { kind: "manual"; instructions: string };

/**
 * Whether installation can proceed, carrying a `reason` when it cannot.
 */
export type InstallReadiness = { ok: true } | { ok: false; reason: string };

export interface Harness {
  /**
   * Stable machine-readable identifier for the harness (e.g. "claude").
   */
  readonly id: string;
  /**
   * Human-readable name shown in the UI (e.g. "Claude Code").
   */
  readonly name: string;
  /**
   * Whether this harness is present on the system and worth offering to the
   * user as an install target.
   */
  detect(): Promise<boolean>;
  /**
   * Whether the Sentry plugin is already installed for this harness.
   */
  isInstalled(): Promise<boolean>;
  /**
   * Whether installation can proceed, with a reason when it cannot (e.g. a
   * missing CLI or unsupported version).
   */
  canInstall(): Promise<InstallReadiness>;
  /**
   * Remove conflicting or legacy Sentry plugins before installing ours (e.g. a
   * vendor's "official" plugin that would shadow this one). Runs first during
   * install; optional because not every harness has anything to clean up.
   * Returns a short description of what was removed (surfaced in the UI), or null
   * when there was nothing to clean up. Streams command output to `output`.
   */
  cleanup?(output?: OutputSink): Promise<string | null>;
  /**
   * Install the plugin, assuming it is absent. Streams command output to
   * `output` when provided.
   */
  install(output?: OutputSink): Promise<InstallOutcome>;
  /**
   * Update the plugin, assuming it is already present. Streams command output to
   * `output` when provided.
   */
  update(output?: OutputSink): Promise<InstallOutcome>;
}
