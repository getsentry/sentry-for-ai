import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ShellResult } from "../system";
import { createClaude } from "../harnesses/claude";
import { createCodex } from "../harnesses/codex";
import { createCursor } from "../harnesses/cursor";
import { createGrok } from "../harnesses/grok";
import { fakeSystem } from "./fake-system";

const ok: ShellResult = { ok: true };
const notFound: ShellResult = { ok: false, message: "not found" };

describe("claude harness", () => {
  it("detects when the claude binary is on PATH", async () => {
    const harness = createClaude(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect when which fails", async () => {
    const harness = createClaude(fakeSystem({ run: () => notFound }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when plugin list includes sentry", async () => {
    const harness = createClaude(fakeSystem({ run: () => ({ ok: true, stdout: "sentry" }) }));
    expect(await harness.isInstalled()).toBe(true);
  });

  it("reports not installed when plugin list does not include sentry", async () => {
    const harness = createClaude(fakeSystem({ run: () => ({ ok: true, stdout: "other-plugin" }) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("is always ready to install", async () => {
    const harness = createClaude(fakeSystem({ run: () => ok }));
    expect(await harness.canInstall()).toEqual({ ok: true });
  });

  it("installs by running the marketplace install command", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createClaude(system).install();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "claude plugin install sentry@claude-plugins-official",
    });
    expect(system.run).toHaveBeenCalledWith("claude plugin install sentry@claude-plugins-official");
  });

  it("adds the official marketplace when it is not registered", async () => {
    const system = fakeSystem({
      run: (cmd) => (cmd.includes("marketplace list") ? { ok: true, stdout: "" } : ok),
    });
    await createClaude(system).install();
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin marketplace add anthropics/claude-plugins-official",
    );
  });

  it("refreshes the marketplace when it is already registered", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        cmd.includes("marketplace list") ? { ok: true, stdout: "claude-plugins-official" } : ok,
    });
    await createClaude(system).install();
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin marketplace update claude-plugins-official",
    );
  });

  it("updates in place when the plugin is already present", async () => {
    const system = fakeSystem({
      run: () => ({ ok: true, stdout: "sentry@claude-plugins-official" }),
    });
    const outcome = await createClaude(system).install();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "claude plugin update sentry@claude-plugins-official",
    });
    expect(system.run).toHaveBeenCalledWith("claude plugin update sentry@claude-plugins-official");
  });

  it("surfaces stderr when install fails", async () => {
    const harness = createClaude(
      fakeSystem({ run: () => ({ ok: false, stderr: "boom", message: "exit 1" }) }),
    );
    await expect(harness.install()).rejects.toThrow("boom");
  });

  it("falls back to the error message when stderr is empty", async () => {
    const harness = createClaude(fakeSystem({ run: () => ({ ok: false, message: "exit 1" }) }));
    await expect(harness.install()).rejects.toThrow("exit 1");
  });
});

