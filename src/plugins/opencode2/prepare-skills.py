#!/usr/bin/env python3
"""Translate hidden skill frontmatter to OpenCode V2's native metadata."""

import sys
from pathlib import Path


def transform(skill_file: Path) -> bool:
    lines = skill_file.read_text(encoding="utf-8").splitlines(keepends=True)
    if not lines or lines[0].rstrip("\r\n") != "---":
        return False

    try:
        end = next(i for i, line in enumerate(lines[1:], 1) if line.rstrip("\r\n") == "---")
    except StopIteration:
        return False

    hidden = next(
        (i for i, line in enumerate(lines[1:end], 1) if line.strip() == "disable-model-invocation: true"),
        None,
    )
    if hidden is None:
        return False

    del lines[hidden]
    end -= 1

    metadata = next(
        (i for i, line in enumerate(lines[1:end], 1) if line.rstrip("\r\n") == "metadata:"),
        None,
    )
    if metadata is None:
        lines[end:end] = ["metadata:\n", '  opencode/autoinvoke: "false"\n']
    else:
        metadata_end = metadata + 1
        while metadata_end < end and lines[metadata_end].startswith((" ", "\t")):
            if lines[metadata_end].strip().startswith("opencode/autoinvoke:"):
                raise SystemExit(f"{skill_file}: opencode/autoinvoke already exists")
            metadata_end += 1
        lines.insert(metadata_end, '  opencode/autoinvoke: "false"\n')

    skill_file.write_text("".join(lines), encoding="utf-8")
    return True


def main() -> None:
    skills_dir = Path(sys.argv[1])
    transformed = sum(transform(path) for path in sorted(skills_dir.glob("*/SKILL.md")))
    print(f"translated hidden skills: {transformed}")


if __name__ == "__main__":
    main()
