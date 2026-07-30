import { claude, createClaude } from "./claude";
import { codex, createCodex } from "./codex";
import { cursor, createCursor } from "./cursor";
import { grok, createGrok } from "./grok";
import { pi, createPi } from "./pi";

export type { Harness, InstallOutcome } from "./types";
export { createClaude, createCodex, createCursor, createGrok, createPi };

export const harnesses = [claude, codex, cursor, grok, pi];
