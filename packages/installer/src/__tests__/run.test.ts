import { describe, expect, it } from "vitest";
import { detectHarnesses, installHarness, installSucceeded } from "../run";
import { fakeHarness } from "./fake-harness";

describe("detectHarnesses", () => {
  it("surfaces detected and installed state for each harness", async () => {
    const claude = fakeHarness({ id: "claude", detected: true, installed: true });
    const codex = fakeHarness({ id: "codex", detected: true, installed: false });
    const grok = fakeHarness({ id: "grok", detected: false });

    const detections = await detectHarnesses([claude, codex, grok]);

    expect(detections).toEqual([
      { harness: claude, detected: true, installed: true },
      { harness: codex, detected: true, installed: false },
      { harness: grok, detected: false, installed: false },
    ]);
  });

  it("skips the installed probe when a harness is not detected", async () => {
    const grok = fakeHarness({ id: "grok", detected: false });

    await detectHarnesses([grok]);

    expect(grok.detect).toHaveBeenCalledOnce();
    expect(grok.isInstalled).not.toHaveBeenCalled();
  });
});

describe("installHarness", () => {
  it("returns a done result with the executed command", async () => {
    const claude = fakeHarness({ id: "claude" });

    const result = await installHarness({ harness: claude, detected: true, installed: false });

    expect(result).toEqual({ kind: "done", command: "claude install", note: undefined });
    expect(claude.install).toHaveBeenCalledOnce();
  });

  it("passes the note through on a done outcome", async () => {
    const cursor = fakeHarness({
      id: "cursor",
      outcome: { kind: "done", command: "git clone", note: "Restart Cursor to activate." },
    });

    const result = await installHarness({ harness: cursor, detected: true, installed: false });

    expect(result).toEqual({
      kind: "done",
      command: "git clone",
      note: "Restart Cursor to activate.",
    });
  });

  it("passes through a manual outcome", async () => {
    const cursor = fakeHarness({
      id: "cursor",
      outcome: { kind: "manual", instructions: "do it by hand" },
    });

    const result = await installHarness({ harness: cursor, detected: true, installed: false });

    expect(result).toEqual({ kind: "manual", instructions: "do it by hand" });
  });

  it("blocks before install when a prerequisite is missing", async () => {
    const cursor = fakeHarness({
      id: "cursor",
      readiness: { ok: false, reason: "git is required" },
    });

    const result = await installHarness({ harness: cursor, detected: true, installed: false });

    expect(result).toEqual({ kind: "blocked", reason: "git is required" });
    expect(cursor.install).not.toHaveBeenCalled();
  });

  it("captures a thrown install as a failed result", async () => {
    const claude = fakeHarness({ id: "claude", error: new Error("boom") });

    const result = await installHarness({ harness: claude, detected: true, installed: false });

    expect(result).toEqual({ kind: "failed", message: "boom" });
  });
});

describe("installSucceeded", () => {
  it("treats done and manual as success, blocked and failed as failure", () => {
    expect(installSucceeded({ kind: "done", command: "x" })).toBe(true);
    expect(installSucceeded({ kind: "manual", instructions: "x" })).toBe(true);
    expect(installSucceeded({ kind: "blocked", reason: "x" })).toBe(false);
    expect(installSucceeded({ kind: "failed", message: "x" })).toBe(false);
  });
});
