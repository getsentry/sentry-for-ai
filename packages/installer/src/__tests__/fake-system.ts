import { vi } from "vitest";
import type { ShellResult, SystemDeps } from "../system";

export interface FakeSystemOptions {
  run?: (command: string) => ShellResult;
  existing?: string[];
  platform?: NodeJS.Platform;
  homedir?: string;
}

export function fakeSystem(options: FakeSystemOptions = {}): SystemDeps {
  const existing = new Set(options.existing ?? []);
  const run = options.run ?? (() => ({ ok: true }));

  return {
    run: vi.fn(async (command: string) => run(command)),
    exists: vi.fn((path: string) => existing.has(path)),
    platform: options.platform ?? "linux",
    homedir: options.homedir ?? "/home/user",
  };
}
