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

// JSON fixtures matching each CLI's `plugin list --json` shape.
const claudeList = (ids: string[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify(ids.map((id) => ({ id }))),
});

// Entries may carry a version, which is what distinguishes a develop build from
// a release for the harnesses whose plugin id is the same on both channels.
const codexList = (plugins: (string | { pluginId: string; version: string })[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify({
    installed: plugins.map((p) => (typeof p === "string" ? { pluginId: p } : p)),
  }),
});

const grokList = (
  plugins: { name: string; source: string; marketplace?: string | null; version?: string }[],
): ShellResult => ({
  ok: true,
  stdout: JSON.stringify(plugins.map((p) => ({ marketplace: null, ...p }))),
});

const isList = (cmd: string) => cmd.includes("plugin list --json");

// `marketplace list --json` fixtures: Claude emits a flat array, Codex wraps it.
const claudeMarketplaces = (names: string[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify(names.map((name) => ({ name }))),
});

const codexMarketplaces = (names: string[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify({ marketplaces: names.map((name) => ({ name })) }),
});

describe("claude harness", () => {
  it("detects when the claude binary is on PATH", async () => {
    const harness = createClaude(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect when which fails", async () => {
    const harness = createClaude(fakeSystem({ run: () => notFound }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when the listing includes our plugin id", async () => {
    const harness = createClaude(
      fakeSystem({ run: () => claudeList(["sentry@claude-plugins-official"]) }),
    );
    expect(await harness.isInstalled()).toBe(true);
  });

  it("reports not installed when the listing lacks our plugin id", async () => {
    const harness = createClaude(fakeSystem({ run: () => claudeList(["other@somewhere"]) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("reports not installed when the listing is not valid json", async () => {
    const harness = createClaude(fakeSystem({ run: () => ({ ok: true, stdout: "not json" }) }));
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

  it("updates in place via the update command", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createClaude(system).update();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "claude plugin update sentry@claude-plugins-official",
    });
    expect(system.run).toHaveBeenCalledWith("claude plugin update sentry@claude-plugins-official");
  });

  it("adds the official marketplace when it is not registered", async () => {
    const system = fakeSystem({
      run: (cmd) => (cmd.includes("marketplace list") ? claudeMarketplaces([]) : ok),
    });
    await createClaude(system).install();
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin marketplace add anthropics/claude-plugins-official",
    );
  });

  it("refreshes the marketplace when it is already registered", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        cmd.includes("marketplace list") ? claudeMarketplaces(["claude-plugins-official"]) : ok,
    });
    await createClaude(system).update();
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin marketplace update claude-plugins-official",
    );
  });

  it("forwards the output sink to streamed commands", async () => {
    const system = fakeSystem({ run: () => ok });
    const sink = {} as NodeJS.WritableStream;
    await createClaude(system).install(sink);
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin install sentry@claude-plugins-official",
      sink,
    );
  });

  it("removes via the uninstall command, leaving the marketplace registered", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createClaude(system).remove();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "claude plugin uninstall sentry@claude-plugins-official",
    });
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@claude-plugins-official",
    );
    expect(system.run).not.toHaveBeenCalledWith(expect.stringContaining("marketplace remove"));
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

  it("reports installed when the listing includes our plugin id", async () => {
    const harness = createCodex(
      fakeSystem({ run: () => codexList(["sentry@sentry-plugin-marketplace"]) }),
    );
    expect(await harness.isInstalled()).toBe(true);
  });

  it("does not count the legacy openai-curated plugin as ours", async () => {
    const harness = createCodex(fakeSystem({ run: () => codexList(["sentry@openai-curated"]) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("removes the legacy openai-curated plugin when present", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? codexList(["sentry@openai-curated"]) : ok),
    });
    const removed = await createCodex(system).cleanup!();

    expect(system.run).toHaveBeenCalledWith("codex plugin remove sentry@openai-curated");
    expect(removed).toContain("sentry@openai-curated");
  });

  it("leaves cleanup a no-op when the legacy plugin is absent", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? codexList(["sentry@sentry-plugin-marketplace"]) : ok),
    });
    const removed = await createCodex(system).cleanup!();

    expect(removed).toBeNull();
    expect(system.run).not.toHaveBeenCalledWith("codex plugin remove sentry@openai-curated");
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

  it("updates via the same idempotent add command", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createCodex(system).update();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "codex plugin add sentry@sentry-plugin-marketplace",
    });
  });

  it("adds the marketplace when it is not registered", async () => {
    const system = fakeSystem({
      run: (cmd) => (cmd.includes("marketplace list") ? codexMarketplaces([]) : ok),
    });
    await createCodex(system).install();
    expect(system.run).toHaveBeenCalledWith("codex plugin marketplace add getsentry/plugin-codex");
  });

  it("refreshes the marketplace when it is already registered", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        cmd.includes("marketplace list") ? codexMarketplaces(["sentry-plugin-marketplace"]) : ok,
    });
    await createCodex(system).install();
    expect(system.run).toHaveBeenCalledWith(
      "codex plugin marketplace upgrade sentry-plugin-marketplace",
    );
  });

  it("removes our plugin via plugin remove", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createCodex(system).remove();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "codex plugin remove sentry@sentry-plugin-marketplace",
    });
    expect(system.run).toHaveBeenCalledWith("codex plugin remove sentry@sentry-plugin-marketplace");
  });

  it("throws when the install fails", async () => {
    const harness = createCodex(fakeSystem({ run: () => ({ ok: false, stderr: "nope" }) }));
    await expect(harness.install()).rejects.toThrow("nope");
  });
});

