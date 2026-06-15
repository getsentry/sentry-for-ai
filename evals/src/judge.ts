/**
 * LLM judge for soft assertions only. Deterministic file-content checks
 * belong in the test body as expect() calls — this handles criteria that
 * need semantic understanding (e.g. "did it detect Rails").
 */

import Anthropic from "@anthropic-ai/sdk";
import { createJudge } from "vitest-evals";
import type { JudgeContext, JsonValue } from "vitest-evals";

import type { EvalMeta, EvalOutput, JudgeResponse } from "./types.js";
import { JudgeResponseSchema } from "./types.js";

const JUDGE_MODEL = "claude-sonnet-4-6";

function buildJudgePrompt(meta: EvalMeta, output: EvalOutput): string {
  const filesBlock = Object.entries(output.files)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  return `You are an eval judge for an SDK installation skill. Evaluate whether the agent's work meets the criteria below.

## Scenario
Given: ${meta.given}
Prompt: ${meta.prompt}

## Files After Agent Run
${filesBlock}

## Agent Output (truncated)
${output.agentOutput.slice(0, 4000)}

## Created: ${output.createdFiles.join(", ") || "(none)"}
## Modified: ${output.modifiedFiles.join(", ") || "(none)"}
## Deleted: ${output.deletedFiles.join(", ") || "(none)"}

## Soft Assertions (should be true)
${meta.soft_assertions.map((a, i) => `  [${i}] ${a.criterion}`).join("\n") || "  (none)"}

## Negative Assertions (should NOT be true)
${meta.negative_assertions.map((a, i) => `  [${i}] ${a.criterion}`).join("\n") || "  (none)"}

Respond with ONLY a JSON object:
{
  "assertions": [{ "met": true, "reasoning": "..." }],
  "negative_assertions": [{ "met": false, "reasoning": "..." }]
}
- "assertions": exactly ${meta.soft_assertions.length} entries — "met" = criterion is satisfied
- "negative_assertions": exactly ${meta.negative_assertions.length} entries — "met" = violation exists (bad)
- Keep reasoning to 1-2 sentences`;
}

/** Collect failed soft and negative assertions into a list of reasons. */
function collectFailures(meta: EvalMeta, response: JudgeResponse): string[] {
  const failures: string[] = [];
  for (let i = 0; i < meta.soft_assertions.length; i++) {
    const v = response.assertions[i];
    if (meta.soft_assertions[i]!.required && !v?.met) {
      failures.push(`soft[${i}] not met: ${v?.reasoning ?? "no verdict"}`);
    }
  }
  for (let i = 0; i < meta.negative_assertions.length; i++) {
    if (response.negative_assertions[i]?.met) {
      failures.push(`negative[${i}] violated: ${response.negative_assertions[i]!.reasoning}`);
    }
  }
  return failures;
}

/** Create a judge that evaluates soft/negative assertions via an LLM call. */
export function createSoftJudge(apiKey: string) {
  return createJudge<JudgeContext<EvalMeta, JsonValue>>(
    "SoftJudge",
    async ({ input: meta, run }) => {
      if (meta.soft_assertions.length === 0 && meta.negative_assertions.length === 0) {
        return { score: 1 };
      }

      const output = run.output as unknown as EvalOutput;
      const prompt = buildJudgePrompt(meta, output);

      try {
        const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 0 });
        const response = await client.messages.create({
          model: JUDGE_MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === "text",
        )?.text;
        if (!text) {
          return { score: 0, metadata: { rationale: "Judge returned no text" } };
        }

        const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JudgeResponseSchema.safeParse(JSON.parse(jsonStr));
        if (!parsed.success) {
          return { score: 0, metadata: { rationale: `Judge returned invalid JSON: ${parsed.error.message}` } };
        }

        const failures = collectFailures(meta, parsed.data);
        return {
          score: failures.length === 0 ? 1 : 0,
          metadata: { rationale: failures.length === 0 ? "All soft assertions passed" : failures.join("; ") },
        };
      } catch (error) {
        return {
          score: 0,
          metadata: { rationale: `Judge failed: ${error instanceof Error ? error.message : String(error)}` },
        };
      }
    },
  );
}
