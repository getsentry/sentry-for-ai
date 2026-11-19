import { PassThrough } from "node:stream";
import type { ReadStream, WriteStream } from "node:tty";
import { spawn } from "node-pty";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInTerminal } from "../terminal";

vi.mock("node-pty", () => ({ spawn: vi.fn() }));

function setup(platform: NodeJS.Platform = "darwin") {
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    isRaw: false,
    setRawMode: vi.fn((raw: boolean) => {
      input.isRaw = raw;
      return input;
    }),
  });
  input.pause();
  const screen = Object.assign(new PassThrough(), { columns: 120, rows: 40 });
  let onData: (data: string) => void = () => {};
  let onExit: (event: { exitCode: number; signal?: number }) => void = () => {};
  const dispose = vi.fn();
  const child = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn((callback) => {
      onData = callback;
      return { dispose };
    }),
    onExit: vi.fn((callback) => {
      onExit = callback;
      return { dispose };
    }),
  };
  vi.mocked(spawn).mockReturnValue(child as unknown as ReturnType<typeof spawn>);
  const io = {
    input: input as unknown as ReadStream,
    screen: screen as unknown as WriteStream,
    platform,
  };
  return {
    input,
    screen,
    child,
    io,
    dispose,
    data: (value: string) => onData(value),
    exit: (exitCode = 0) => onExit({ exitCode }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("interactive terminal", () => {
  it.each(["darwin", "linux", "win32"] as const)(
    "uses the platform shell on %s and restores input",
    async (platform) => {
      const terminal = setup(platform);
      const output = new PassThrough();
      let transcript = "";
      output.on("data", (data) => {
        transcript += data;
      });
      const result = runInTerminal("login", output, terminal.io);
      await vi.waitFor(() => expect(terminal.input.isRaw).toBe(true));
      expect(spawn).toHaveBeenCalledWith(
        platform === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/sh",
        platform === "win32" ? '/d /s /c "login"' : ["-c", "exec login"],
        expect.objectContaining({ cols: 120, rows: 40 }),
      );
      terminal.data("Ready\r\n");
      terminal.input.emit("data", Buffer.from("yes\r"));
      terminal.screen.emit("resize");
      expect(terminal.child.write).toHaveBeenCalledWith(Buffer.from("yes\r"));
      expect(terminal.child.resize).toHaveBeenCalledWith(120, 40);
      terminal.exit();
      expect(await result).toEqual({ ok: true });
      expect(transcript).toBe("Ready\r\n");
      expect(terminal.input.isRaw).toBe(false);
      expect(terminal.input.isPaused()).toBe(true);
      expect(terminal.input.listenerCount("data")).toBe(0);
      expect(terminal.dispose).toHaveBeenCalledTimes(2);
      expect(output.writable).toBe(true);
    },
  );

  it("preserves quoted Windows paths in a raw shell command", async () => {
    const terminal = setup("win32");
    const command = '"C:\\Program Files\\node.exe" "D:\\work dir\\fixture.cjs"';
    const result = runInTerminal(command, new PassThrough(), terminal.io);
    await vi.waitFor(() => expect(terminal.input.isRaw).toBe(true));
    expect(spawn).toHaveBeenCalledWith(
      process.env.ComSpec || "cmd.exe",
      `/d /s /c "${command}"`,
      expect.any(Object),
    );
    terminal.exit();
    expect(await result).toEqual({ ok: true });
  });

  it("forwards Ctrl-C and forcibly terminates an unresponsive child", async () => {
    const terminal = setup();
    const result = runInTerminal("login", new PassThrough(), terminal.io);
    await vi.waitFor(() => expect(terminal.input.isRaw).toBe(true));
    vi.useFakeTimers();
    terminal.input.emit("data", "\x03");
    expect(terminal.child.write).toHaveBeenCalledWith("\x03");
    expect(terminal.child.kill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(terminal.child.kill).toHaveBeenCalledWith("SIGKILL");
    terminal.exit(130);
    expect(await result).toEqual({ ok: false, message: "Command cancelled" });
  });

  it("requires terminal input", async () => {
    const terminal = setup();
    terminal.input.isTTY = false;
    expect(await runInTerminal("login", new PassThrough(), terminal.io)).toEqual({
      ok: false,
      message: "Command requires an interactive terminal",
    });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("reports native spawn failures", async () => {
    const terminal = setup();
    vi.mocked(spawn).mockImplementationOnce(() => {
      throw new Error("Native spawn failed");
    });
    expect(await runInTerminal("login", new PassThrough(), terminal.io)).toEqual({
      ok: false,
      message: "Native spawn failed",
    });
    expect(terminal.input.isRaw).toBe(false);
  });
});
