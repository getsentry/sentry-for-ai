import { spawn } from "node:child_process";

// The clipboard tool(s) to try, per platform. macOS ships pbcopy and Windows
// ships clip, so each has a single candidate. Linux has no standard tool, so we
// try Wayland (wl-copy) then X11 (xclip, xsel) and use the first that works.
function clipboardCommands(platform: NodeJS.Platform): string[][] {
  switch (platform) {
    case "darwin":
      return [["pbcopy"]];
    case "win32":
      return [["clip"]];
    default:
      return [
        ["wl-copy"],
        ["xclip", "-selection", "clipboard"],
        ["xsel", "--clipboard", "--input"],
      ];
  }
}

// Copy `text` to the system clipboard, returning whether it landed. Never
// throws: a missing tool (common on headless Linux) resolves to false so the
// caller can fall back to printing the text instead.
export async function copyToClipboard(
  text: string,
  platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
  for (const [command, ...args] of clipboardCommands(platform)) {
    if (await tryCopy(command, args, text)) {
      return true;
    }
  }

  return false;
}

function tryCopy(command: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args);

    child.on("error", () => resolve(false));
    // Resolve on `exit`, not `close`: Linux clipboard tools (xclip, wl-copy,
    // xsel) fork a background process to serve the selection and leave the
    // stdio pipes open, so `close` can hang forever. `exit` fires as soon as
    // the foreground process terminates, which is all we need — we only write
    // to stdin and never read the tool's output.
    child.on("exit", (code) => resolve(code === 0));

    // A missing tool closes stdin before we write, raising EPIPE; swallow it so
    // the rejection surfaces through the "error"/"exit" handlers above instead.
    child.stdin.on("error", () => {});
    child.stdin.end(text);
  });
}
