import { checkbox, confirm } from "@inquirer/prompts";
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

describe("runInstaller get-started prompt", () => {
  beforeEach(() => {
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
});