describe("codex harness", () => {
  it("detects via which", async () => {
    const harness = createCodex(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect when which fails", async () => {
    const harness = createCodex(fakeSystem({ run: () => notFound }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when plugin list includes sentry", async () => {
    const harness = createCodex(fakeSystem({ run: () => ({ ok: true, stdout: "sentry" }) }));
    expect(await harness.isInstalled()).toBe(true);
  });

  it("reports not installed when plugin list does not include sentry", async () => {
    const harness = createCodex(fakeSystem({ run: () => ({ ok: true, stdout: "other-plugin" }) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("installs the plugin from its marketplace", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createCodex(system).install();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "codex plugin add sentry@sentry-plugin-marketplace",
    });
    expect(system.run).toHaveBeenCalledWith("codex plugin add sentry@sentry-plugin-marketplace");
  });

  it("adds the marketplace when it is not registered", async () => {
    const system = fakeSystem({
      run: (cmd) => (cmd.includes("marketplace list") ? { ok: true, stdout: "" } : ok),
    });
    await createCodex(system).install();
    expect(system.run).toHaveBeenCalledWith("codex plugin marketplace add getsentry/plugin-codex");
  });

  it("refreshes the marketplace when it is already registered", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        cmd.includes("marketplace list") ? { ok: true, stdout: "sentry-plugin-marketplace" } : ok,
    });
    await createCodex(system).install();
    expect(system.run).toHaveBeenCalledWith(
      "codex plugin marketplace upgrade sentry-plugin-marketplace",
    );
  });

  it("throws when the install fails", async () => {
    const harness = createCodex(fakeSystem({ run: () => ({ ok: false, stderr: "nope" }) }));
    await expect(harness.install()).rejects.toThrow("nope");
  });
});

describe("grok harness", () => {
  it("detects via which", async () => {
    const harness = createGrok(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect when which fails", async () => {
    const harness = createGrok(fakeSystem({ run: () => notFound }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when plugin list includes sentry", async () => {
    const harness = createGrok(fakeSystem({ run: () => ({ ok: true, stdout: "sentry" }) }));
    expect(await harness.isInstalled()).toBe(true);
  });

  it("reports not installed when plugin list does not include sentry", async () => {
    const harness = createGrok(fakeSystem({ run: () => ({ ok: true, stdout: "other-plugin" }) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("installs with the --trust flag when not yet present", async () => {
    const system = fakeSystem({ run: () => ok });
    await createGrok(system).install();
    expect(system.run).toHaveBeenCalledWith("grok plugin install getsentry/plugin-grok --trust");
  });

  it("updates in place when the plugin is already present", async () => {
    const system = fakeSystem({ run: () => ({ ok: true, stdout: "plugin-grok-x: sentry" }) });
    const outcome = await createGrok(system).install();

    expect(outcome).toMatchObject({ kind: "done", command: "grok plugin update sentry" });
    expect(system.run).toHaveBeenCalledWith("grok plugin update sentry");
  });

  it("throws when the install fails", async () => {
    const harness = createGrok(fakeSystem({ run: () => ({ ok: false, stderr: "nope" }) }));
    await expect(harness.install()).rejects.toThrow("nope");
  });
});

describe("cursor harness", () => {
  it("detects when the cursor binary is on PATH", async () => {
    const harness = createCursor(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("uses where instead of which on Windows to detect the binary", async () => {
    const system = fakeSystem({ run: () => ok, platform: "win32" });
    await createCursor(system).detect();
    expect(system.run).toHaveBeenCalledWith("where cursor");
  });

  it("detects via the macOS app bundle when the binary is missing", async () => {
    const harness = createCursor(
      fakeSystem({
        run: () => notFound,
        platform: "darwin",
        existing: ["/Applications/Cursor.app"],
      }),
    );
    expect(await harness.detect()).toBe(true);
  });

  it("detects via the Windows install location when the binary is missing", async () => {
    const homedir = "C:\\Users\\user";
    // Derive via join so the expectation matches regardless of host OS separator.
    const exe = join(homedir, "AppData", "Local", "Programs", "cursor", "Cursor.exe");
    const harness = createCursor(
      fakeSystem({ run: () => notFound, platform: "win32", homedir, existing: [exe] }),
    );
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect the app bundle on Linux (relies on PATH)", async () => {
    const harness = createCursor(
      fakeSystem({
        run: () => notFound,
        platform: "linux",
        existing: ["/Applications/Cursor.app"],
      }),
    );
    expect(await harness.detect()).toBe(false);
  });

  it("does not detect when neither binary nor app bundle exists", async () => {
    const harness = createCursor(fakeSystem({ run: () => notFound, platform: "darwin" }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when the plugin directory exists", async () => {
    const target = "/home/user/.cursor/plugins/local/sentry";
    const harness = createCursor(fakeSystem({ homedir: "/home/user", existing: [target] }));
    expect(await harness.isInstalled()).toBe(true);
  });

  it("reports not installed when the plugin directory is absent", async () => {
    const harness = createCursor(fakeSystem({ homedir: "/home/user" }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("can install when git is available", async () => {
    const harness = createCursor(fakeSystem({ run: () => ok }));
    expect(await harness.canInstall()).toEqual({ ok: true });
  });

  it("cannot install when git is missing", async () => {
    const harness = createCursor(fakeSystem({ run: () => notFound }));
    const readiness = await harness.canInstall();

    expect(readiness.ok).toBe(false);
    if (!readiness.ok) {
      expect(readiness.reason).toContain("git");
    }
  });

  it("clones the plugin repo when the target directory does not exist", async () => {
    const system = fakeSystem({ homedir: "/home/user" });
    const outcome = await createCursor(system).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      'git clone https://github.com/getsentry/plugin-cursor.git "/home/user/.cursor/plugins/local/sentry"',
    );
  });

  it("pulls when the target directory already exists", async () => {
    const target = "/home/user/.cursor/plugins/local/sentry";
    const system = fakeSystem({ homedir: "/home/user", existing: [target] });
    const outcome = await createCursor(system).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(`git -C "${target}" pull`);
  });

  it("includes a restart note in the done outcome", async () => {
    const system = fakeSystem({ homedir: "/home/user" });
    const outcome = await createCursor(system).install();

    expect(outcome.kind).toBe("done");
    if (outcome.kind === "done") {
      expect(outcome.note).toContain("Restart Cursor");
    }
  });
});
