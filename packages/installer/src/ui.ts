import { checkbox } from "@inquirer/prompts";
import { ListrInquirerPromptAdapter } from "@listr2/prompt-adapter-inquirer";
import {
  color,
  createWritable,
  DefaultRenderer,
  Listr,
  ListrDefaultRendererLogLevels,
  Spinner,
  type ListrTask,
  type ListrTaskWrapper,
} from "listr2";
import type { Harness } from "./harnesses/types";
import { SHIMMER_INTERVAL_MS, shimmer, shimmerRest } from "./text-shimmer";
import {
  detectHarnesses,
  installHarness,
  installSucceeded,
  removeHarness,
  type Detection,
  type InstallResult,
} from "./run";
import type { OutputSink } from "./system";

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

// Tagline shown under the banner while the install runs. "speak Sentry"
// shimmers — a bright band sweeps across it — painted as a header by
// ShimmerRenderer each frame (see runInstaller). It settles to a calm static
// line when the work finishes, and stays static off a color TTY.
const INTRO_PREFIX = "Teaching your agents to ";
const INTRO_WORD = "speak Sentry";
const INTRO_SUFFIX = ". This won't take long…";

// The tagline. With no `phase` it renders at rest; pass a phase for a shimmer
// frame. Off a color TTY the word stays plain so piped output carries no escapes.
function introTitle(colored: boolean, phase?: number): string {
  const prefix = color.dim(INTRO_PREFIX);
  const suffix = color.dim(INTRO_SUFFIX);

  if (!colored) {
    return `${prefix}${INTRO_WORD}${suffix}`;
  }

  const word = phase === undefined ? shimmerRest(INTRO_WORD) : shimmer(INTRO_WORD, phase);
  return `${prefix}${word}${suffix}`;
}

// The remove flow's tagline. A flat Men-in-Black riff that stays static — there
// is nothing to teach, so the line does not shimmer (the `phase` is ignored).
const NEURALYZE_TITLE = "Neuralyzing your agents of Sentry.";

function neuralyzeTitle(_colored: boolean): string {
  return color.dim(NEURALYZE_TITLE);
}

export interface RunOptions {
  // When false, skip the selector and install every detected agent (CI smoke
  // tests, unattended runs). The selection task is disabled in this mode.
  interactive?: boolean;
}

interface Ctx {
  detections: Detection[];
  selected: Detection[];
  results: InstallResult[];
  // Names of agents the flow actually acted on (installed or removed), for the
  // closing restart hint. Blocked/failed agents are excluded — nothing to
  // restart for those.
  affected: string[];
  cancelled: boolean;
}

/**
 * The parts of the flow that differ between install and remove. Detection and
 * selection are shared; everything below tailors the tagline, the prompt, the
 * per-agent action, and the closing line to one direction.
 */
interface FlowMode {
  /**
   * Tagline painted above the task list. `phase` drives the shimmer; a static
   * mode (remove) ignores it and always renders at rest.
   */
  header(colored: boolean, phase?: number): string;
  /**
   * Whether the tagline shimmers while work is in flight.
   */
  animate: boolean;
  /**
   * Which detections this flow can act on. Install targets every detected agent;
   * remove targets only those that actually have our plugin.
   */
  eligible(detection: Detection): boolean;
  /**
   * Message shown above the agent checkbox.
   */
  selectMessage: string;
  /**
   * Per-agent label in the checkbox and the task list.
   */
  label(detection: Detection): string;
  /**
   * Title of the action group.
   */
  actionTitle: string;
  /**
   * Skip line shown when nothing is eligible to act on.
   */
  emptyMessage: string;
  /**
   * Act on one harness — install/update or remove.
   */
  act(detection: Detection, output: OutputSink): Promise<InstallResult>;
  /**
   * Closing line printed when at least one agent was acted on; `names` are the
   * affected agents to restart.
   */
  closing(names: string[]): string;
}

// "Claude Code", "Claude Code and Codex", "Claude Code, Codex, and Grok".
const listFormatter = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

// A diamond that pulses small-to-large for the in-progress spinner. A faster
// tick than listr's 100ms default keeps the header shimmer smooth, since the
// renderer repaints on each spin.
class DiamondSpinner extends Spinner {
  protected readonly spinner = ["◇", "◈", "◆", "◈"];

  start(cb: () => void, interval = 80): void {
    super.start(cb, interval);
  }
}

type TaskWrapper = ListrTaskWrapper<Ctx, any, any>;

// The slice of a listr Task that ShimmerRenderer reads to tell whether work is
// still in flight (the base renderer keeps its task list private).
interface TaskState {
  isPending(): boolean;
  isStarted(): boolean;
}

// inquirer raises ExitPromptError when the user hits Ctrl-C / Esc at the
// prompt. We treat that as a clean cancellation rather than a crash.
function isCancel(err: unknown): boolean {
  return err instanceof Error && err.name === "ExitPromptError";
}

