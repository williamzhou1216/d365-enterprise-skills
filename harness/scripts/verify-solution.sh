#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: ./harness/scripts/verify-solution.sh <solution-folder> [solution-zip] [--run-pac-checker]"
  exit 1
fi

SOLUTION_FOLDER="$1"
SOLUTION_ZIP="${2:-}"
RUN_PAC_CHECKER="${3:-}"
PROFILE_NAME="${D365_PROFILE:-not-set}"

echo "[info] D365_PROFILE: $PROFILE_NAME"

if [ ! -d "$SOLUTION_FOLDER" ]; then
  echo "[error] Solution folder not found: $SOLUTION_FOLDER"
  exit 1
fi

if [ ! -f "$SOLUTION_FOLDER/Other/Solution.xml" ] && [ ! -f "$SOLUTION_FOLDER/customizations.xml" ]; then
  echo "[error] Solution folder does not look like an unpacked Dataverse solution."
  exit 1
fi

echo "[info] Solution folder structure looks valid."

if [ -n "$SOLUTION_ZIP" ] && [ ! -f "$SOLUTION_ZIP" ]; then
  echo "[error] Solution zip not found: $SOLUTION_ZIP"
  exit 1
fi

if [ "$RUN_PAC_CHECKER" = "--run-pac-checker" ]; then
  if ! command -v pac >/dev/null 2>&1; then
    echo "[warn] pac CLI not found. Install Power Platform CLI before running checker-based validation."
    exit 0
  fi

  if [ -z "$SOLUTION_ZIP" ]; then
    echo "[warn] --run-pac-checker requested but solution zip not provided. Skipping checker run."
    exit 0
  fi

  echo "[info] Running pac solution checker..."
  pac solution checker --path "$SOLUTION_ZIP"
fi

echo "[info] verify-solution.sh completed."
