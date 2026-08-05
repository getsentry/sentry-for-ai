import type { OutputSink, SystemDeps } from "../system";
import type { Harness, InstallOutcome } from "./types";
import { type HarnessOptions } from "./channel";
import { detectOnPath, runCommand, runJson } from "./shell";

// The stable channel installs from Anthropic's official catalog, which only ever
// lists the release. A ref-pinned channel therefore has to come from our own
// distribution repo instead, whose `.claude-plugin/marketplace.json` declares the
// marketplace name below.
const OFFICIAL_MARKETPLACE = "claude-plugins-official";
const OFFICIAL_SOURCE = "anthropics/claude-plugins-official";
const OFFICIAL_PLUGIN_ID = `sentry@${OFFICIAL_MARKETPLACE}`;

const OUR_MARKETPLACE = "sentry-plugin-marketplace";
const OUR_REPO = "getsentry/plugin-claude";
const OUR_PLUGIN_ID = `sentry@${OUR_MARKETPLACE}`;

// `claude plugin list --json` emits an array of installed plugins. We only care
// about the marketplace-qualified id of each entry.
interface ClaudePlugin {
  id?: string;
}

// `claude plugin marketplace list --json` emits an array of registered
// marketplaces, each with a `name`.
interface ClaudeMarketplace {
  name?: string;
}

// Where a channel's plugin comes from. The two channels use different marketplace
// names, so both can stay registered at once and only the plugin installs
// conflict — which is what `cleanup` resolves.
interface Channel {
  marketplace: string;
  source: string;
  pluginId: string;
  conflictingPluginId: string;
}

function channelFor(options: HarnessOptions): Channel {
  if (options.ref === undefined) {
    return {
      marketplace: OFFICIAL_MARKETPLACE,
      source: OFFICIAL_SOURCE,
      pluginId: OFFICIAL_PLUGIN_ID,
      conflictingPluginId: OUR_PLUGIN_ID,
    };
  }

  // `owner/repo@ref` is how the GitHub shorthand pins a branch or tag.
  return {
    marketplace: OUR_MARKETPLACE,
    source: `${OUR_REPO}@${options.ref}`,
    pluginId: OUR_PLUGIN_ID,
    conflictingPluginId: OFFICIAL_PLUGIN_ID,
  };
}

async function installedIds(system: SystemDeps): Promise<string[]> {
  const plugins = await runJson<ClaudePlugin[]>(system, "claude plugin list --json");
  return Array.isArray(plugins)
    ? plugins.map((plugin) => plugin.id).filter((id): id is string => id !== undefined)
    : [];
}

async function hasPlugin(system: SystemDeps, pluginId: string): Promise<boolean> {
  return (await installedIds(system)).includes(pluginId);
}

async function isMarketplaceRegistered(system: SystemDeps, name: string): Promise<boolean> {
  const list = await runJson<ClaudeMarketplace[]>(system, "claude plugin marketplace list --json");
  return Array.isArray(list) && list.some((entry) => entry.name === name);
}

// A fresh CLI has no marketplaces registered, so register this channel's if it is
// missing; otherwise refresh its index so the plugin resolves. Required by both
// install and update.
//
// A ref-pinned channel always re-adds instead: `marketplace add` re-points an
// existing marketplace at a new source in place, and that is the only way to move
// an already-registered marketplace onto the requested ref. `marketplace update`
// would refresh it while leaving it on whatever ref it was added with.
async function ensureMarketplace(
  system: SystemDeps,
  channel: Channel,
  options: HarnessOptions,
  output?: OutputSink,
): Promise<void> {
  if (options.ref !== undefined) {
    await runCommand(system, `claude plugin marketplace add ${channel.source}`, output);
    return;
  }

  const registered = await isMarketplaceRegistered(system, channel.marketplace);
  await runCommand(
    system,
    registered
      ? `claude plugin marketplace update ${channel.marketplace}`
      : `claude plugin marketplace add ${channel.source}`,
    output,
  );
}

export function createClaude(system: SystemDeps, options: HarnessOptions = {}): Harness {
  const channel = channelFor(options);
  const installCommand = `claude plugin install ${channel.pluginId}`;
  const updateCommand = `claude plugin update ${channel.pluginId}`;

  // Which of our plugin ids to take out. Normally just this channel's; under
  // anyChannel every one that is present, so a plain `remove` clears a develop
  // install too — and both at once on a machine that ended up with each.
  const removableIds = async (): Promise<string[]> => {
    if (!options.anyChannel) {
      return [channel.pluginId];
    }

    const installed = await installedIds(system);
    return [OUR_PLUGIN_ID, OFFICIAL_PLUGIN_ID].filter((id) => installed.includes(id));
  };

  return {
    id: "claude",
    name: "Claude Code",

    detect: async () => detectOnPath(system, "claude"),

    isInstalled: async () => {
      const installed = await installedIds(system);
      return options.anyChannel
        ? installed.includes(OUR_PLUGIN_ID) || installed.includes(OFFICIAL_PLUGIN_ID)
        : installed.includes(channel.pluginId);
    },

    canInstall: async () => ({ ok: true }),

    cleanup: async (output) => {
      // Both channels install a plugin named `sentry`, so leaving the other one
      // in place means two copies of the same skills resolving at once. Going to
      // develop takes out the official marketplace's copy; coming back to stable
      // takes out ours.
      if (!(await hasPlugin(system, channel.conflictingPluginId))) {
        return null;
      }

      await runCommand(system, `claude plugin uninstall ${channel.conflictingPluginId}`, output);
      return `Removed conflicting plugin ${channel.conflictingPluginId}`;
    },

    install: async (output): Promise<InstallOutcome> => {
      await ensureMarketplace(system, channel, options, output);
      await runCommand(system, installCommand, output);
      return { kind: "done", command: installCommand };
    },

    update: async (output): Promise<InstallOutcome> => {
      await ensureMarketplace(system, channel, options, output);
      await runCommand(system, updateCommand, output);
      return { kind: "done", command: updateCommand };
    },

    remove: async (output): Promise<InstallOutcome> => {
      // Fall back to this channel's id when nothing is listed, so the command
      // still runs and its own error surfaces rather than silently doing nothing.
      const ids = await removableIds();
      const targets = ids.length > 0 ? ids : [channel.pluginId];
      const commands = targets.map((id) => `claude plugin uninstall ${id}`);

      for (const command of commands) {
        await runCommand(system, command, output);
      }

      return { kind: "done", command: commands.join(" && ") };
    },
  };
}
