import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { expect, it, vi } from "vitest";
import { createCodex } from "../harnesses/codex";
import { realSystem } from "../system";

it.skipIf(process.platform !== "win32")(
  "detects a PowerShell-only Codex command and installs through PowerShell",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-powershell-"));
    const windows = process.env.SystemRoot!;

    try {
      // PowerShell discovers .ps1 commands on PATH; where uses PATHEXT.
      vi.stubEnv(
        "PATH",
        [
          directory,
          join(windows, "System32"),
          join(windows, "System32", "WindowsPowerShell", "v1.0"),
        ].join(";"),
      );
      vi.stubEnv("PATHEXT", ".COM;.EXE;.BAT;.CMD");
      vi.stubEnv("PSExecutionPolicyPreference", "RemoteSigned");
      await writeFile(
        join(directory, "codex.ps1"),
        `
$command = $args -join ' '
switch ($command) {
  'plugin list --json' { '{"installed":[{"pluginId":"sentry@sentry-plugin-marketplace"}]}' }
  'plugin marketplace list --json' { '{"marketplaces":[]}' }
  'plugin marketplace add getsentry/plugin-codex' { 'marketplace added' }
  'plugin add sentry@sentry-plugin-marketplace' { 'plugin installed' }
  'plugin remove sentry@sentry-plugin-marketplace' { [Console]::Error.WriteLine('removal failed'); exit 7 }
  default { throw "Unexpected command: $command" }
}
`,
      );

      expect((await realSystem.run("where codex")).ok).toBe(false);
      const harness = createCodex(realSystem);
      expect(await harness.detect()).toBe(true);
      expect(await harness.isInstalled()).toBe(true);

      const output = new PassThrough();
      let transcript = "";
      output.on("data", (data) => {
        transcript += data.toString();
      });
      expect(await harness.install(output)).toMatchObject({ kind: "done" });
      expect(transcript).toContain("marketplace added");
      expect(transcript).toContain("plugin installed");
      await expect(harness.remove()).rejects.toThrow("removal failed");
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  },
  30_000,
);