describe("grok harness", () => {
  const ourRepo = "https://github.com/getsentry/plugin-grok.git";

  it("detects via which", async () => {
    const harness = createGrok(fakeSystem({ run: () => ok }));
    expect(await harness.detect()).toBe(true);
  });

  it("does not detect when which fails", async () => {
    const harness = createGrok(fakeSystem({ run: () => notFound }));
    expect(await harness.detect()).toBe(false);
  });

  it("reports installed when sentry is present from our repo with no marketplace", async () => {
    const harness = createGrok(
      fakeSystem({ run: () => grokList([{ name: "sentry", source: ourRepo }]) }),
    );
    expect(await harness.isInstalled()).toBe(true);
  });

  it("does not count a marketplace-installed sentry as ours", async () => {
    const harness = createGrok(
      fakeSystem({
        run: () => grokList([{ name: "sentry", source: ourRepo, marketplace: "xAI Official" }]),
      }),
    );
    expect(await harness.isInstalled()).toBe(false);
  });

  it("reports not installed when sentry comes from a different source", async () => {
    const harness = createGrok(
      fakeSystem({
        run: () => grokList([{ name: "sentry", source: "https://github.com/someone/other.git" }]),
      }),
    );
    expect(await harness.isInstalled()).toBe(false);
  });

  it("reports not installed when no sentry plugin is present", async () => {
    const harness = createGrok(fakeSystem({ run: () => grokList([]) }));
    expect(await harness.isInstalled()).toBe(false);
  });

  it("uninstalls a marketplace-installed sentry during cleanup", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? grokList([{ name: "sentry", source: ourRepo, marketplace: "xAI Official" }])
          : ok,
    });
    const removed = await createGrok(system).cleanup!();

    expect(system.run).toHaveBeenCalledWith("grok plugin uninstall sentry");
    expect(removed).toContain("xAI Official");
  });

  it("leaves our own install untouched during cleanup", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? grokList([{ name: "sentry", source: ourRepo }]) : ok),
    });
    const removed = await createGrok(system).cleanup!();

    expect(removed).toBeNull();
    expect(system.run).not.toHaveBeenCalledWith("grok plugin uninstall sentry");
  });

  it("does nothing during cleanup when no sentry plugin is present", async () => {
    const system = fakeSystem({ run: (cmd) => (isList(cmd) ? grokList([]) : ok) });
    const removed = await createGrok(system).cleanup!();

    expect(removed).toBeNull();
    expect(system.run).not.toHaveBeenCalledWith("grok plugin uninstall sentry");
  });

  it("installs with the --trust flag", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createGrok(system).install();

    expect(outcome).toMatchObject({
      kind: "done",
      command: "grok plugin install getsentry/plugin-grok --trust",
    });
    expect(system.run).toHaveBeenCalledWith("grok plugin install getsentry/plugin-grok --trust");
  });

  it("updates in place via the update command", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createGrok(system).update();

    expect(outcome).toMatchObject({ kind: "done", command: "grok plugin update sentry" });
    expect(system.run).toHaveBeenCalledWith("grok plugin update sentry");
  });

  it("removes via the uninstall command", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createGrok(system).remove();

    expect(outcome).toMatchObject({ kind: "done", command: "grok plugin uninstall sentry" });
    expect(system.run).toHaveBeenCalledWith("grok plugin uninstall sentry");
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

  it("reports installed when the checkout is on the stable branch", async () => {
    const target = "/home/user/.cursor/plugins/local/sentry";
    const harness = createCursor(
      fakeSystem({
        homedir: "/home/user",
        existing: [target],
        run: () => ({ ok: true, stdout: "main\n" }),
      }),
    );
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

  it("clones the plugin repo on install", async () => {
    const system = fakeSystem({ homedir: "/home/user" });
    const outcome = await createCursor(system).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      'git clone --branch main https://github.com/getsentry/plugin-cursor.git "/home/user/.cursor/plugins/local/sentry"',
    );
  });

  it("pulls the existing checkout on update", async () => {
    const target = "/home/user/.cursor/plugins/local/sentry";
    const system = fakeSystem({ homedir: "/home/user", existing: [target] });
    const outcome = await createCursor(system).update();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(`git -C "${target}" pull`);
  });

  it("deletes the plugin directory on remove", async () => {
    const target = "/home/user/.cursor/plugins/local/sentry";
    const system = fakeSystem({ homedir: "/home/user", existing: [target] });
    const outcome = await createCursor(system).remove();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
  });

  it("uses the native recursive remove on Windows", async () => {
    const homedir = "C:\\Users\\user";
    const target = join(homedir, ".cursor", "plugins", "local", "sentry");
    const system = fakeSystem({ homedir, platform: "win32" });
    await createCursor(system).remove();

    expect(system.run).toHaveBeenCalledWith(`rmdir /s /q "${target}"`);
  });
});

