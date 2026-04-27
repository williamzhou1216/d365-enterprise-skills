# Harness Execution Entrypoints

## Purpose

This document explains how to start a Harness workflow in a repeatable way so that OpenCode follows the same delivery contract every time.

The entrypoint model is intentionally simple:

1. Pick a workflow key from `harness.config.json`.
2. Confirm `D365_PROFILE`.
3. Use an entrypoint helper script to print the workflow definition and a copy-ready OpenCode instruction block.
4. Run that instruction in OpenCode.
5. Review outputs in `artifacts/` and apply the required gates.

## Available Entrypoints

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\invoke-harness.ps1 -Workflow requirementAnalysis
```

Linux / macOS:

```bash
./harness/scripts/invoke-harness.sh requirementAnalysis
```

## Supported Workflow Keys

- `requirementAnalysis`
- `fitGapAnalysis`
- `pluginDevelopment`
- `webresourceDevelopment`
- `pcfDevelopment`
- `powerAutomate`
- `solutionRelease`
- `uatTesting`
- `securityMatrix`
- `cutoverPlan`
- `productionSupport`

## What The Entrypoint Script Does

The helper script:

- reads `harness/harness.config.json`
- verifies that the workflow key exists
- prints the workflow file path
- prints required MCP tools, gates, and output paths
- prints a copy-ready OpenCode prompt block

The helper script does not:

- perform CRM writes
- authenticate to CRM for you
- bypass `readonly`
- expose secrets or passwords

## Recommended Operator Sequence

1. Set `D365_PROFILE`.
2. Run the harness entrypoint helper.
3. Copy the generated prompt into OpenCode.
4. Let OpenCode call `d365_get_current_profile` and `d365_test_connection` first.
5. Let OpenCode execute the referenced workflow and gates.
6. Review generated files under `artifacts/<workflow-folder>/`.

## Example: Requirement Analysis

```powershell
$env:D365_PROFILE = "customerA-online-dev"
powershell -ExecutionPolicy Bypass -File .\harness\scripts\invoke-harness.ps1 -Workflow requirementAnalysis
```

## Example: Plugin Development

```powershell
$env:D365_PROFILE = "customerA-online-dev"
powershell -ExecutionPolicy Bypass -File .\harness\scripts\invoke-harness.ps1 -Workflow pluginDevelopment
```

## Example: Solution Release

```powershell
$env:D365_PROFILE = "customerA-online-dev"
powershell -ExecutionPolicy Bypass -File .\harness\scripts\invoke-harness.ps1 -Workflow solutionRelease
```

## Production Safety Notes

- If the target environment is production, treat execution as read-only unless explicit confirmation exists.
- If the profile indicates `readonly=true`, OpenCode must not attempt write-class operations.
- On-Premises AD / ADFS / IFD projects must document connector limitations before any action that could be interpreted as environment mutation.

## Artifact Handling Notes

- Write delivery outputs into the matching `artifacts/<workflow-folder>/` directory.
- Keep generated evidence organized and named consistently.
- Do not save raw secrets, connection dumps, or exported credentials under `artifacts/`.
