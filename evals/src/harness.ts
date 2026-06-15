/** Adapts the runner to vitest-evals' createHarness() interface. */

import { createHarness, toJsonValue } from "vitest-evals";
import type { JsonValue } from "vitest-evals";

import { runInstallEval, type RunOptions } from "./runner.js";
import type { EvalMeta, EvalOutput } from "./types.js";

/** Create a harness that runs a skill agent against fixture projects. */
export function createInstallEvalHarness(options: RunOptions) {
  return createHarness<EvalMeta, JsonValue>({
    name: "sentry-install-eval",
    run: async ({ input: meta }) => {
      const result = await runInstallEval(meta, options);
      return {
        output: toJsonValue(result) as JsonValue,
        messages: [
          { role: "user" as const, content: meta.prompt },
          { role: "assistant" as const, content: result.agentOutput },
        ],
        toolCalls: result.toolCalls.map((c) => ({
          name: c.name,
          arguments: toJsonValue(c.arguments) as JsonValue,
          result: toJsonValue(c.result) as JsonValue,
        })),
        timings: { totalMs: result.durationMs },
      };
    },
  });
}

/** Extract the typed output from a harness run result. */
export function getOutput(run: { output: unknown }): EvalOutput {
  return run.output as EvalOutput;
}
