#!/usr/bin/env bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/skills"

NESTED_SKILL="$(find "$SRC_DIR" -mindepth 3 -type f -name "SKILL.md" -print -quit)"
if [ -n "$NESTED_SKILL" ]; then
  echo "Nested skill is not allowed: $NESTED_SKILL" >&2
  exit 1
fi

MISSING_SKILL="$(find "$SRC_DIR" -mindepth 1 -maxdepth 1 -type d ! -exec test -f '{}/SKILL.md' \; -print -quit)"
if [ -n "$MISSING_SKILL" ]; then
  echo "Directory without SKILL.md: $MISSING_SKILL" >&2
  exit 1
fi

echo "Flat skills verified."
