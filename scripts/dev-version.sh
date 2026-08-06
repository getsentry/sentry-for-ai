#!/usr/bin/env bash
#
# dev-version.sh — Derive the version to stamp into an untagged plugin build.
#
# `develop` in each plugin repo is rebuilt on every merge, so its manifest needs a
# version that says which commit it came from. `git describe` supplies the parts:
#
#   plugin/v1.2.0-14-gdeadbee   ->   1.2.1-dev.14.gdeadbee
#
# The patch bump is what makes this ordered correctly, and it is the part worth
# not "simplifying" later. Semver ranks a prerelease BELOW its release, so
# `1.2.0-dev.14` would compare older than the 1.2.0 it is fourteen commits ahead
# of; build metadata (`+14.gdeadbee`) is ignored in comparisons entirely, so that
# form ties with 1.2.0 instead. Bumping the patch first puts every develop build
# strictly above the last release and strictly below the next one, which is also
# what setuptools-scm, MinVer, and GitVersion do with the same inputs.
#
# The bumped patch is a placeholder, not a prediction -- a develop build labelled
# 1.2.1-dev.14 is what ships as 1.3.0 if that is the release that follows.
#
# The commit count comes out of `git describe`, so the caller owes this script
# tags and history -- the deploy checks out with fetch-depth: 0 for that reason.
# Without them it falls back to the released version and counts the commits it can
# see, which in a shallow clone is the clone depth rather than the real distance.
#
# Usage: dev-version.sh   (prints the version; stamp it via PLUGIN_VERSION)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

read_released_version() {
    python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' \
        "$REPO_ROOT/src/plugins/version.json"
}

# --long keeps the -<count>-g<sha> suffix even when HEAD is exactly on a tag, so
# there is one shape to parse rather than two.
if described="$(git describe --tags --match 'plugin/v*' --long 2>/dev/null)"; then
    described="${described#plugin/v}"
    sha="${described##*-}"
    without_sha="${described%-*}"
    count="${without_sha##*-}"
    base="${without_sha%-*}"
else
    # No release tag reachable, or no tags fetched. Anchor to the version we
    # believe is released and count the whole history.
    base="$(read_released_version)"
    count="$(git rev-list --count HEAD)"
    sha="g$(git rev-parse --short HEAD)"
fi

# Bumping the patch below is arithmetic, so a base that is not three plain
# numbers has to stop here rather than evaluate to something silently wrong: bash
# reads the `rc1` of a `1.3.0-rc1` tag as an unset variable worth zero, which
# would quietly relabel the build 1.3.0.
if [[ ! "$base" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: cannot derive a dev version from '${base}'" >&2
    exit 1
fi

# HEAD is the release commit itself; it needs no dev suffix.
if [[ "$count" == "0" ]]; then
    echo "$base"
    exit 0
fi

IFS=. read -r major minor patch <<< "$base"
echo "${major}.${minor}.$((patch + 1))-dev.${count}.${sha}"
