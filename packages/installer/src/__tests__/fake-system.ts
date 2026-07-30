import { vi } from "vitest";
import type { ShellResult, SystemDeps } from "../system";

export interface FakeSystemOptions {
  run?: (command: string) => ShellResult;
  existing?: string[];
  files?: Record<string, string>;
  platform?: NodeJS.Platform;
  homedir?: string;
}

export function fakeSystem(options: FakeSystemOptions = {}): SystemDeps {
  const files = new Map(Object.entries(options.files ?? {}));
  const existing = new Set([...(options.existing ?? []), ...files.keys()]);
  const run = options.run ?? (() => ({ ok: true }));

  return {
    run: vi.fn(async (command: string) => run(command)),
    exists: vi.fn((path: string) => existing.has(path)),
    readTextFile: vi.fn((path: string) => {
      const contents = files.get(path);
      if (contents === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return contents;
    }),
    writeTextFile: vi.fn((path: string, contents: string) => {
      files.set(path, contents);
      existing.add(path);
    }),
    platform: options.platform ?? "linux",
    homedir: options.homedir ?? "/home/user",
  };
}
