import { z } from "zod/v4";

/** Schema for scenario JSON files under scenarios/<skill>/*.json. */
export const FileCheckSchema = z.object({
  path: z.string(),
  contains: z.array(z.string()).default([]),
  excludes: z.array(z.string()).default([]),
});

export const ScenarioSchema = z.object({
  name: z.string(),
  given: z.string(),
  prompt: z.string(),
  fixture: z.string(),
  files: z.array(FileCheckSchema).default([]),
  should_not_exist: z.array(z.string()).default([]),
  soft_assertions: z
    .array(z.object({ criterion: z.string(), required: z.boolean().default(true) }))
    .default([]),
  negative_assertions: z
    .array(z.object({ criterion: z.string() }))
    .default([]),
});

/** Judge response schema — used by safeParse to validate LLM output. */
export const JudgeResponseSchema = z.object({
  assertions: z.array(z.object({ met: z.boolean(), reasoning: z.string() })).default([]),
  negative_assertions: z.array(z.object({ met: z.boolean(), reasoning: z.string() })).default([]),
});

export type FileCheck = z.infer<typeof FileCheckSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type JudgeResponse = z.infer<typeof JudgeResponseSchema>;

export interface EvalMeta extends Scenario {
  skillName: string;
  skillPath: string;
  fixturePath: string;
}

export interface EvalOutput {
  files: Record<string, string>;
  createdFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  agentOutput: string;
  durationMs: number;
}
