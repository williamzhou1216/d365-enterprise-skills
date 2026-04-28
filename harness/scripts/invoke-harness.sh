#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: ./harness/scripts/invoke-harness.sh <workflowKey> [--refresh-artifacts-index] [--project-name <name>] [--maintainer-name <name>]"
  exit 1
fi

WORKFLOW="$1"
shift

REFRESH_ARTIFACTS_INDEX="false"
PROJECT_NAME="D365 Delivery Project"
MAINTAINER_NAME="OpenCode Harness"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --refresh-artifacts-index)
      REFRESH_ARTIFACTS_INDEX="true"
      shift
      ;;
    --project-name)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --project-name"
        exit 1
      fi
      PROJECT_NAME="$2"
      shift 2
      ;;
    --maintainer-name)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --maintainer-name"
        exit 1
      fi
      MAINTAINER_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

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
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

node - "$CONFIG_PATH" "$WORKFLOW" "$PROFILE_NAME" "$REFRESH_ARTIFACTS_INDEX" "$PROJECT_NAME" "$MAINTAINER_NAME" "$REPO_ROOT" <<'NODE'
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2];
const workflowKey = process.argv[3];
const profileName = process.argv[4];
const refreshArtifactsIndex = process.argv[5] === 'true';
const projectName = process.argv[6];
const maintainerName = process.argv[7];
const repoRoot = process.argv[8];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const workflow = config.workflows[workflowKey];

if (!workflow) {
  console.error(`Workflow '${workflowKey}' was not found in harness.config.json`);
  process.exit(1);
}

function workflowKeyToFolderName(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function getDirectoryArtifacts(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = [];
  const walk = (currentPath) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name !== '.gitkeep') {
        const stat = fs.statSync(fullPath);
        entries.push({ fullPath, stat });
      }
    }
  };

  walk(dirPath);
  return entries.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
}

function getLatestWriteDate(files) {
  if (!files.length) {
    return '-';
  }

  return files
    .slice()
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0]
    .stat
    .mtime
    .toISOString()
    .slice(0, 10);
}

function buildWorkflowStatus(workflowConfig, files) {
  if (!files.length) {
    return 'draft';
  }

  const primaryOutput = workflowConfig.outputPaths?.[0];
  if (primaryOutput && fs.existsSync(path.join(repoRoot, primaryOutput))) {
    return 'in_review';
  }

  return 'draft';
}

function updateArtifactsIndex() {
  const artifactsRoot = config.artifactsRoot || 'artifacts';
  const indexPath = path.join(repoRoot, artifactsRoot, 'index.md');
  const today = new Date().toISOString().slice(0, 10);
  const workflowRows = [];
  const pmRows = [];
  const gateRows = [];
  const reviewOrder = [];

  const ownerMap = {
    requirementAnalysis: 'BA / Solution Architect',
    fitGapAnalysis: 'Architect / Delivery Lead',
    pluginDevelopment: 'Engineering Lead',
    webresourceDevelopment: 'Engineering Lead',
    pcfDevelopment: 'Engineering Lead',
    powerAutomate: 'Automation Lead',
    solutionRelease: 'Release Manager',
    uatTesting: 'QA Lead',
    securityMatrix: 'Security Architect',
    cutoverPlan: 'Release Manager',
    productionSupport: 'Support Lead'
  };

  for (const workflowOrderKey of config.workflowOrder || []) {
    const workflowConfig = config.workflows[workflowOrderKey];
    if (!workflowConfig) continue;

    const folderName = workflowKeyToFolderName(workflowOrderKey);
    const folderPath = path.join(repoRoot, artifactsRoot, folderName);
    const files = getDirectoryArtifacts(folderPath);
    const status = buildWorkflowStatus(workflowConfig, files);
    const primaryOutput = workflowConfig.outputPaths?.[0] || '-';
    const supportingOutputs = (workflowConfig.outputPaths || []).slice(1).join(', ') || '-';
    const updatedOn = getLatestWriteDate(files);
    const owner = ownerMap[workflowOrderKey] || 'Project Team';
    const nextAction = status === 'draft'
      ? 'Generate or refresh deliverables'
      : status === 'in_review'
        ? 'Review outputs and close gates'
        : 'Monitor for superseding changes';

    workflowRows.push(`| ${workflowOrderKey} | ${status} | \`${primaryOutput}\` | ${supportingOutputs} | ${updatedOn} |`);
    pmRows.push(`| ${workflowOrderKey} | ${owner} | ${status} | ${nextAction} | \`${primaryOutput}\` | ${updatedOn} |`);

    if (status !== 'draft') {
      reviewOrder.push(`1. \`${primaryOutput}\``);
    }

    for (const gate of workflowConfig.qualityGates || []) {
      if (!gateRows.some((row) => row.includes(`| ${gate} |`))) {
        gateRows.push(`| ${gate} | WARN | ${workflowOrderKey} | Pending formal gate execution evidence |`);
      }
    }
  }

  if (!reviewOrder.length) {
    reviewOrder.push(
      '1. `artifacts/requirement-analysis/requirements-summary.md`',
      '2. `artifacts/solution-release/release-note.md`',
      '3. `artifacts/cutover-plan/cutover-plan.md`'
    );
  }

  const generatedLines = [
    '<!-- AUTO-GENERATED:START -->',
    '# Artifacts Index',
    '',
    '## Project Context',
    `- Project: ${projectName}`,
    `- Environment Profile: ${profileName}`,
    `- Last Updated: ${today}`,
    `- Maintainer: ${maintainerName}`,
    '',
    '## Latest Workflow Outputs',
    '| Workflow | Status | Primary Output | Supporting Outputs | Last Updated |',
    '|---|---|---|---|---|',
    ...workflowRows,
    '',
    '## PM Summary View',
    '| Workflow | Suggested Owner | Delivery Status | Next Action | Main Deliverable | Last Updated |',
    '|---|---|---|---|---|---|',
    ...pmRows,
    '',
    '## Gate Summary',
    '| Gate | Latest Status | Scope | Notes |',
    '|---|---|---|---|',
    ...gateRows,
    '',
    '## Current Recommended Review Order',
    ...reviewOrder,
    '',
    '## Delivery Notes',
    '- Update this section with approved delivery highlights, blockers, or escalation notes when a workflow closes.',
    '<!-- AUTO-GENERATED:END -->'
  ];

  const generatedText = generatedLines.join('\n');
  const existingContent = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const startMarker = '<!-- AUTO-GENERATED:START -->';
  const endMarker = '<!-- AUTO-GENERATED:END -->';
  let updatedContent;

  if (existingContent.includes(startMarker) && existingContent.includes(endMarker)) {
    const pattern = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    updatedContent = existingContent.replace(pattern, generatedText);
  } else {
    updatedContent = `${generatedText}\n\n${existingContent}`;
  }

  fs.writeFileSync(indexPath, updatedContent, 'utf8');
  console.log(`[info] Refreshed artifacts index: ${indexPath}`);
  console.log('');
}

if (refreshArtifactsIndex) {
  updateArtifactsIndex();
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