// Only eligible agents are offered: acting on an agent the flow cannot touch
// just runs shell commands that fail with confusing errors. Everything is
// pre-checked since the whole list is actionable; the user deselects to skip.
async function promptForAgents(
  eligible: Detection[],
  mode: FlowMode,
  task: TaskWrapper,
): Promise<Detection[]> {
  const selectedIds = await task.prompt(ListrInquirerPromptAdapter).run(checkbox, {
    message: mode.selectMessage,
    choices: eligible.map((detection) => ({
      name: mode.label(detection),
      value: detection.harness.id,
      checked: true,
    })),
    // The cursor must stay one column wide: inquirer pads inactive rows with a
    // single hardcoded space, so a wider cursor would shift the active row's
    // checkbox out of alignment. Put the gap after the arrow on the checkbox
    // icons instead, so every row reserves the same two columns before the box.
    theme: {
      // Hollow diamond in place of the default "?" prompt prefix.
      prefix: color.blue("◇"),
      icon: {
        cursor: "→",
        checked: ` ${color.green("◉")}`,
        unchecked: " ◯",
      },
    },
  });

  return eligible.filter((detection) => selectedIds.includes(detection.harness.id));
}

// Translate one harness action (install/update or remove) into Listr task
// display state.
function actionTask(ctx: Ctx, detection: Detection, mode: FlowMode): ListrTask<Ctx> {
  const { harness } = detection;

  return {
    title: mode.label(detection),
    // outputBar shows every streamed line of the running commands; persistentOutput
    // keeps it (and the trailing notes below) on screen after the task settles.
    rendererOptions: { persistentOutput: true, outputBar: Infinity },
    task: async (_ctx, task: TaskWrapper) => {
      // Stream the command output live under this task's row, grayed (the
      // renderer's color map only tints the icon, so gray the body through a
      // createWritable transform). Trailing notes go to the raw sink so their
      // text stays full color and reads as ours, not command noise.
      const raw = task.stdout();
      // Gray per line, leaving blank lines genuinely empty — otherwise the gray
      // escapes make them non-empty and defeat the renderer's removeEmptyLines.
      const out = createWritable((chunk) =>
        raw.write(
          chunk
            .toString()
            .split("\n")
            .map((line: string) => (line ? color.gray(line) : line))
            .join("\n"),
        ),
      );
      const result = await mode.act(detection, out);
      ctx.results.push(result);

      // Trailing notes (what cleanup removed, manual steps, restart hints) are not
      // command output, so append them to the raw stream rather than overwriting it.
      const writeTail = (...lines: (string | undefined)[]) => {
        const tail = lines.filter(Boolean).join("\n");
        if (tail) raw.write(`\n${tail}\n`);
      };

      switch (result.kind) {
        case "done":
          task.title = `${harness.name} — ${result.command}`;
          writeTail(result.cleaned, result.note);
          ctx.affected.push(harness.name);
          return;
        case "manual":
          task.title = `${harness.name} — manual steps required`;
          writeTail(result.cleaned, result.instructions);
          ctx.affected.push(harness.name);
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

// Install (and update) targets every detected agent, with a shimmering tagline.
const installMode: FlowMode = {
  header: introTitle,
  animate: true,
  eligible: (detection) => detection.detected,
  selectMessage: "Select the agents to install the Sentry plugin for",
  label: (detection) =>
    detection.installed ? `${detection.harness.name} (reinstall)` : detection.harness.name,
  actionTitle: "Installing plugins",
  emptyMessage: "No agents selected",
  act: (detection, output) => installHarness(detection, output),
  closing: (names) => {
    const speak = names.length === 1 ? "agent now speaks" : "agents now speak";
    return `\nDone. Restart ${listFormatter.format(names)}. ${color.dim(`Your ${speak} Sentry.`)}`;
  },
};

// Remove targets only agents that actually have our plugin, with a static
// tagline.
const removeMode: FlowMode = {
  header: neuralyzeTitle,
  animate: false,
  eligible: (detection) => detection.detected && detection.installed,
  selectMessage: "Select the agents to remove the Sentry plugin from",
  label: (detection) => detection.harness.name,
  actionTitle: "Removing plugins",
  emptyMessage: "No agents to remove",
  act: (detection, output) => removeHarness(detection, output),
  closing: (names) =>
    `\nDone. Restart ${listFormatter.format(names)}. ${color.dim("They won't remember a thing.")}`,
};

export function runInstaller(harnesses: Harness[], options: RunOptions = {}): Promise<boolean> {
  return runFlow(harnesses, installMode, options);
}

export function runRemover(harnesses: Harness[], options: RunOptions = {}): Promise<boolean> {
  return runFlow(harnesses, removeMode, options);
}

async function runFlow(
  harnesses: Harness[],
  mode: FlowMode,
  options: RunOptions = {},
): Promise<boolean> {
  const interactive = options.interactive ?? true;

  // The header shimmer is painted by ShimmerRenderer, which only runs on a TTY.
  // colored gates truecolor; animate gates the sweep (off under test, and off
  // entirely for modes whose tagline stays static).
  const isTTY = !!process.stdout.isTTY;
  const colored = isTTY && !process.env.NO_COLOR && !process.env.CI;
  const animate = mode.animate && colored && !process.env.VITEST;

  if (!process.env.VITEST) {
    console.log(BANNER);
    // Off a TTY the renderer falls back to a plain logger with no header, so
    // print the tagline once up front to keep it in the output.
    if (!isTTY) {
      console.log(`${mode.header(colored)}\n`);
    }
  }

  // The actual steps. They run nested under the tagline so it stays on screen
  // for the whole run.
  const steps: ListrTask<Ctx>[] = [
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
      // Skip the prompt unless we are interactive and actually found something
      // to act on — an empty checkbox is pointless.
      enabled: (ctx) => interactive && ctx.detections.some(mode.eligible),
      task: async (ctx, task) => {
        const eligible = ctx.detections.filter(mode.eligible);
        try {
          ctx.selected = await promptForAgents(eligible, mode, task);
        } catch (err) {
          if (!isCancel(err)) throw err;
          ctx.cancelled = true;
          task.skip("Cancelled");
        }
      },
    },
    {
      title: mode.actionTitle,
      // Interactive runs act on the user's selection; non-interactive runs skip
      // the prompt and act on every eligible agent.
      enabled: (ctx) => !ctx.cancelled,
      task: (ctx, task) => {
        const selected = interactive ? ctx.selected : ctx.detections.filter(mode.eligible);

        if (selected.length === 0) {
          task.skip(mode.emptyMessage);
          return;
        }

        // exitOnError: false so one agent failing does not abort the rest;
        // each subtask records its own result and the batch still settles.
        // collapseSubtasks: false keeps the per-agent rows (and their command
        // and cleanup output) on screen after the group finishes instead of
        // folding them back into the parent line.
        return task.newListr(
          selected.map((detection) => actionTask(ctx, detection, mode)),
          {
            concurrent: true,
            exitOnError: false,
            rendererOptions: { collapseSubtasks: false },
          },
        );
      },
    },
  ];

  // Paint the tagline as a header above the task list every frame. The header is
  // not a task, so it carries no spinner icon, and the steps render as a normal
  // flat list beneath a blank line.
  class ShimmerRenderer extends DefaultRenderer {
    // Wall-clock origin for a frame-rate-independent shimmer phase.
    private readonly startedAt = Date.now();

    create(options?: Parameters<DefaultRenderer["create"]>[0]): string {
      const body = super.create(options);

      // Animate only while work is in flight; once every task has settled the
      // header rests, so the final painted frame is calm. `tasks` is private on
      // the base renderer, so reach it through a narrowed cast.
      const tasks = (this as unknown as { tasks: TaskState[] }).tasks;
      const running = tasks.some((task) => task.isPending() || task.isStarted());
      const phase =
        animate && running
          ? Math.floor((Date.now() - this.startedAt) / SHIMMER_INTERVAL_MS)
          : undefined;
      const header = mode.header(colored, phase);

      return body.length > 0 ? `${header}\n\n${body}` : header;
    }
  }

  const tasks = new Listr<Ctx, typeof ShimmerRenderer>(steps, {
    // Steps run sequentially; per-agent failures are contained by the inner list.
    // exitOnError aborts on an unexpected throw (e.g. the prompt erroring).
    // Under vitest we silence the renderer so test runs do not paint.
    concurrent: false,
    exitOnError: true,
    renderer: ShimmerRenderer,
    silentRendererCondition: !!process.env.VITEST,
    rendererOptions: {
      // Render streamed command output (the OUTPUT log level) in gray so it
      // reads as secondary to the task titles.
      color: { [ListrDefaultRendererLogLevels.OUTPUT]: (text) => color.gray(text ?? "") },
      spinner: new DiamondSpinner(),
      // Diamond-themed icons in place of listr's defaults.
      icon: {
        [ListrDefaultRendererLogLevels.COMPLETED]: "◆",
        [ListrDefaultRendererLogLevels.OUTPUT]: "◦",
        [ListrDefaultRendererLogLevels.OUTPUT_WITH_BOTTOMBAR]: "◦",
        [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]: "◇",
        [ListrDefaultRendererLogLevels.FAILED]: "✕",
      },
    },
  });

  const ctx: Ctx = {
    detections: [],
    selected: [],
    results: [],
    affected: [],
    cancelled: false,
  };

  try {
    await tasks.run(ctx);
  } catch (err) {
    // exitOnError rejects here on an unexpected task failure. Surface it cleanly
    // and report failure rather than crashing with an unhandled rejection.
    console.error(err instanceof Error ? err.message : String(err));
    return false;
  }

  // A cancelled prompt did nothing — report failure so the exit code
  // distinguishes an aborted run from a clean one.
  if (ctx.cancelled) {
    return false;
  }

  if (ctx.affected.length > 0) {
    console.log(mode.closing(ctx.affected));
  }

  return ctx.results.every(installSucceeded);
}
