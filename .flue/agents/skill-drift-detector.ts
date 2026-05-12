import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

const Action = v.union([
  v.object({
    type: v.literal('create_pr'),
    skill: v.string(),
    title: v.string(),
    body: v.string(),
    branch: v.string(),
    patch: v.string(),
  }),
  v.object({
    type: v.literal('create_issue'),
    skill: v.string(),
    title: v.string(),
    body: v.string(),
    labels: v.optional(v.array(v.string())),
  }),
  v.object({
    type: v.literal('skip'),
    skill: v.string(),
    reason: v.string(),
  }),
]);

const DetectorOutput = v.object({
  actions: v.array(Action),
  summary: v.string(),
});

export default async function ({ init, payload }: FlueContext) {
  const since = (payload as any)?.since ?? '7 days ago';

  const harness = await init({
    sandbox: 'local',
    model: 'anthropic/claude-opus-4-6',
  });
  const session = await harness.session();

  const { data } = await session.prompt(
    `Run the skill-drift detection workflow. Use "${since}" as the cutoff date for "merged in the last 7 days".`,
    {
      role: 'detector',
      schema: DetectorOutput,
    },
  );

  return data;
}
