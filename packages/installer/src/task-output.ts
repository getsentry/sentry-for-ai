import { Writable } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { color, createWritable, DefaultRenderer } from "listr2";
import type { OutputSink } from "./system";

// Full-width OAuth output makes URLs easier to select and copy: Listr's normal
// formatting adds indentation and continuation-line padding to the selection.
// This private marker bypasses format() wrapping and indentation; the updater
// still wraps the frame to track terminal rows.
const FULL_WIDTH_PREFIX = "\0sentry-full-width-output\0";

function terminalOutput(text: string): string {
  // Listr owns the cursor; subprocess colors and hyperlinks pass through.
  return text
    .replace(/\x1b(?:\[[0-?]*[ -/]*)?$/, "")
    .replace(/\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x6c\x6e-\x7e]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "");
}

export class FullWidthOutputRenderer extends DefaultRenderer {
  protected format(message: string, icon: string, level: number): string[] {
    if (!message.startsWith(FULL_WIDTH_PREFIX)) {
      return super.format(message, icon, level);
    }

    return message
      .slice(FULL_WIDTH_PREFIX.length)
      .split(/\r?\n/)
      .map((line) => (line ? color.gray(line) : line));
  }
}

export function grayOutput(destination: OutputSink): OutputSink {
  return createWritable((chunk) =>
    destination.write(
      chunk
        .split("\n")
        .map((line) => (line ? color.gray(line) : line))
        .join("\n"),
    ),
  );
}

// Use with bottomBar: 1: each write replaces the live view with a complete
// snapshot, so arbitrary subprocess chunks remain one continuous transcript.
export function captureFullWidthOutput(destination: OutputSink): {
  output: OutputSink;
  captured(): string;
} {
  const decoder = new StringDecoder("utf8");
  const chunks: string[] = [];
  const output = new Writable({
    write(chunk, _encoding, callback) {
      const text = decoder.write(chunk);

      if (text) {
        chunks.push(text);
        destination.write(`${FULL_WIDTH_PREFIX}${terminalOutput(chunks.join(""))}`);
      }

      callback();
    },
  });

  return { output, captured: () => terminalOutput(chunks.join("")) };
}
