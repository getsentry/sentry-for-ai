import { realSystem } from "../system";
import { createClaude } from "./claude";
import { createCodex } from "./codex";
import { createCursor } from "./cursor";
import { createGrok } from "./grok";
import { createOpenCode } from "./opencode";
import { createOpenCode2 } from "./opencode2";
import type { Harness } from "./types";

export type { Harness, InstallOutcome } from "./types";
export { createClaude, createCodex, createCursor, createGrok, createOpenCode, createOpenCode2 };

/**
 * Every harness, built against the real system.
 *
 * Built on call rather than at module load: the harnesses used to be
 * module-level constants, which meant importing this barrel constructed all of
 * them as a side effect and left two ways to get one. Now there is a single
 * construction path.
 */
export function buildHarnesses(): Harness[] {
  return [
    createClaude(realSystem),
    createCodex(realSystem),
    createCursor(realSystem),
    createGrok(realSystem),
    createOpenCode(realSystem),
    createOpenCode2(realSystem),
  ];
}
