import { join } from "node:path";
import { getNodeValue, parseTree } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import type { ShellResult } from "../system";
import { createClaude } from "../harnesses/claude";
import { createCodex } from "../harnesses/codex";
import { createCursor } from "../harnesses/cursor";
import { createGrok } from "../harnesses/grok";
import { createOpenCode } from "../harnesses/opencode";
import { createOpenCode2 } from "../harnesses/opencode2";
import type { Harness } from "../harnesses/types";
import { fakeSystem } from "./fake-system";

const ok: ShellResult = { ok: true };
const notFound: ShellResult = { ok: false, message: "not found" };

// JSON fixtures matching each CLI's `plugin list --json` shape.
const claudeList = (ids: string[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify(ids.map((id) => ({ id }))),
});

const codexList = (pluginIds: string[]): ShellResult => ({
  ok: true,
  stdout: JSON.stringify({ installed: pluginIds.map((pluginId) => ({ pluginId })) }),
});

const grokList = (
  plugins: { name: string; source: string; marketplace?: string | null }[],
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

  it("removes the copy installed from our own marketplace", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? claudeList(["sentry@sentry-plugin-marketplace"]) : ok),
    });
    const removed = await createClaude(system).cleanup!();

    expect(system.run).toHaveBeenCalledWith(
      "claude plugin uninstall sentry@sentry-plugin-marketplace",
    );
    expect(removed).toContain("sentry@sentry-plugin-marketplace");
  });

  it("leaves cleanup a no-op when only the official plugin is installed", async () => {
    const system = fakeSystem({
      run: (cmd) => (isList(cmd) ? claudeList(["sentry@claude-plugins-official"]) : ok),
    });

    expect(await createClaude(system).cleanup!()).toBeNull();
    expect(system.run).not.toHaveBeenCalledWith(expect.stringContaining("uninstall"));
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

interface OpenCodeHarnessCase {
  label: string;
  binary: string;
  repository: string;
  mcpCommand: string;
  mcpConfigPath: string[];
  configWithIncompatibleMcp: string;
  incompatibleMcpConfigPath: string[];
  marker: string;
  incompatibleMarker: string;
  create: (system: ReturnType<typeof fakeSystem>) => Harness;
}

function testOpenCodeHarness(testCase: OpenCodeHarnessCase) {
  describe(`${testCase.label} harness`, () => {
    const target = "/home/user/.config/opencode/skills/sentry";
    const marker = `${target}/${testCase.marker}`;
    const incompatibleMarker = `${target}/${testCase.incompatibleMarker}`;
    const configPath = "/home/user/.config/opencode/opencode.jsonc";

    it(`detects when the ${testCase.binary} binary is on PATH`, async () => {
      const system = fakeSystem({
        run: (command) => (command === `which ${testCase.binary}` ? ok : notFound),
      });
      expect(await testCase.create(system).detect()).toBe(true);
    });

    it(`does not detect when ${testCase.binary} is missing`, async () => {
      const harness = testCase.create(fakeSystem({ run: () => notFound }));
      expect(await harness.detect()).toBe(false);
    });

    it("reports installed when the shared bundle directory exists", async () => {
      const harness = testCase.create(
        fakeSystem({ homedir: "/home/user", existing: [target, marker] }),
      );
      expect(await harness.isInstalled()).toBe(true);
    });

    it("reports not installed when the shared bundle directory is absent", async () => {
      const harness = testCase.create(fakeSystem({ homedir: "/home/user" }));
      expect(await harness.isInstalled()).toBe(false);
    });

    it("reports the other OpenCode version's shared bundle as installed", async () => {
      const harness = testCase.create(
        fakeSystem({ homedir: "/home/user", existing: [target, incompatibleMarker] }),
      );
      expect(await harness.isInstalled()).toBe(true);
    });

    it("removes an incompatible bundle before installation", async () => {
      const system = fakeSystem({
        homedir: "/home/user",
        existing: [target, incompatibleMarker],
      });
      const cleaned = await testCase.create(system).cleanup!();

      expect(cleaned).toBe("Removed the incompatible Sentry OpenCode bundle");
      expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
    });

    it("reports both incompatible bundle and MCP cleanup when both occur", async () => {
      const system = fakeSystem({
        homedir: "/home/user",
        existing: [target, incompatibleMarker],
        files: { [configPath]: testCase.configWithIncompatibleMcp },
      });
      const cleaned = await testCase.create(system).cleanup!();

      expect(cleaned).toBe("Removed the incompatible Sentry OpenCode bundle and MCP configuration");
    });

    it("preserves MCP configuration when incompatible bundle removal fails", async () => {
      const system = fakeSystem({
        homedir: "/home/user",
        existing: [target, incompatibleMarker],
        files: { [configPath]: testCase.configWithIncompatibleMcp },
        run: () => ({ ok: false, stderr: "bundle is locked" }),
      });

      await expect(testCase.create(system).cleanup!()).rejects.toThrow("bundle is locked");
      expect(system.writeTextFile).not.toHaveBeenCalled();
    });

    it("leaves its own bundle untouched during cleanup", async () => {
      const system = fakeSystem({ homedir: "/home/user", existing: [target, marker] });
      expect(await testCase.create(system).cleanup!()).toBeNull();
      expect(system.run).not.toHaveBeenCalledWith(`rm -rf "${target}"`);
    });

    it("removes an unmarked partial installation before cloning", async () => {
      const system = fakeSystem({ homedir: "/home/user", existing: [target] });
      const cleaned = await testCase.create(system).cleanup!();

      expect(cleaned).toContain("partial");
      expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
    });

    it("removes the incompatible MCP shape while preserving JSONC", async () => {
      const system = fakeSystem({
        homedir: "/home/user",
        files: { [configPath]: testCase.configWithIncompatibleMcp },
      });
      const cleaned = await testCase.create(system).cleanup!();

      expect(cleaned).toContain("MCP");
      expect(system.writeTextFile).toHaveBeenCalledOnce();
      const written = (system.writeTextFile as any).mock.calls[0][1] as string;
      expect(written).toContain("// keep this comment");
      expect(getNodeValue(parseTree(written)!)).not.toHaveProperty(
        testCase.incompatibleMcpConfigPath.join("."),
      );
    });

    it("requires git to install", async () => {
      const unavailable = testCase.create(fakeSystem({ run: () => notFound }));
      expect((await unavailable.canInstall()).ok).toBe(false);

      const available = testCase.create(
        fakeSystem({ run: (command) => (command === "which git" ? ok : notFound) }),
      );
      expect(await available.canInstall()).toEqual({ ok: true });
    });

    it("clones the bundle and configures the native MCP shape", async () => {
      const system = fakeSystem({ homedir: "/home/user" });
      const outcome = await testCase.create(system).install();

      expect(outcome).toMatchObject({
        kind: "done",
        command: `git clone ${testCase.repository} "${target}"`,
      });
      expect(system.run).toHaveBeenCalledWith('mkdir -p "/home/user/.config/opencode/skills"');
      expect(system.run).toHaveBeenCalledWith(`git clone ${testCase.repository} "${target}"`);
      expect(system.run).toHaveBeenCalledWith(
        `${testCase.mcpCommand} "https://mcp.sentry.dev/mcp?utm_source=plugin"`,
      );
    });

    it("recovers from a partial directory when install is called directly", async () => {
      const system = fakeSystem({ homedir: "/home/user", existing: [target] });
      await testCase.create(system).install();

      expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
      expect(system.run).toHaveBeenCalledWith(`git clone ${testCase.repository} "${target}"`);
    });

    it("replaces the other version's bundle instead of pulling it", async () => {
      const system = fakeSystem({
        homedir: "/home/user",
        existing: [target, incompatibleMarker],
      });
      const outcome = await testCase.create(system).update();

      expect(outcome).toMatchObject({
        kind: "done",
        command: `git clone ${testCase.repository} "${target}"`,
      });
      expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
      expect(system.run).not.toHaveBeenCalledWith(`git -C "${target}" pull`);
    });

    it("pulls the bundle and restores MCP configuration on update", async () => {
      const system = fakeSystem({ homedir: "/home/user", existing: [target, marker] });
      const outcome = await testCase.create(system).update();

      expect(outcome).toMatchObject({ kind: "done", command: `git -C "${target}" pull` });
      expect(system.run).toHaveBeenCalledWith(`git -C "${target}" pull`);
      expect(system.run).toHaveBeenCalledWith(
        `${testCase.mcpCommand} "https://mcp.sentry.dev/mcp?utm_source=plugin"`,
      );
    });

    it("removes the bundle and both possible MCP entries", async () => {
      const config =
        '{\n  // keep this comment\n  "mcp": {\n    "sentry": { "type": "remote" },\n    "servers": {\n      "sentry": { "type": "remote" },\n      "other": { "type": "remote" }\n    }\n  }\n}';
      const system = fakeSystem({
        homedir: "/home/user",
        existing: [target, marker],
        files: { [configPath]: config },
      });
      const outcome = await testCase.create(system).remove();

      expect(outcome).toEqual({ kind: "done", command: `rm -rf "${target}"` });
      const written = (system.writeTextFile as any).mock.calls[0][1] as string;
      expect(written).toContain("// keep this comment");
      expect(getNodeValue(parseTree(written)!)).not.toHaveProperty("mcp.sentry");
      expect(getNodeValue(parseTree(written)!)).not.toHaveProperty("mcp.servers.sentry");
      expect(getNodeValue(parseTree(written)!)).toHaveProperty("mcp.servers.other");
    });

    it("uses native directory commands on Windows", async () => {
      const homedir = "C:\\Users\\user";
      const windowsTarget = join(homedir, ".config", "opencode", "skills", "sentry");
      const parent = join(homedir, ".config", "opencode", "skills");
      const system = fakeSystem({ homedir, platform: "win32" });
      const harness = testCase.create(system);

      await harness.install();
      expect(system.run).toHaveBeenCalledWith(`if not exist "${parent}" mkdir "${parent}"`);

      await harness.remove();
      expect(system.run).toHaveBeenCalledWith(`rmdir /s /q "${windowsTarget}"`);
    });

    it("forwards the output sink to every install command", async () => {
      const system = fakeSystem({ homedir: "/home/user" });
      const sink = {} as NodeJS.WritableStream;
      await testCase.create(system).install(sink);

      expect(system.run).toHaveBeenCalledWith(`git clone ${testCase.repository} "${target}"`, sink);
      expect(system.run).toHaveBeenCalledWith(
        `${testCase.mcpCommand} "https://mcp.sentry.dev/mcp?utm_source=plugin"`,
        sink,
      );
    });
  });
}

testOpenCodeHarness({
  label: "OpenCode V1",
  binary: "opencode",
  repository: "https://github.com/getsentry/plugin-opencode.git",
  mcpCommand: "opencode mcp add sentry --url",
  mcpConfigPath: ["mcp", "sentry"],
  configWithIncompatibleMcp:
    '{\n  // keep this comment\n  "mcp": {\n    "servers": {\n      "sentry": { "type": "remote" }\n    }\n  }\n}',
  incompatibleMcpConfigPath: ["mcp", "servers", "sentry"],
  marker: ".sentry-opencode-v1",
  incompatibleMarker: ".sentry-opencode-v2",
  create: createOpenCode,
});

testOpenCodeHarness({
  label: "OpenCode V2",
  binary: "opencode2",
  repository: "https://github.com/getsentry/plugin-opencode2.git",
  mcpCommand: "opencode2 mcp add sentry --global --url",
  mcpConfigPath: ["mcp", "servers", "sentry"],
  configWithIncompatibleMcp:
    '{\n  // keep this comment\n  "mcp": {\n    "sentry": { "type": "remote" }\n  }\n}',
  incompatibleMcpConfigPath: ["mcp", "sentry"],
  marker: ".sentry-opencode-v2",
  incompatibleMarker: ".sentry-opencode-v1",
  create: createOpenCode2,
});

describe("OpenCode version precedence", () => {
  it("prefers V2 when both explicit binaries are installed", async () => {
    const system = fakeSystem({ run: () => ok });
    expect(await createOpenCode(system).detect()).toBe(false);
    expect(await createOpenCode2(system).detect()).toBe(true);
  });

  it("lets the preferred V2 harness remove a V1 bundle", async () => {
    const target = "/home/user/.config/opencode/skills/sentry";
    const system = fakeSystem({
      homedir: "/home/user",
      run: () => ok,
      existing: [target, `${target}/.sentry-opencode-v1`],
    });
    const v2 = createOpenCode2(system);

    expect(await createOpenCode(system).detect()).toBe(false);
    expect(await v2.detect()).toBe(true);
    expect(await v2.isInstalled()).toBe(true);
    await v2.remove();
    expect(system.run).toHaveBeenCalledWith(`rm -rf "${target}"`);
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

  it("clones the plugin repo on install", async () => {
    const system = fakeSystem({ homedir: "/home/user" });
    const outcome = await createCursor(system).install();

    expect(outcome.kind).toBe("done");
    expect(system.run).toHaveBeenCalledWith(
      'git clone https://github.com/getsentry/plugin-cursor.git "/home/user/.cursor/plugins/local/sentry"',
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
