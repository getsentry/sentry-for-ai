#!/usr/bin/env python3
"""Generate semantic-convention attribute lookup files for skill references.

Source: https://getsentry.github.io/sentry-conventions/api/attributes.json
Writes stable-only domain files under src/references/semantics/.
Re-run when conventions change. Generated markdown is checked in on purpose.
"""

from __future__ import annotations

import json
import urllib.request
from collections import defaultdict
from pathlib import Path

SOURCE_URL = "https://getsentry.github.io/sentry-conventions/api/attributes.json"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "src" / "references" / "semantics"


def fetch_attributes() -> list[dict]:
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as resp:
        return json.load(resp)


def main() -> None:
    attrs = fetch_attributes()
    stable = [a for a in attrs if not a.get("deprecated")]
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for a in stable:
        cat = a.get("category") or "general"
        by_cat[cat].append(a)

    for cat in by_cat:
        by_cat[cat].sort(key=lambda a: a["key"])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.md"):
        old.unlink()

    for cat, items in sorted(by_cat.items()):
        lines = [
            f"# {cat} attributes",
            "",
            f"Stable Sentry semantic convention attributes for `{cat}`.",
            "Generated — do not edit by hand. Re-run `scripts/gen-semantics.py`.",
            "",
            "| Key | Type | Brief |",
            "| --- | --- | --- |",
        ]
        for a in items:
            key = a["key"].replace("|", "\\|")
            typ = str(a.get("type", "")).replace("|", "\\|")
            brief = str(a.get("brief", "")).replace("|", "\\|").replace("\n", " ")
            lines.append(f"| `{key}` | `{typ}` | {brief} |")
        lines.append("")
        (OUT_DIR / f"{cat}.md").write_text("\n".join(lines), encoding="utf-8")

    print(f"wrote {len(by_cat)} domain files ({len(stable)} stable attrs) -> {OUT_DIR.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
