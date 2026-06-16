import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ShellResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface SystemDeps {
  // Async so the event loop stays free while a command runs — this is what lets
  // the spinner animate and concurrent installs actually overlap.
  run(command: string): Promise<ShellResult>;
  exists(path: string): boolean;
  platform: NodeJS.Platform;
  homedir: string;
}

export const realSystem: SystemDeps = {
  async run(command) {
    try {
      const { stdout } = await execAsync(command, { encoding: "utf8" });
      return { ok: true, stdout: stdout.trim() };
    } catch (err: any) {
      return {
        ok: false,
        stdout: err.stdout?.toString().trim(),
        stderr: err.stderr?.toString().trim(),
        message: err.message,
      };
    }
  },
  exists: existsSync,
  platform: process.platform,
  homedir: homedir(),
};
