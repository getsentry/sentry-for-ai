import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

type DetectorPayload = {
  skill_name: string;
  sdk_repo: string;
  pr_number: number;
  pr_url: string;
  sdk_repo_path: string;
};

const Action = v.union([
  v.object({
    type: v.literal('create_pr'),
    title: v.string(),
    body: v.string(),
    branch: v.string(),
    patch: v.string(),
  }),
  v.object({
    type: v.literal('create_issue'),
    title: v.string(),
    body: v.string(),
    labels: v.optional(v.array(v.string())),
  }),
  v.object({
    type: v.literal('skip'),
    reason: v.string(),
  }),
]);

const DetectorOutput = v.object({
  actions: v.array(Action),
  summary: v.string(),
});

export default async function ({ init, payload }: FlueContext) {
  const {
    skill_name,
    sdk_repo,
    pr_number,
    pr_url,
    sdk_repo_path,
  } = payload as DetectorPayload;

  const harness = await init({
    sandbox: 'local',
    model: 'anthropic/claude-opus-4-6',
  });
  const session = await harness.session();

  const { data } = await session.prompt(
    `Run the skill-drift detection workflow for one SDK PR.

Use this context:
- skill_name: ${skill_name}
- sdk_repo: ${sdk_repo}
- pr_number: ${pr_number}
- pr_url: ${pr_url}
- sdk_repo_path: ${sdk_repo_path}

Use this data to decide whether to emit create_pr/create_issue/skip actions.`,
    {
      role: 'detector',
      schema: DetectorOutput,
    },
  );

  return data;
}
