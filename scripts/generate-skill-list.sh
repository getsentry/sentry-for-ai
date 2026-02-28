#!/usr/bin/env bash
# Generates a markdown list of skills from skills/*/SKILL.md frontmatter.
# Used by the release workflow to keep the "Included Skills" section current.

set -euo pipefail

SKILLS_DIR="${1:-skills}"

for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  [ -f "$skill_file" ] || continue

  name=""
  desc=""
  in_frontmatter=false

  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if $in_frontmatter; then
        break
      else
        in_frontmatter=true
        continue
      fi
    fi
    if $in_frontmatter; then
      if [[ "$line" =~ ^name:\ *(.*) ]]; then
        name="${BASH_REMATCH[1]}"
      elif [[ "$line" =~ ^description:\ *(.*) ]]; then
        # Take only the first sentence (up to first period followed by space or end)
        raw="${BASH_REMATCH[1]}"
        desc=$(echo "$raw" | sed 's/\. .*/\./')
      fi
    fi
  done < "$skill_file"

  if [[ -n "$name" && -n "$desc" ]]; then
    echo "- \`$name\` - $desc"
  fi
done
