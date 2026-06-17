#!/usr/bin/env bash
### Bumps the published package version during `craft prepare`.
###
### craft invokes this as: bump-version.sh <old-version> <new-version>
### The published artifact is built from packages/installer, so that is the
### package.json that must carry the release version -- the repo root is
### private and unversioned.
set -euo pipefail

NEW_VERSION="${2}"

cd "$(dirname "$0")/../packages/installer"
pnpm version "${NEW_VERSION}" --no-git-tag-version --no-git-checks --allow-same-version
