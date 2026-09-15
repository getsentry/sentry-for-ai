import { fileURLToPath } from "node:url";
import { PassThrough } from "node:stream";
import type { ReadStream, WriteStream } from "node:tty";
import { createWritable } from "listr2";
import { expect, it } from "vitest";
import { captureFullWidthOutput } from "../task-output";
import { runInTerminal } from "../terminal";

it("provides real terminal stdio, readable hyperlinks, and keyboard cancellation", async () => {
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    isRaw: false,
    setRawMode(raw: boolean) {
      this.isRaw = raw;
      return this;
    },
  });
  input.pause();
  const screen = Object.assign(new PassThrough(), { columns: 120, rows: 40 });
  const live = captureFullWidthOutput(createWritable(() => {}));
  let transcript = "";
  let cancelled = false;
  const fixture = fileURLToPath(new URL("./fixtures/terminal-child.cjs", import.meta.url));
  const result = await runInTerminal(
    `"${process.execPath}" "${fixture}" "argument with spaces"`,
    {
      write(data) {
        live.output.write(data);
        transcript += data.toString();
        if (!cancelled && transcript.includes("READY")) {
          cancelled = true;
          input.emit("data", Buffer.from("\x03"));
        }
      },
    },
    {
      input: input as unknown as ReadStream,
      screen: screen as unknown as WriteStream,
      platform: process.platform,
    },
  );

  expect(result, transcript).toEqual({ ok: false, message: "Command cancelled" });
  expect(live.captured()).toContain("ARG: argument with spaces");
  expect(live.captured()).toContain("TTY: true/true/true");
  expect(live.captured()).toContain("https://example.com/authorize?token=test");
  expect(live.captured()).toContain("CANCELLED");
  expect(input.isRaw).toBe(false);
}, 10000);
