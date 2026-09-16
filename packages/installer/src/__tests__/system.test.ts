import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { createWritable } from "listr2";
import { describe, expect, it, vi } from "vitest";
import { realSystem } from "../system";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));

function mockChild() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  vi.mocked(spawn).mockReturnValueOnce(child as ReturnType<typeof spawn>);
  return child;
}

describe("process runner", () => {
  it("captures streamed output and reports stderr on failure", async () => {
    const child = mockChild();
    const transcript: string[] = [];
    const output = createWritable((text) => transcript.push(text));
    const result = realSystem.run("login", output);
    child.stdout.write("Opening browser\n");
    child.stderr.write("OAuth cancelled\n");
    child.emit("close", 1);

    expect(spawn).toHaveBeenLastCalledWith("login", {
      shell: true,
    });
    expect(transcript.join("")).toBe("Opening browser\nOAuth cancelled\n");
    expect(await result).toMatchObject({ ok: false, stderr: "OAuth cancelled" });
    expect(output.writable).toBe(true);
  });

  it("keeps ordinary streamed commands detached from terminal input", async () => {
    const child = mockChild();
    const result = realSystem.run(
      "install",
      createWritable(() => {}),
    );
    child.emit("close", 0);

    expect(spawn).toHaveBeenLastCalledWith("install", {
      shell: true,
    });
    expect(await result).toEqual({ ok: true });
  });

  it("surfaces spawn failures", async () => {
    const child = mockChild();
    const result = realSystem.run(
      "login",
      createWritable(() => {}),
    );
    child.emit("error", new Error("Spawn failed"));

    expect(await result).toEqual({ ok: false, message: "Spawn failed" });
  });
});