// The `--develop` channel: every harness installs from the develop ref of our own
// distribution repo, and takes out whatever occupies the same slot on the other
// channel so only one copy of the skills resolves.
describe("develop channel", () => {
  const DEVELOP = { ref: "develop" };
  const CURSOR_DIR = "/home/user/.cursor/plugins/local/sentry";

  const onBranch =
    (branch: string) =>
    (cmd: string): ShellResult =>
      cmd.includes("rev-parse --abbrev-ref") ? { ok: true, stdout: `${branch}\n` } : ok;

  it("claude adds our marketplace pinned to the ref and installs from it", async () => {
    const system = fakeSystem({ run: () => ok });
    const outcome = await createClaude(system, DEVELOP).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin marketplace add getsentry/plugin-claude@develop",
    );
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin install sentry@sentry-plugin-marketplace",
    );
  });

  it("claude removes the official plugin before a develop install", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? claudeList(["sentry@claude-plugins-official"]) : ok),
    });
    const cleaned = await createClaude(system, DEVELOP).cleanup?.();

    expect(cleaned).toContain("sentry@claude-plugins-official");
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@claude-plugins-official",
    );
  });

  it("claude removes the develop plugin when going back to stable", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? claudeList(["sentry@sentry-plugin-marketplace"]) : ok),
    });
    const cleaned = await createClaude(system).cleanup?.();

    expect(cleaned).toContain("sentry@sentry-plugin-marketplace");
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@sentry-plugin-marketplace",
    );
  });

  it("claude does not treat the stable install as a develop install", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? claudeList(["sentry@claude-plugins-official"]) : ok),
    });

    expect(await createClaude(system, DEVELOP).isInstalled()).toBe(false);
    expect(await createClaude(system).isInstalled()).toBe(true);
  });

  it("claude removes both channels under anyChannel", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? claudeList(["sentry@sentry-plugin-marketplace", "sentry@claude-plugins-official"])
          : ok,
    });
    const outcome = await createClaude(system, { anyChannel: true }).remove();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@sentry-plugin-marketplace",
    );
    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@claude-plugins-official",
    );
  });

  it("codex re-points the marketplace at the ref", async () => {
    const system = fakeSystem({ run: (cmd) => (isList(cmd) ? codexList([]) : ok) });
    const outcome = await createCodex(system, DEVELOP).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      "codex plugin marketplace remove sentry-plugin-marketplace",
    );
    expect(system.run).toHaveBeenCalledWith(
      "codex plugin marketplace add getsentry/plugin-codex --ref develop",
    );
  });

  it("codex tells the channels apart by version", async () => {
    const develop = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? codexList([
              { pluginId: "sentry@sentry-plugin-marketplace", version: "1.2.1-dev.4.gabc" },
            ])
          : ok,
    });
    const release = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? codexList([{ pluginId: "sentry@sentry-plugin-marketplace", version: "1.3.0" }])
          : ok,
    });

    expect(await createCodex(develop, DEVELOP).isInstalled()).toBe(true);
    expect(await createCodex(develop).isInstalled()).toBe(false);
    expect(await createCodex(release, DEVELOP).isInstalled()).toBe(false);
    expect(await createCodex(release).isInstalled()).toBe(true);
  });

  it("codex re-points a stable run that finds a develop build", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? codexList([
              { pluginId: "sentry@sentry-plugin-marketplace", version: "1.2.1-dev.4.gabc" },
            ])
          : ok,
    });
    await createCodex(system).install();

    expect(system.run).toHaveBeenCalledWith(
      "codex plugin marketplace remove sentry-plugin-marketplace",
    );
    expect(system.run).toHaveBeenCalledWith("codex plugin marketplace add getsentry/plugin-codex");
  });

  it("grok installs from the ref-pinned source", async () => {
    const system = fakeSystem({ run: (cmd) => (isList(cmd) ? grokList([]) : ok) });
    const outcome = await createGrok(system, DEVELOP).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      "grok plugin install getsentry/plugin-grok@develop --trust",
    );
  });

  it("grok clears a release build out of its single sentry slot", async () => {
    const system = fakeSystem({
      run: (cmd) =>
        isList(cmd)
          ? grokList([
              {
                name: "sentry",
                source: "https://github.com/getsentry/plugin-grok",
                version: "1.3.0",
              },
            ])
          : ok,
    });
    const cleaned = await createGrok(system, DEVELOP).cleanup?.();

    expect(cleaned).toContain("1.3.0");
    expect(system.run).toHaveBeenCalledWith("grok plugin uninstall sentry");
  });

  it("cursor clones the ref and reports the branch as the channel", async () => {
    const system = fakeSystem({ homedir: "/home/user", run: onBranch("develop") });
    const outcome = await createCursor(system, DEVELOP).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      `git clone --branch develop https://github.com/getsentry/plugin-cursor.git "${CURSOR_DIR}"`,
    );
  });

  it("cursor discards a stable checkout when the develop ref is asked for", async () => {
    const system = fakeSystem({
      homedir: "/home/user",
      existing: [CURSOR_DIR],
      run: onBranch("main"),
    });
    const harness = createCursor(system, DEVELOP);

    expect(await harness.isInstalled()).toBe(false);
    expect(await harness.cleanup?.()).toContain("main");
    expect(system.run).toHaveBeenCalledWith(`rm -rf "${CURSOR_DIR}"`);
  });

  it("cursor keeps a checkout already on the requested ref", async () => {
    const system = fakeSystem({
      homedir: "/home/user",
      existing: [CURSOR_DIR],
      run: onBranch("develop"),
    });
    const harness = createCursor(system, DEVELOP);

    expect(await harness.isInstalled()).toBe(true);
    expect(await harness.cleanup?.()).toBeNull();
  });

  it("cursor under anyChannel counts any branch as installed", async () => {
    const system = fakeSystem({
      homedir: "/home/user",
      existing: [CURSOR_DIR],
      run: onBranch("develop"),
    });

    expect(await createCursor(system, { anyChannel: true }).isInstalled()).toBe(true);
  });
});
