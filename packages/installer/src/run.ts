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
  | { kind: "done"; command: string; note?: string }
  | { kind: "manual"; instructions: string }
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
export async function installHarness(detection: Detection): Promise<InstallResult> {
  const readiness = await detection.harness.canInstall();
  if (!readiness.ok) {
    return { kind: "blocked", reason: readiness.reason };
  }

  try {
    const outcome = await detection.harness.install();

    return outcome.kind === "manual"
      ? { kind: "manual", instructions: outcome.instructions }
      : { kind: "done", command: outcome.command, note: outcome.note };
  } catch (err) {
    return { kind: "failed", message: err instanceof Error ? err.message : String(err) };
  }
}

export function installSucceeded(result: InstallResult): boolean {
  return result.kind === "done" || result.kind === "manual";
}
