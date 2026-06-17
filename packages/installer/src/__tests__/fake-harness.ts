import { vi } from "vitest";
import type { Harness, InstallOutcome, InstallReadiness } from "../harnesses/types";

export interface FakeHarnessOptions {
  id: string;
  name?: string;
  detected?: boolean;
  installed?: boolean;
  readiness?: InstallReadiness;
  outcome?: InstallOutcome;
  updateOutcome?: InstallOutcome;
  error?: Error;
  // When set, the harness exposes a cleanup spy resolving to this description so
  // tests can assert it runs (and that it runs before install/update). Pass an
  // empty string to model a cleanup that found nothing.
  cleaned?: string;
}

export function fakeHarness(options: FakeHarnessOptions): Harness {
  const harness: Harness = {
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
    update: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }
      return options.updateOutcome ?? { kind: "done", command: `${options.id} update` };
    }),
  };

  if (options.cleaned !== undefined) {
    harness.cleanup = vi.fn(async () => options.cleaned || null);
  }

  return harness;
}
