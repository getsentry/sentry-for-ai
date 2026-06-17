#!/usr/bin/env bash
### Bumps the published package version during `craft prepare`.
###
### craft invokes this as: bump-version.sh <old-version> <new-version>
### The published artifact is built from packages/installer, so that is the
### package.json that must carry the release version -- the repo root is
### private and unversioned.
###
### Uses `npm pkg set` rather than pnpm: craft's container ships npm but not
### pnpm, and this is a plain package.json edit -- no install, lockfile, or
### git checks involved.
set -euo pipefail

NEW_VERSION="${2}"

cd "$(dirname "$0")/../packages/installer"
npm pkg set version="${NEW_VERSION}"
