/**
 * Which build of the plugin a harness installs.
 *
 * `ref` is a git ref in the plugin's distribution repository. Omitting it
 * installs the stable channel, which means the repository's default branch — and
 * for Claude, the vendor's official marketplace rather than our repository at
 * all. The CLI only exposes `--develop`, so in practice `ref` is either
 * undefined or `"develop"`; it is modeled as a ref so pinning a release tag
 * later needs no new plumbing.
 */
export interface HarnessOptions {
  ref?: string;
  /**
   * Ignore the channel when deciding what counts as installed. `remove` sets it
   * so it takes out whatever build is present instead of only the channel it was
   * built for — a develop install has to be removable by a plain `remove`.
   */
  anyChannel?: boolean;
}

/**
 * The branch each distribution repository publishes releases on. The stable
 * channel tracks it by passing no ref at all, so this is only needed where a
 * harness has to name the branch it expects to already be on.
 */
export const STABLE_BRANCH = "main";

/**
 * Whether these options ask for a pre-release build.
 *
 * Anything other than the release branch counts, so `--develop` reads as
 * pre-release while an explicit `main` reads as stable. A future release-tag
 * pin would land on the wrong side of this and needs revisiting alongside
 * {@link isDevelopVersion}.
 */
function wantsDevelop(options: HarnessOptions): boolean {
  return options.ref !== undefined && options.ref !== STABLE_BRANCH;
}

/**
 * Whether an installed plugin's version string is a develop build.
 *
 * `scripts/dev-version.sh` stamps every develop build with a `-dev.` prerelease
 * (`1.2.1-dev.14.gdeadbee`) and a release never carries one, so the version is
 * the channel marker for the harnesses whose plugin id is identical on both
 * channels.
 */
export function isDevelopVersion(version: string | null | undefined): boolean {
  return (version ?? "").includes("-dev.");
}

/**
 * Whether an installed plugin belongs to the channel that was asked for. Used to
 * decide whether an existing install counts as "already installed" or as the
 * other channel's copy that has to be replaced. Always true under
 * {@link HarnessOptions.anyChannel}.
 */
export function matchesChannel(
  version: string | null | undefined,
  options: HarnessOptions,
): boolean {
  if (options.anyChannel) {
    return true;
  }

  return isDevelopVersion(version) === wantsDevelop(options);
}
