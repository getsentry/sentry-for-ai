import "./instrument";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineCommand, runMain } from "citty";
import { harnesses } from "./harnesses";
import { runInstaller } from "./ui";

const { version, description } = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
) as { version: string; description: string };

const install = defineCommand({
  meta: {
    name: "install",
    description: "Install the Sentry plugin into your detected AI coding assistants",
  },
  args: {
    // citty turns `--no-interactive` into `interactive: false` via its built-in
    // boolean negation, so the flag is modeled as `interactive` (default true)
    // rather than a separate `no-interactive` arg.
    interactive: {
      type: "boolean",
      description: "Prompt to select agents; pass --no-interactive to install every detected agent",
      default: true,
    },
    yes: {
      type: "boolean",
      alias: "y",
      description: "Alias for --no-interactive",
      default: false,
    },
  },
  async run({ args }) {
    const interactive = args.interactive && !args.yes;
    const ok = await runInstaller(harnesses, { interactive });
    process.exit(ok ? 0 : 1);
  },
});

const main = defineCommand({
  meta: {
    name: "sentry-ai",
    version,
    description,
  },
  subCommands: {
    install,
  },
});

const SUBCOMMANDS = new Set(["install"]);
const PASSTHROUGH = new Set(["--help", "-h", "--version"]);

// citty has no concept of a default subcommand, so `npx @sentry/ai` with no
// arguments would just print the help menu. Default to `install` instead unless
// the user gave an explicit subcommand or asked for help/version.
function withDefaultCommand(argv: string[]): string[] {
  const [first] = argv;
  if (first !== undefined && (SUBCOMMANDS.has(first) || PASSTHROUGH.has(first))) {
    return argv;
  }
  return ["install", ...argv];
}

runMain(main, { rawArgs: withDefaultCommand(process.argv.slice(2)) });
