import { exec, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { runInTerminal } from "./terminal";

const execAsync = promisify(exec);

// Where a running command's output can be streamed live (e.g. a Listr
// `task.stdout()`). Plain Node Writable, so the harness layer stays unaware of
// the renderer.
export type OutputSink = NodeJS.WritableStream;

export interface ShellResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface SystemDeps {
  // Async so the event loop stays free while a command runs — this is what lets
  // the spinner animate and concurrent installs actually overlap. When `output`
  // is given, stdout/stderr stream to it and failures retain stderr. Without
  // a sink, stdout and errors are buffered in the result.
  run(command: string, output?: OutputSink): Promise<ShellResult>;
  // Login commands run in a PTY with terminal input forwarded and output captured.
  runInteractive(command: string, output?: OutputSink): Promise<ShellResult>;
  exists(path: string): boolean;
  platform: NodeJS.Platform;
  homedir: string;
}

// `end: false` keeps the UI sink open across install commands; stderr is also
// buffered for the task error.
function runStreaming(command: string, output: OutputSink): Promise<ShellResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });

    // Tee stderr: pipe it to the live view AND buffer it, so a failure can throw
    // the command's actual error text rather than a generic exit-code message.
    // Decode as UTF-8 so a multibyte char split across chunks isn't corrupted.
    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stdout?.pipe(output, { end: false });
    child.stderr?.pipe(output, { end: false });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => resolve({ ok: false, message: err.message }));
    child.on("close", (code) =>
      resolve(
        code === 0
          ? { ok: true }
          : {
              ok: false,
              stderr: stderr.trim() || undefined,
              message: `Command failed with exit code ${code}: ${command}`,
            },
      ),
    );
  });
}

export const realSystem: SystemDeps = {
  async run(command, output) {
    if (output) {
      return runStreaming(command, output);
    }

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
  runInteractive: runInTerminal,
  exists: existsSync,
  platform: process.platform,
  homedir: homedir(),
};
