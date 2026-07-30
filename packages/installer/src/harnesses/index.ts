import { claude, createClaude } from "./claude";
import { codex, createCodex } from "./codex";
import { cursor, createCursor } from "./cursor";
import { grok, createGrok } from "./grok";
import { opencode, createOpenCode } from "./opencode";
import { opencode2, createOpenCode2 } from "./opencode2";

export type { Harness, InstallOutcome } from "./types";
export { createClaude, createCodex, createCursor, createGrok, createOpenCode, createOpenCode2 };

export const harnesses = [claude, codex, cursor, grok, opencode, opencode2];
