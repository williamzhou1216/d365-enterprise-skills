# Artifacts Index Standard

## Purpose

`artifacts/index.md` is the master summary page for delivery outputs produced by the Harness workflows. It is intended to give project leads, architects, QA, support, and release managers one place to understand what has been generated, what status it is in, and which files should be reviewed next.

This file is a controlled summary, not a raw dump of every generated file.

## When To Update This Index

Update `artifacts/index.md` when:

1. a workflow produces a new delivery artifact set
2. an existing artifact is materially revised
3. a gate result changes from `WARN` to `PASS`, or to `BLOCK`
4. a release, cutover, or incident support package becomes the current reference set

## Standard Sections

Use the following structure.

```markdown
# Artifacts Index

## Project Context
- Project: <name>
- Environment Profile: <D365_PROFILE>
- Last Updated: <yyyy-mm-dd>
- Maintainer: <name or team>

## Latest Workflow Outputs
| Workflow | Status | Primary Output | Supporting Outputs | Last Updated |
|---|---|---|---|---|

## Gate Summary
| Gate | Latest Status | Scope | Notes |
|---|---|---|---|

## Current Recommended Review Order
1. <artifact path>
2. <artifact path>
3. <artifact path>

## Notes
- <important delivery note>
```

## Status Values

Recommended workflow status values:

- `draft`
- `in_review`
- `approved`
- `blocked`
- `superseded`

Recommended gate status values:

- `PASS`
- `WARN`
- `BLOCK`

## Recommended Entry Format

For each workflow, summarize only the latest approved or in-flight output set.

Example:

```markdown
| pluginDevelopment | in_review | `artifacts/plugin-development/plugin-design.md` | `plugin-registration.md`, `test-results/` | 2026-04-27 |
```

## Auto-Summary Rules

If OpenCode is asked to update `artifacts/index.md`, it should:

1. read the existing `artifacts/` directory structure
2. identify the latest workflow outputs that were created or materially changed
3. summarize only stable deliverables, not temporary scratch files
4. keep paths relative to the repo root
5. avoid listing secrets, raw logs with sensitive values, or transient local debug files
6. preserve previous approved entries unless they have been superseded

## Suggested Maintenance Rules

- one row per workflow in `Latest Workflow Outputs`
- keep the most current deliverable path first
- if a newer artifact supersedes an older one, update the row instead of appending duplicate rows
- if a workflow has not run yet, omit it rather than adding empty placeholders
- if a gate is blocking, place the blocker in `Gate Summary` and add the blocked artifact to `Current Recommended Review Order`

## Usage Suggestion Examples

### Example 1. After requirement analysis completes

Add or update rows such as:

```markdown
| requirementAnalysis | approved | `artifacts/requirement-analysis/requirements-summary.md` | `assumptions.md`, `entity-scope.md` | 2026-04-27 |
```

### Example 2. After plugin work enters review

Add or update rows such as:

```markdown
| pluginDevelopment | in_review | `artifacts/plugin-development/plugin-design.md` | `plugin-registration.md`, `test-results/` | 2026-04-27 |
```

If `d365-plugin.gate.md` is not yet fully passed, record:

```markdown
| d365-plugin.gate.md | WARN | Plugin registration and unit test evidence | Missing final reviewer sign-off |
```

### Example 3. Before production release

Put the release artifacts at the top of the review order:

```markdown
## Current Recommended Review Order
1. `artifacts/solution-release/deployment-checklist.md`
2. `artifacts/cutover-plan/cutover-plan.md`
3. `artifacts/cutover-plan/rollback-plan.md`
```

## Copy-Ready OpenCode Instruction Example

```text
Read artifacts/README.md and artifacts/index.md.
Inspect the current artifacts/ subfolders.
Update artifacts/index.md to summarize the latest workflow outputs, gate statuses, and recommended review order.
Only include stable delivery artifacts. Do not include secrets, transient debug files, or raw sensitive logs.
Output the modified file list when done.
```

## Maintainer Note

If your project needs stricter governance, treat `artifacts/index.md` as the project delivery register and require every workflow execution to update it before closing the task.
