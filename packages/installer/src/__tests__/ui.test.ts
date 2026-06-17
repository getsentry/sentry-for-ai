import { describe, expect, it, vi } from "vitest";
import { runInstaller } from "../ui";
import { fakeHarness } from "./fake-harness";

// These cover the non-interactive path, which skips the prompt and installs
// every detected agent. The interactive selector is exercised manually.
describe("runInstaller (non-interactive)", () => {
  it("installs every detected agent and leaves the rest alone", async () => {
    const claude = fakeHarness({ id: "claude", detected: true });
    const codex = fakeHarness({ id: "codex", detected: false });
    const grok = fakeHarness({ id: "grok", detected: true });

    const ok = await runInstaller([claude, codex, grok], { interactive: false });

    expect(ok).toBe(true);
    expect(claude.install).toHaveBeenCalledOnce();
    expect(grok.install).toHaveBeenCalledOnce();
    expect(codex.install).not.toHaveBeenCalled();
  });

  it("runs cleanup before installing a detected agent", async () => {
    const codex = fakeHarness({
      id: "codex",
      detected: true,
      cleaned: "Removed conflicting plugin sentry@openai-curated",
    });

    const ok = await runInstaller([codex], { interactive: false });

    expect(ok).toBe(true);
    expect(codex.cleanup).toHaveBeenCalledOnce();
    expect(codex.install).toHaveBeenCalledOnce();
  });

  it("closes by naming the agents to restart", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const claude = fakeHarness({ id: "claude", name: "Claude Code", detected: true });
    const grok = fakeHarness({ id: "grok", name: "Grok", detected: true });

    await runInstaller([claude, grok], { interactive: false });

    expect(log).toHaveBeenCalledWith("\nRestart Claude Code and Grok to use Sentry with AI.");
    log.mockRestore();
  });

  it("omits the restart hint when nothing was installed", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const claude = fakeHarness({ id: "claude", detected: false });

    await runInstaller([claude], { interactive: false });

    expect(log).not.toHaveBeenCalledWith(expect.stringContaining("Restart"));
    log.mockRestore();
  });

  it("returns false when an install fails but still installs the others", async () => {
    const claude = fakeHarness({ id: "claude", detected: true, error: new Error("boom") });
    const codex = fakeHarness({ id: "codex", detected: true });

    const ok = await runInstaller([claude, codex], { interactive: false });

    expect(ok).toBe(false);
    expect(codex.install).toHaveBeenCalledOnce();
  });

  it("returns false when a prerequisite blocks an install", async () => {
    const cursor = fakeHarness({
      id: "cursor",
      detected: true,
      readiness: { ok: false, reason: "git is required" },
    });
    const codex = fakeHarness({ id: "codex", detected: true });

    const ok = await runInstaller([cursor, codex], { interactive: false });

    expect(ok).toBe(false);
    expect(cursor.install).not.toHaveBeenCalled();
    expect(codex.install).toHaveBeenCalledOnce();
  });

  it("succeeds without installing anything when nothing is detected", async () => {
    const claude = fakeHarness({ id: "claude", detected: false });

    const ok = await runInstaller([claude], { interactive: false });

    expect(ok).toBe(true);
    expect(claude.install).not.toHaveBeenCalled();
  });

  it("runs installs concurrently rather than one after another", async () => {
    let active = 0;
    let peak = 0;
    const slowInstall = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { kind: "done" as const, command: "ok" };
    });

    const harnesses = ["a", "b", "c"].map((id) => {
      const harness = fakeHarness({ id, detected: true });
      harness.install = slowInstall;
      return harness;
    });

    const ok = await runInstaller(harnesses, { interactive: false });

    expect(ok).toBe(true);
    expect(peak).toBeGreaterThan(1);
  });
});
