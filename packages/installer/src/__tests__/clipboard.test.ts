import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const spawn = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn }));

import { copyToClipboard } from "../clipboard";

// A minimal fake child process: exposes a stdin whose end() records the written
// text, and drives the exit/error events the module listens for.
function fakeChild(behavior: { code?: number; error?: boolean }) {
  const child = new EventEmitter() as any;
  const stdin = new EventEmitter() as any;
  stdin.end = vi.fn();
  child.stdin = stdin;

  queueMicrotask(() => {
    if (behavior.error) {
      child.emit("error", new Error("ENOENT"));
      return;
    }
    child.emit("exit", behavior.code ?? 0);
  });

  return child;
}

afterEach(() => {
  spawn.mockReset();
});

describe("copyToClipboard", () => {
  it("uses pbcopy on macOS and writes the text to stdin", async () => {
    const child = fakeChild({ code: 0 });
    spawn.mockReturnValue(child);

    const ok = await copyToClipboard("hello", "darwin");

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith("pbcopy", []);
    expect(child.stdin.end).toHaveBeenCalledWith("hello");
  });

  it("uses clip on Windows", async () => {
    spawn.mockImplementation(() => fakeChild({ code: 0 }));

    const ok = await copyToClipboard("hello", "win32");

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith("clip", []);
  });

  it("falls through Linux tools until one succeeds", async () => {
    const behaviors = [{ error: true }, { code: 0 }]; // wl-copy missing, xclip works
    spawn.mockImplementation(() => fakeChild(behaviors.shift()!));

    const ok = await copyToClipboard("hello", "linux");

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenNthCalledWith(1, "wl-copy", []);
    expect(spawn).toHaveBeenNthCalledWith(2, "xclip", ["-selection", "clipboard"]);
  });

  it("returns false when every tool is unavailable", async () => {
    spawn.mockImplementation(() => fakeChild({ error: true }));

    const ok = await copyToClipboard("hello", "linux");

    expect(ok).toBe(false);
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  it("returns false when the tool exits non-zero", async () => {
    spawn.mockReturnValue(fakeChild({ code: 1 }));

    const ok = await copyToClipboard("hello", "darwin");

    expect(ok).toBe(false);
  });
});
