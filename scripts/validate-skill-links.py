#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# ///
#
# validate-skill-links.py — Fail the build on a skill link that won't resolve.
#
# Every shipped skill must be self-contained: each relative link in its markdown
# has to point at a file that exists inside that skill's own directory. This
# runs against a BUILT plugin tree, so what it checks is the artifact users
# actually install — after reference hydration and after each agent's transform.
#
# Checking the built tree rather than the source is what makes this trustworthy.
# The source tree cannot answer the question on its own: skills link
# `references/...` paths that only exist once the build hydrates them, so any
# source-level check has to re-implement the hydrator's glob semantics and can
# drift from it. Here there is nothing to simulate.
#
# Pass --references (the source library) to get a cause rather than a symptom:
# a link whose target is missing from the built skill but present in the library
# means the skill's references.yml never declared it, so hydration skipped it.
# That is the failure mode a manifest makes easy to hit and hard to see.
#
# Usage:
#   uv run --script validate-skill-links.py --skills <built-skills-dir> \
#       [--references <source-library>] [--label <name>]

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Markdown inline links whose target ends in .md — the only kind that must
# resolve on disk. Anchors are stripped; external URLs are skipped.
LINK_RE = re.compile(r"\]\(([^)]+?\.md)(#[^)]*)?\)")


def check_skill(skill: Path, references: Path | None) -> list[str]:
    hydrated_root = (skill / "references").resolve()
    errors: list[str] = []

    for md in sorted(skill.rglob("*.md")):
        for target, _anchor in LINK_RE.findall(md.read_text(encoding="utf-8")):
            if target.startswith(("http://", "https://", "mailto:")):
                continue

            resolved = (md.parent / target).resolve()
            if resolved.is_file():
                continue

            where = f"{md.relative_to(skill.parent)} -> {target}"

            # Missing. If the source library has it, the manifest is the cause.
            if references is not None:
                try:
                    rel = resolved.relative_to(hydrated_root).as_posix()
                except ValueError:
                    rel = None

                if rel and (references / rel).is_file():
                    errors.append(
                        f"{where}: '{rel}' exists in the reference library but was not "
                        "hydrated — add it to this skill's references.yml"
                    )
                    continue

            errors.append(f"{where}: dangling link (no such file)")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate that every skill link resolves.")
    parser.add_argument("--skills", type=Path, required=True, help="Built skills dir (one subdir per skill)")
    parser.add_argument("--references", type=Path, default=None, help="Source reference library, for better diagnostics")
    parser.add_argument("--label", default="", help="Name for this tree in the summary line")
    args = parser.parse_args()

    skills = sorted(p for p in args.skills.iterdir() if (p / "SKILL.md").is_file())
    if not skills:
        parser.error(f"no skills found under {args.skills}")

    failures = 0
    for skill in skills:
        errors = check_skill(skill, args.references)
        failures += len(errors)
        for error in errors:
            print(f"error: {error}", file=sys.stderr)

    label = f"{args.label}: " if args.label else ""
    print(f"{label}checked links in {len(skills)} built skills, {failures} error(s)")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
