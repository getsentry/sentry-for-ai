import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

const CreatorSuccess = v.object({
  status: v.literal('success'),
  skill: v.string(),
  platform: v.string(),
  summary: v.string(),
  files_created: v.array(v.string()),
  files_modified: v.array(v.string()),
  router_updated: v.string(),
});

const CreatorSkipped = v.object({
  status: v.literal('skipped'),
  reason: v.string(),
});

const CreatorOutput = v.union([CreatorSuccess, CreatorSkipped]);

interface CreatorPayload {
  platform: string;
  prompt?: string;
}

export default async function ({ init, payload }: FlueContext) {
  const p = payload as CreatorPayload;

  const harness = await init({
    sandbox: 'local',
    model: 'anthropic/claude-opus-4-6',
  });
  const session = await harness.session();

  const { data } = await session.prompt(
    `Create a new Sentry SDK skill bundle for platform: ${p.platform}.${p.prompt ? `\n\nAdditional guidance:\n${p.prompt}` : ''}`,
    {
      role: 'creator',
      schema: CreatorOutput,
    },
  );

  return data;
}
