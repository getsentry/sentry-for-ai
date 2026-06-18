import type { OutputSink } from "./system";
import type { Harness } from "./harnesses/types";

export interface Detection {
  harness: Harness;
  detected: boolean;
  installed: boolean;
}

// The outcome of installing a single harness. `done`/`manual` are successes;
// `blocked`/`failed` are failures the caller surfaces and counts toward a
// non-zero exit. installHarness never throws — every path maps to one of these.
export type InstallResult =
  | { kind: "done"; command: string; note?: string; cleaned?: string }
  | { kind: "manual"; instructions: string; cleaned?: string }
  | { kind: "blocked"; reason: string }
  | { kind: "failed"; message: string };

// Probe every harness concurrently. isInstalled is only meaningful once a
// harness is on the PATH, so it is skipped entirely when detection fails.
export async function detectHarnesses(harnesses: Harness[]): Promise<Detection[]> {
  return Promise.all(
    harnesses.map(async (harness) => {
      const detected = await harness.detect();
      const installed = detected ? await harness.isInstalled() : false;
      return { harness, detected, installed };
    }),
  );
}

// Install (or reinstall) a single harness. A blocked prerequisite short-circuits
// before install runs; a thrown install is captured as a `failed` result so a
// concurrent batch can keep going instead of rejecting the whole run.
export async function installHarness(
  detection: Detection,
  output?: OutputSink,
): Promise<InstallResult> {
  const readiness = await detection.harness.canInstall();
  if (!readiness.ok) {
    return { kind: "blocked", reason: readiness.reason };
  }

  try {
    // Clear out conflicting/legacy Sentry plugins first so ours is the one that
    // resolves, then install or update based on what detection already found.
    // Command output streams to `output` as it runs. InstallOutcome (done |
    // manual) is a subset of InstallResult, so a clean run passes straight
    // through; only blocked/failed and the cleanup note are added here.
    const cleaned = (await detection.harness.cleanup?.(output)) ?? undefined;

    const outcome = detection.installed
      ? await detection.harness.update(output)
      : await detection.harness.install(output);

    return cleaned ? { ...outcome, cleaned } : outcome;
  } catch (err) {
    return { kind: "failed", message: err instanceof Error ? err.message : String(err) };
  }
}

// Remove a single harness's plugin. The caller filters to harnesses that have it
// installed, so there is no readiness gate and no cleanup — we only take out our
// own plugin. A thrown remove is captured as a `failed` result so a concurrent
// batch keeps going instead of rejecting the whole run.
export async function removeHarness(
  detection: Detection,
  output?: OutputSink,
): Promise<InstallResult> {
  try {
    return await detection.harness.remove(output);
  } catch (err) {
    return { kind: "failed", message: err instanceof Error ? err.message : String(err) };
  }
}

export function installSucceeded(result: InstallResult): boolean {
  return result.kind === "done" || result.kind === "manual";
}
