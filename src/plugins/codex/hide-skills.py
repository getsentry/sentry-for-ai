#!/usr/bin/env python3
#
# hide-skills.py — Per-skill transform for the Codex distribution.
#
# Codex's validator REJECTS `disable-model-invocation` in SKILL.md frontmatter.
# Its native equivalent is a per-skill `agents/openai.yaml` carrying
# `policy.allow_implicit_invocation: false`. For every skill the source marks
# `disable-model-invocation: true`, we strip that line and emit an
# `agents/openai.yaml` that hides it. The router skills (which lack the field)
# stay implicitly invocable.
#
# Usage: hide-skills.py <SKILLS_DIR>

import sys
from pathlib import Path


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def split_frontmatter(text: str):
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    return text[4:end], text[end + 4:]


def parse_fields(fm: str) -> dict:
    fields = {}
    for line in fm.splitlines():
        if ":" not in line or line[:1] in (" ", "\t", "#"):
            continue
        key, _, val = line.partition(":")
        fields[key.strip()] = val.strip()
    return fields


def display_name(body: str, name: str) -> str:
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return name


def short_description(desc: str) -> str:
    sentence = desc.split(". ")[0].strip().rstrip(".")
    if len(sentence) > 80:
        sentence = sentence[:77].rsplit(" ", 1)[0] + "..."
    return sentence or "Sentry skill"


def main() -> None:
    skills_dir = Path(sys.argv[1])

    leaves = 0
    for skill_md in sorted(skills_dir.glob("*/SKILL.md")):
        text = skill_md.read_text(encoding="utf-8")
        fm, body = split_frontmatter(text)
        if fm is None:
            continue
        fields = parse_fields(fm)

        if fields.get("disable-model-invocation") != "true":
            continue

        kept = [ln for ln in text.splitlines(keepends=True)
                if not ln.lstrip().startswith("disable-model-invocation:")]
        skill_md.write_text("".join(kept), encoding="utf-8")

        agents_dir = skill_md.parent / "agents"
        agents_dir.mkdir(exist_ok=True)
        dn = display_name(body, fields.get("name", skill_md.parent.name))
        sd = short_description(fields.get("description", dn))
        (agents_dir / "openai.yaml").write_text(
            "interface:\n"
            f"  display_name: {yaml_quote(dn)}\n"
            f"  short_description: {yaml_quote(sd)}\n"
            "policy:\n"
            "  allow_implicit_invocation: false\n",
            encoding="utf-8",
        )
        leaves += 1

    print(f"hidden leaves: {leaves}")


if __name__ == "__main__":
    main()
