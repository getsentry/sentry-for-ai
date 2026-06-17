import { vi } from "vitest";
import type { Harness, InstallOutcome, InstallReadiness } from "../harnesses/types";

export interface FakeHarnessOptions {
  id: string;
  name?: string;
  detected?: boolean;
  installed?: boolean;
  readiness?: InstallReadiness;
  outcome?: InstallOutcome;
  error?: Error;
}

export function fakeHarness(options: FakeHarnessOptions): Harness {
  return {
    id: options.id,
    name: options.name ?? options.id,
    detect: vi.fn(async () => options.detected ?? false),
    isInstalled: vi.fn(async () => options.installed ?? false),
    canInstall: vi.fn(async () => options.readiness ?? { ok: true }),
    install: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }
      return options.outcome ?? { kind: "done", command: `${options.id} install` };
    }),
  };
}
