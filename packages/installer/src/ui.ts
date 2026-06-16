import { checkbox } from "@inquirer/prompts";
import { ListrInquirerPromptAdapter } from "@listr2/prompt-adapter-inquirer";
import { Listr, type ListrTask, type ListrTaskWrapper } from "listr2";
import type { Harness } from "./harnesses/types";
import {
  detectHarnesses,
  installHarness,
  installSucceeded,
  type Detection,
  type InstallResult,
} from "./run";

const BANNER_LINES = [
  "█▀ █▀▀ █▄░█ ▀█▀ █▀█ █▄█   █▀▀ █▀█ █▀█   ▄▀█ █",
  "▄█ ██▄ █░▀█ ░█░ █▀▄ ░█░   █▀░ █▄█ █▀▄   █▀█ █",
];

// #7553FF text on a #181225 background, via truecolor escapes. Each line is
// padded to a common width so the background reads as one clean block.
const BANNER_FG = "\x1b[38;2;117;83;255m";
const BANNER_BG = "\x1b[48;2;24;18;37m";
// The background color rendered as a foreground, for the half-block pad rows.
const BANNER_BG_FG = "\x1b[38;2;24;18;37m";
const RESET = "\x1b[0m";

const BANNER_WIDTH = Math.max(...BANNER_LINES.map((line) => line.length));
const INNER_WIDTH = BANNER_WIDTH + 2;

// The text glyphs are half-blocks, so the block alone has ragged top/bottom
// edges. A ▄ row on top fills its lower half and a ▀ row on the bottom fills
// its upper half — both in the background color — extending the block by half
// a cell each way for even vertical padding.
const PAD_TOP = `${BANNER_BG_FG}${"▄".repeat(INNER_WIDTH)}${RESET}`;
const PAD_BOTTOM = `${BANNER_BG_FG}${"▀".repeat(INNER_WIDTH)}${RESET}`;
const TEXT_LINES = BANNER_LINES.map(
  (line) => `${BANNER_BG}${BANNER_FG} ${line.padEnd(BANNER_WIDTH)} ${RESET}`,
);

const BANNER = `\n${[PAD_TOP, ...TEXT_LINES, PAD_BOTTOM].join("\n")}\n`;

export interface RunOptions {
  // When false, skip the selector and install every detected agent (CI smoke
  // tests, unattended runs). The selection task is disabled in this mode.
  interactive?: boolean;
}

interface Ctx {
  detections: Detection[];
  selected: Detection[];
  results: InstallResult[];
  cancelled: boolean;
}

type TaskWrapper = ListrTaskWrapper<Ctx, any, any>;

// inquirer raises ExitPromptError when the user hits Ctrl-C / Esc at the
// prompt. We treat that as a clean cancellation rather than a crash.
function isCancel(err: unknown): boolean {
  return err instanceof Error && err.name === "ExitPromptError";
}

async function promptForAgents(detections: Detection[], task: TaskWrapper): Promise<Detection[]> {
  const selectedIds = await task.prompt(ListrInquirerPromptAdapter).run(checkbox, {
    message: "Select the agents to install the Sentry plugin for",
    choices: detections.map((detection) => ({
      name: detection.installed ? `${detection.harness.name} (reinstall)` : detection.harness.name,
      value: detection.harness.id,
      checked: detection.detected,
    })),
  });

  return detections.filter((detection) => selectedIds.includes(detection.harness.id));
}

// One concurrent subtask per selected agent. The install logic lives in
// installHarness; this only translates its result into the task display.
function installTask(ctx: Ctx, detection: Detection): ListrTask<Ctx> {
  const { harness, installed } = detection;

  return {
    title: installed ? `${harness.name} (reinstall)` : harness.name,
    task: async (_ctx, task: TaskWrapper) => {
      const result = await installHarness(detection);
      ctx.results.push(result);

      switch (result.kind) {
        case "done":
          task.title = `${harness.name} — ${result.command}`;
          if (result.note) task.output = result.note;
          return;
        case "manual":
          task.title = `${harness.name} — manual steps required`;
          task.output = result.instructions;
          return;
        case "blocked":
          task.skip(`${harness.name} — ${result.reason}`);
          return;
        case "failed":
          throw new Error(result.message);
      }
    },
  };
}

export async function runInstaller(
  harnesses: Harness[],
  options: RunOptions = {},
): Promise<boolean> {
  const interactive = options.interactive ?? true;

  if (!process.env.VITEST) {
    console.log(BANNER);
  }

  const tasks = new Listr<Ctx>(
    [
      {
        title: "Detecting AI coding tools",
        task: async (ctx, task) => {
          ctx.detections = await detectHarnesses(harnesses);

          const found = ctx.detections.filter((d) => d.detected).map((d) => d.harness.name);
          task.title = found.length ? `Detected ${found.join(", ")}` : "No AI coding tools found";
        },
      },
      {
        title: "Select agents",
        enabled: () => interactive,
        task: async (ctx, task) => {
          try {
            ctx.selected = await promptForAgents(ctx.detections, task);
          } catch (err) {
            if (!isCancel(err)) throw err;
            ctx.cancelled = true;
            task.skip("Cancelled");
          }
        },
      },
      {
        title: "Installing plugins",
        // Non-interactive runs never see the prompt, so fall back to every
        // detected agent here.
        enabled: (ctx) => !ctx.cancelled,
        task: (ctx, task) => {
          const selected = interactive ? ctx.selected : ctx.detections.filter((d) => d.detected);
          ctx.selected = selected;

          if (selected.length === 0) {
            task.skip("No agents selected");
            return;
          }

          // exitOnError: false so one agent failing does not abort the rest;
          // each subtask records its own result and the batch still settles.
          return task.newListr(
            selected.map((detection) => installTask(ctx, detection)),
            { concurrent: true, exitOnError: false },
          );
        },
      },
    ],
    // exitOnError lets a cancelled prompt or a detection failure abort the run;
    // install failures are contained by the inner list above. Under vitest we
    // silence the renderer so test runs do not paint the terminal.
    {
      concurrent: false,
      exitOnError: true,
      silentRendererCondition: !!process.env.VITEST,
    },
  );

  const ctx: Ctx = { detections: [], selected: [], results: [], cancelled: false };
  await tasks.run(ctx);

  if (ctx.cancelled) {
    return true;
  }

  if (ctx.results.length > 0) {
    console.log("\nRestart your AI tools to load the Sentry plugin.");
  }

  return ctx.results.every(installSucceeded);
}
