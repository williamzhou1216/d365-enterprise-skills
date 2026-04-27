#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: ./harness/scripts/invoke-harness.sh <workflowKey>"
  exit 1
fi

WORKFLOW="$1"
CONFIG_PATH="$(cd "$(dirname "$0")/.." && pwd)/harness.config.json"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Harness config not found: $CONFIG_PATH"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node.js to use invoke-harness.sh."
  exit 1
fi

PROFILE_NAME="${D365_PROFILE:-not-set}"

node - "$CONFIG_PATH" "$WORKFLOW" "$PROFILE_NAME" <<'NODE'
const fs = require('fs');

const configPath = process.argv[2];
const workflowKey = process.argv[3];
const profileName = process.argv[4];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const workflow = config.workflows[workflowKey];

if (!workflow) {
  console.error(`Workflow '${workflowKey}' was not found in harness.config.json`);
  process.exit(1);
}

console.log(`[info] Harness: ${config.name}`);
console.log(`[info] Workflow: ${workflowKey}`);
console.log(`[info] D365_PROFILE: ${profileName}`);
console.log(`[info] Workflow file: ${workflow.file}`);
console.log('');
console.log('Required tools:');
for (const tool of workflow.requiredTools) console.log(`- ${tool}`);
console.log('');
console.log('Quality gates:');
for (const gate of workflow.qualityGates) console.log(`- ${gate}`);
console.log('');
console.log('Output paths:');
for (const output of workflow.outputPaths) console.log(`- ${output}`);
console.log('');
console.log('Copy-ready OpenCode prompt:');
console.log('----------------------------------------');
console.log(`Use "${workflow.file}" as the execution contract.`);
console.log('First call d365_get_current_profile and d365_test_connection.');
console.log('Determine environment type and readonly state, then execute the workflow end-to-end.');
console.log(`Apply these quality gates: ${workflow.qualityGates.join(', ')}.`);
console.log(`Write deliverables to: ${workflow.outputPaths.join('; ')}.`);
console.log('Output the added or modified file list and do not reveal secrets.');
console.log('----------------------------------------');
NODE
