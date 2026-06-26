#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = ["pyyaml", "braceexpand"]
# ///
#
# hydrate-references.py — Copy each skill's declared shared references into it.
#
# Task skills keep large, shared reference material (per-platform SDK guides,
# per-signal concepts) in a single maintained library rather than duplicating
# it across skills. Each skill declares what it needs in a `references.yml`
# manifest; at build time this script walks a skills directory and, for every
# skill that has a manifest, expands those patterns against the library and
# copies the matches into the built skill, so the shipped skill is
# self-contained.
#
# The manifest is a build-time artifact — it is removed from each output skill so
# it never ships in the plugin.
#
# Manifest format (<skills-source>/<skill>/references.yml):
#
#     needs:
#       - sdks/*/{index,error-monitoring,tracing}.md
#       - concepts/{errors,tracing}.md
#       - setup-verification.md
#
# Paths are relative to --references; `*`, `**`, and `{a,b}` brace groups are
# supported. A matched file at `<references>/<rel>` is copied to
# `<skills-output>/<skill>/references/<rel>`.
#
# Run via uv so the dependencies above are resolved automatically:
#   uv run --script hydrate-references.py \
#       --references <dir> --skills-source <dir> --skills-output <dir>

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import yaml
from braceexpand import braceexpand


def parse_needs(manifest: Path) -> list[str]:
    """Read the `needs:` list out of a references.yml manifest."""
    data = yaml.safe_load(manifest.read_text(encoding="utf-8")) or {}
    needs = data.get("needs", [])
    if not isinstance(needs, list):
        raise ValueError(f"{manifest}: 'needs' must be a list of paths")
    return [str(item) for item in needs]


def hydrate(references: Path, manifest: Path, output: Path) -> int:
    copied = 0
    for pattern in parse_needs(manifest):
        for expanded in braceexpand(pattern):
            matches = [m for m in sorted(references.glob(expanded)) if m.is_file()]
            if not matches:
                print(f"warning: no match for '{expanded}' under {references}", file=sys.stderr)
                continue
            for match in matches:
                dest = output / "references" / match.relative_to(references)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(match, dest)
                copied += 1
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy each skill's declared shared references into it.")
    parser.add_argument("--references", type=Path, required=True, help="Shared reference library root")
    parser.add_argument("--skills-source", type=Path, required=True, help="Source skills dir (each skill may hold a references.yml)")
    parser.add_argument("--skills-output", type=Path, required=True, help="Built skills dir to copy references into")
    args = parser.parse_args()

    manifests = sorted(args.skills_source.glob("*/references.yml"))
    if manifests and not args.references.is_dir():
        parser.error(f"references library not found: {args.references}")

    for manifest in manifests:
        skill = manifest.parent.name
        output = args.skills_output / skill
        if not output.is_dir():
            continue
        copied = hydrate(args.references, manifest, output)
        # The manifest is a build-time artifact; never let it ship in the plugin.
        (output / "references.yml").unlink(missing_ok=True)
        print(f"{skill}: hydrated {copied} reference(s)")


if __name__ == "__main__":
    main()
