import { realSystem } from "../system";
import { createClaude } from "./claude";
import { createCodex } from "./codex";
import { createCursor } from "./cursor";
import { createGrok } from "./grok";
import type { HarnessOptions } from "./channel";
import type { Harness } from "./types";

export type { Harness, InstallOutcome } from "./types";
export type { HarnessOptions } from "./channel";
export { createClaude, createCodex, createCursor, createGrok };

/**
 * Every harness, built for one channel. `install` passes the ref it was asked
 * for; `remove` passes `anyChannel` so it acts on whatever is installed. No
 * arguments builds the stable set.
 */
export function buildHarnesses(options: HarnessOptions = {}): Harness[] {
  return [
    createClaude(realSystem, options),
    createCodex(realSystem, options),
    createCursor(realSystem, options),
    createGrok(realSystem, options),
  ];
}
