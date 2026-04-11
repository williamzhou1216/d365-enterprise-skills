#!/usr/bin/env bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/skills"
OPENCODE_DIR="$ROOT_DIR/opencode-skills"
OPENCLAW_DIR="$ROOT_DIR/openclaw-skills"

rm -rf "$OPENCODE_DIR" "$OPENCLAW_DIR"
mkdir -p "$OPENCODE_DIR" "$OPENCLAW_DIR"

find "$SRC_DIR" -type f -name "SKILL.md" | while read skill_file; do
  skill_dir="$(dirname "$skill_file")"
  skill_name="$(basename "$skill_dir")"

  mkdir -p "$OPENCODE_DIR/$skill_name"
  mkdir -p "$OPENCLAW_DIR/$skill_name"

  cp "$skill_file" "$OPENCODE_DIR/$skill_name/SKILL.md"
  cp "$skill_file" "$OPENCLAW_DIR/$skill_name/SKILL.md"
done

echo "Flat skills generated."
