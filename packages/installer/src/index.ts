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
    "no-interactive": {
      type: "boolean",
      description: "Skip the selector and install every detected agent",
      default: false,
    },
    yes: {
      type: "boolean",
      alias: "y",
      description: "Alias for --no-interactive",
      default: false,
    },
  },
  async run({ args }) {
    const interactive = !(args["no-interactive"] || args.yes);
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

runMain(main);
