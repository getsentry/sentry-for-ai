import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { expect } from "vitest";
import { describeEval } from "vitest-evals";

import { createInstallEvalHarness, getOutput } from "./harness.js";
import { createSoftJudge } from "./judge.js";
import { ScenarioSchema, type EvalMeta } from "./types.js";

const apiKey = process.env["ANTHROPIC_API_KEY"] ?? "";
const evalsDir = join(import.meta.dirname, "..");
const skillPath = join(evalsDir, "..", "skills", "sentry-ruby-sdk");
const scenarioDir = join(evalsDir, "scenarios", "ruby-sdk");
const fixtureBaseDir = join(evalsDir, "fixtures", "ruby-sdk");

const scenarios: EvalMeta[] = readdirSync(scenarioDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((file) => {
    const scenario = ScenarioSchema.parse(
      JSON.parse(readFileSync(join(scenarioDir, file), "utf-8")),
    );
    return {
      ...scenario,
      skillName: "sentry-ruby-sdk",
      skillPath,
      fixturePath: join(fixtureBaseDir, scenario.fixture),
    };
  });

const TIMEOUT_MS = 240_000;

describeEval(
  "sentry-ruby-sdk",
  {
    harness: createInstallEvalHarness({
      apiKey,
      verbose: !!process.env["EVAL_VERBOSE"],
    }),
    judges: [createSoftJudge(apiKey)],
    judgeThreshold: 1,
    skipIf: () => !apiKey,
  },
  (it) => {
    for (const meta of scenarios) {
      it(meta.name, { timeout: TIMEOUT_MS }, async ({ run }) => {
        const result = await run(meta);
        const output = getOutput(result);

        for (const check of meta.files) {
          const content = output.files[check.path];
          expect(content, `${check.path} should exist`).toBeDefined();
          for (const s of check.contains) {
            expect(content, `${check.path} should contain "${s}"`).toContain(s);
          }
          for (const s of check.excludes) {
            expect(content, `${check.path} should not contain "${s}"`).not.toContain(s);
          }
        }

        for (const path of meta.should_not_exist) {
          expect(output.files[path], `${path} should not exist`).toBeUndefined();
        }
      });
    }
  },
);
