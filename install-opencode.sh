#!/usr/bin/env bash
set -e
REPO_DIR="${1:-$HOME/.d365-enterprise-skills}"
TARGET_DIR="$HOME/.config/opencode/skills"

[ -d "$REPO_DIR" ] || git clone https://github.com/williamzhou1216/d365-enterprise-skills.git "$REPO_DIR"
git -C "$REPO_DIR" pull || true

"$REPO_DIR/scripts/build_flat_skills.sh"

mkdir -p "$TARGET_DIR"
rm -f "$TARGET_DIR"/* 2>/dev/null || true

for d in "$REPO_DIR"/opencode-skills/*; do
  [ -d "$d" ] && ln -sfn "$d" "$TARGET_DIR/$(basename "$d")"
done

echo "Installed for OpenCode"
