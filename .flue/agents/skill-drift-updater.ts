import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

const UpdaterOutput = v.object({
  skill: v.string(),
  summary: v.string(),
  files_changed: v.array(v.string()),
  sdk_pr_references: v.array(v.object({
    repo: v.string(),
    number: v.number(),
    title: v.string(),
    url: v.string(),
  })),
  skipped: v.optional(v.object({
    reason: v.string(),
  })),
});

interface UpdaterPayload {
  issue_number: number;
  issue_title: string;
  issue_body: string;
  issue_url: string;
}

export default async function ({ init, payload }: FlueContext) {
  const p = payload as UpdaterPayload;

  const harness = await init({
    sandbox: 'local',
    model: 'anthropic/claude-opus-4-6',
  });
  const session = await harness.session();

  const { data } = await session.prompt(
    `Fix the skill drift described in this issue.

Issue #${p.issue_number}: ${p.issue_title}
URL: ${p.issue_url}

Body:
${p.issue_body}`,
    {
      role: 'updater',
      schema: UpdaterOutput,
    },
  );

  return data;
}
