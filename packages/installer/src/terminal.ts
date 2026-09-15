import type { ReadStream, WriteStream } from "node:tty";
import type { IPty } from "node-pty";
import type { OutputSink, ShellResult } from "./system";

interface TerminalIO {
  input: ReadStream;
  screen: WriteStream;
  platform: NodeJS.Platform;
}

const terminalIO: TerminalIO = {
  input: process.stdin,
  screen: process.stdout,
  platform: process.platform,
};

export async function runInTerminal(
  command: string,
  output: OutputSink = process.stdout,
  io: TerminalIO = terminalIO,
): Promise<ShellResult> {
  if (!io.input.isTTY) {
    return { ok: false, message: "Command requires an interactive terminal" };
  }

  try {
    // Load the native binding only when an interactive command runs.
    const { spawn } = await import("node-pty");
    const windows = io.platform === "win32";
    // cmd.exe parses a command string, not C-style escaped argv. /s removes
    // this outer quote pair while preserving quotes around paths and arguments.
    const args = windows ? `/d /s /c "${command}"` : ["-c", `exec ${command}`];
    const child = spawn(windows ? process.env.ComSpec || "cmd.exe" : "/bin/sh", args, {
      name: "xterm-256color",
      cols: io.screen.columns || 80,
      rows: io.screen.rows || 24,
      cwd: process.cwd(),
      env: process.env,
    });

    return await relayTerminal(child, output, io);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

async function relayTerminal(
  child: IPty,
  output: OutputSink,
  io: TerminalIO,
): Promise<ShellResult> {
  const { input, screen } = io;
  const wasRaw = !!input.isRaw;
  const wasPaused = input.isPaused();
  let exited = false;
  let cancelled = false;
  let killTimer: ReturnType<typeof setTimeout> | undefined;

  const kill = () => {
    if (exited) return;

    // A native exit can race its onExit notification. Cleanup tolerates an
    // already-closed terminal, including during the parent's exit handler.
    try {
      child.kill(io.platform === "win32" ? undefined : "SIGKILL");
    } catch {
      // Termination is best-effort during shutdown.
    }
  };
  const forward = (data: Buffer | string) => {
    if (exited) return;

    child.write(data);

    if (data.toString().includes("\x03")) {
      cancelled = true;
      // Ctrl-C goes through the PTY to the child's foreground process group.
      // A second Ctrl-C, or an unresponsive child, forces termination.
      if (killTimer) {
        kill();
      } else {
        killTimer = setTimeout(kill, 2000);
      }
    }
  };
  const resize = () => {
    if (!exited) child.resize(screen.columns || 80, screen.rows || 24);
  };
  const dataSubscription = child.onData((data) => output.write(data));
  let exitSubscription: ReturnType<IPty["onExit"]> | undefined;
  const completion = new Promise<ShellResult>((resolve) => {
    exitSubscription = child.onExit(({ exitCode, signal }) => {
      exited = true;
      resolve(
        !cancelled && exitCode === 0 && !signal
          ? { ok: true }
          : {
              ok: false,
              message: cancelled
                ? "Command cancelled"
                : `Command failed (${signal ? `signal ${signal}` : `exit code ${exitCode}`})`,
            },
      );
    });
  });

  try {
    // Raw input prevents the installer/Listr from intercepting keyboard Ctrl-C.
    // The byte is forwarded to the PTY, which owns the child-side terminal mode.
    input.setRawMode(true);
    input.on("data", forward);
    screen.on("resize", resize);
    process.once("exit", kill);
    input.resume();

    return await completion;
  } finally {
    kill();
    clearTimeout(killTimer);
    dataSubscription.dispose();
    exitSubscription?.dispose();
    input.off("data", forward);
    screen.off("resize", resize);
    process.off("exit", kill);
    input.setRawMode(wasRaw);

    if (wasPaused) input.pause();
  }
}
