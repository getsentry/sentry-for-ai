import { checkbox, confirm } from "@inquirer/prompts";
import { color, Listr } from "listr2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "../clipboard";
import { runInstaller } from "../ui";
import { fakeHarness } from "./fake-harness";

vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("../clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

describe("runInstaller interactive prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkbox).mockResolvedValue(["claude"]);
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(copyToClipboard).mockResolvedValue(true);
  });

  it("offers to copy a prompt built from the install instruction", async () => {
    const claude = fakeHarness({ id: "claude", detected: true });

    const ok = await runInstaller([claude], { instruction: "Setup logging" });

    expect(ok).toBe(true);
    expect(copyToClipboard).toHaveBeenCalledWith(
      "The Sentry plugin has just been installed. Setup logging",
    );
  });

  it("offers successful installs with authentication support", async () => {
    vi.mocked(checkbox).mockResolvedValueOnce(["claude", "grok"]).mockResolvedValueOnce(["claude"]);
    const claude = fakeHarness({ id: "claude", detected: true, authenticates: true });
    const grok = fakeHarness({ id: "grok", detected: true });

    const ok = await runInstaller([claude, grok]);

    expect(ok).toBe(true);
    expect(claude.authenticate).toHaveBeenCalledOnce();
    expect(claude.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ write: expect.any(Function) }),
    );
    expect(checkbox).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select agents to authenticate the Sentry MCP for",
        choices: [expect.objectContaining({ value: "claude" })],
      }),
      expect.anything(),
    );
  });

  it("reports failure when selected authentication fails", async () => {
    vi.mocked(checkbox).mockResolvedValue(["codex"]);
    const codex = fakeHarness({
      id: "codex",
      detected: true,
      authenticates: true,
      authenticationError: new Error("OAuth cancelled"),
    });

    const ok = await runInstaller([codex]);

    expect(ok).toBe(false);
  });

  it.each([
    { kind: "manual" as const, instructions: "Install the plugin in settings" },
    { kind: "failed" as const, message: "Install failed" },
  ])("omits authentication after a $kind install", async (result) => {
    const harness = fakeHarness({
      id: "claude",
      detected: true,
      authenticates: true,
      ...(result.kind === "manual" ? { outcome: result } : { error: new Error(result.message) }),
    });

    await runInstaller([harness]);

    expect(checkbox).toHaveBeenCalledOnce();
    expect(harness.authenticate).not.toHaveBeenCalled();
  });

  it("omits authentication when installed harnesses lack the capability", async () => {
    await runInstaller([fakeHarness({ id: "claude", detected: true })]);

    expect(checkbox).toHaveBeenCalledOnce();
  });

  it("allows authentication to be skipped", async () => {
    vi.mocked(checkbox).mockResolvedValueOnce(["claude"]).mockResolvedValueOnce([]);
    const harness = fakeHarness({ id: "claude", detected: true, authenticates: true });

    expect(await runInstaller([harness])).toBe(true);
    expect(harness.authenticate).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("runs authentication sequentially before the get-started prompt", async () => {
    vi.mocked(checkbox).mockResolvedValue(["a", "b"]);
    const events: string[] = [];
    const harnesses = ["a", "b"].map((id) => {
      const harness = fakeHarness({ id, detected: true });
      harness.authenticate = async () => {
        events.push(`${id} start`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push(`${id} end`);
        return { command: `${id} login` };
      };
      return harness;
    });
    vi.mocked(confirm).mockImplementationOnce(async () => {
      events.push("get started");
      return true;
    });

    expect(await runInstaller(harnesses)).toBe(true);
    expect(events).toEqual(["a start", "a end", "b start", "b end", "get started"]);
  });

  it("replays the failure transcript once with a concise task error and continues", async () => {
    vi.mocked(checkbox).mockResolvedValue(["a", "b"]);
    const first = fakeHarness({
      id: "a",
      detected: true,
      authenticates: true,
      authenticationOutput: "Opening browser\nOAuth cancelled\n",
      authenticationError: new Error("OAuth cancelled"),
    });
    const second = fakeHarness({ id: "b", detected: true, authenticates: true });
    const run = vi.spyOn(Listr.prototype, "run");

    expect(await runInstaller([first, second])).toBe(false);

    const group = run.mock.contexts[0].tasks.find(
      (task) => task.title === "Authenticate the Sentry MCP",
    )!;
    const task = group.subtasks[0];
    expect(task.output).toBe(
      `${color.gray("Opening browser")}\n${color.gray("OAuth cancelled")}\n`,
    );
    expect(task.subtasks[0].message.error).toBe("Authentication failed");
    expect(second.authenticate).toHaveBeenCalledOnce();
    run.mockRestore();
  });

  it("preserves authentication errors that are not in the transcript", async () => {
    const harness = fakeHarness({
      id: "claude",
      detected: true,
      authenticates: true,
      authenticationOutput: "Opening browser\n",
      authenticationError: new Error("Spawn failed"),
    });
    const run = vi.spyOn(Listr.prototype, "run");

    expect(await runInstaller([harness])).toBe(false);

    const group = run.mock.contexts[0].tasks.find(
      (task) => task.title === "Authenticate the Sentry MCP",
    )!;
    expect(group.subtasks[0].subtasks[0].message.error).toBe("Spawn failed");
    run.mockRestore();
  });
});
