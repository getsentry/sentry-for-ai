import { cleanseAnsi, color, createWritable, DefaultRenderer, ListrEventManager } from "listr2";
import { describe, expect, it, vi } from "vitest";
import { captureFullWidthOutput, FullWidthOutputRenderer, grayOutput } from "../task-output";

class TestRenderer extends FullWidthOutputRenderer {
  formatOutput(message: string, level = 0): string[] {
    return this.format(message, "◦", level);
  }
}

describe("task output", () => {
  it("preserves terminal colors and normalizes line endings", () => {
    const live = captureFullWidthOutput(createWritable(() => {}));
    live.output.write("\x1b[32mReady\x1b[0m\r\n");
    expect(live.captured()).toBe("\x1b[32mReady\x1b[0m\n");
  });

  it("removes cursor and erase codes while preserving adjacent text", () => {
    const snapshots: string[] = [];
    const live = captureFullWidthOutput(
      createWritable((text) => snapshots.push(cleanseAnsi(text))),
    );
    live.output.write("\x1b[2J\x1b[HReady\n");
    expect(snapshots.at(-1)).toContain("Ready");
    expect(snapshots.at(-1)).not.toContain("\x1b[");
  });
  it("renders complete live snapshots without wrapping or indentation", () => {
    const snapshots: string[] = [];
    const live = captureFullWidthOutput(createWritable((text) => snapshots.push(text)));
    const renderer = new TestRenderer([], {}, new ListrEventManager());
    const url = `https://example.com/${"a".repeat(200)}`;

    live.output.write("Open this URL:\n");
    live.output.write(url.slice(0, 80));
    live.output.write(url.slice(80));

    expect(renderer.formatOutput(snapshots[2], 3)).toEqual([
      color.gray("Open this URL:"),
      color.gray(url),
    ]);
    expect(live.captured()).toBe(`Open this URL:\n${url}`);
  });

  it("preserves blank lines and UTF-8 characters split across chunks", () => {
    const snapshots: string[] = [];
    const live = captureFullWidthOutput(createWritable((text) => snapshots.push(text)));
    const bytes = Buffer.from("Authorize →\n\nDone");
    const arrowOffset = Buffer.byteLength("Authorize ");

    live.output.write(bytes.subarray(0, arrowOffset + 1));
    live.output.write(bytes.subarray(arrowOffset + 1));

    expect(live.captured()).toBe("Authorize →\n\nDone");
    const renderer = new TestRenderer([], {}, new ListrEventManager());
    expect(renderer.formatOutput(snapshots.at(-1)!)).toEqual([
      color.gray("Authorize →"),
      "",
      color.gray("Done"),
    ]);
  });

  it("replays captured output through normal Listr formatting after completion", () => {
    const live = captureFullWidthOutput(createWritable(() => {}));
    live.output.write("First\n");
    live.output.write("Second\n");
    const replay: string[] = [];
    grayOutput(createWritable((text) => replay.push(text))).write(live.captured());
    const format = vi
      .spyOn(
        DefaultRenderer.prototype as unknown as {
          format(message: string, icon: string, level: number): string[];
        },
        "format",
      )
      .mockReturnValue([]);
    const renderer = new TestRenderer([], {}, new ListrEventManager());

    renderer.formatOutput(replay[0], 2);

    expect(format).toHaveBeenCalledWith(
      `${color.gray("First")}\n${color.gray("Second")}\n`,
      "◦",
      2,
    );
    format.mockRestore();
  });
});
