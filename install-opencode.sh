#!/usr/bin/env bash
set -e
REPO_DIR="${1:-$HOME/.d365-enterprise-skills}"
TARGET_DIR="$HOME/.config/opencode/skills"

[ -d "$REPO_DIR" ] || git clone https://github.com/williamzhou1216/d365-enterprise-skills.git "$REPO_DIR"
git -C "$REPO_DIR" pull || true

"$REPO_DIR/scripts/build_flat_skills.sh"

mkdir -p "$TARGET_DIR"

for d in "$REPO_DIR"/skills/*; do
  [ -d "$d" ] || continue
  [ -f "$d/SKILL.md" ] || continue
  skill_name="$(basename "$d")"
  rm -rf "$TARGET_DIR/$skill_name"
  ln -sfn "$d" "$TARGET_DIR/$skill_name"
done

echo "Installed for OpenCode"
