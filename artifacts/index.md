<!-- AUTO-GENERATED:START -->
# Artifacts Index

## Project Context
- Project: D365 Delivery Project
- Environment Profile: not-set
- Last Updated: 2026-04-28
- Maintainer: OpenCode Harness

## Latest Workflow Outputs
| Workflow | Status | Primary Output | Supporting Outputs | Last Updated |
|---|---|---|---|---|
| requirementAnalysis | draft | `artifacts/requirement-analysis/requirements-summary.md` | artifacts/requirement-analysis/assumptions.md, artifacts/requirement-analysis/entity-scope.md | - |
| fitGapAnalysis | draft | `artifacts/fit-gap-analysis/fit-gap-analysis.md` | artifacts/fit-gap-analysis/decision-log.md | - |
| pluginDevelopment | draft | `artifacts/plugin-development/plugin-design.md` | artifacts/plugin-development/plugin-registration.md, artifacts/plugin-development/test-results/ | - |
| webresourceDevelopment | draft | `artifacts/webresource-development/design.md` | artifacts/webresource-development/test-results/, artifacts/webresource-development/deployment-notes.md | - |
| pcfDevelopment | draft | `artifacts/pcf-development/design.md` | artifacts/pcf-development/build-output/, artifacts/pcf-development/deployment-notes.md | - |
| powerAutomate | draft | `artifacts/power-automate/flow-analysis.md` | artifacts/power-automate/filter-design.md, artifacts/power-automate/test-checklist.md | - |
| solutionRelease | draft | `artifacts/solution-release/release-note.md` | artifacts/solution-release/deployment-checklist.md, artifacts/solution-release/comparison-report.md | - |
| uatTesting | draft | `artifacts/uat-testing/uat-test-cases.md` | artifacts/uat-testing/coverage-matrix.md | - |
| securityMatrix | draft | `artifacts/security-matrix/security-matrix.md` | artifacts/security-matrix/assumptions.md | - |
| cutoverPlan | draft | `artifacts/cutover-plan/cutover-plan.md` | artifacts/cutover-plan/rollback-plan.md, artifacts/cutover-plan/validation-checklist.md | - |
| productionSupport | draft | `artifacts/production-support/incident-analysis.md` | artifacts/production-support/root-cause.md, artifacts/production-support/recovery-plan.md | - |

## PM Summary View
| Workflow | Suggested Owner | Delivery Status | Next Action | Main Deliverable | Last Updated |
|---|---|---|---|---|---|
| requirementAnalysis | BA / Solution Architect | draft | Generate or refresh deliverables | `artifacts/requirement-analysis/requirements-summary.md` | - |
| fitGapAnalysis | Architect / Delivery Lead | draft | Generate or refresh deliverables | `artifacts/fit-gap-analysis/fit-gap-analysis.md` | - |
| pluginDevelopment | Engineering Lead | draft | Generate or refresh deliverables | `artifacts/plugin-development/plugin-design.md` | - |
| webresourceDevelopment | Engineering Lead | draft | Generate or refresh deliverables | `artifacts/webresource-development/design.md` | - |
| pcfDevelopment | Engineering Lead | draft | Generate or refresh deliverables | `artifacts/pcf-development/design.md` | - |
| powerAutomate | Automation Lead | draft | Generate or refresh deliverables | `artifacts/power-automate/flow-analysis.md` | - |
| solutionRelease | Release Manager | draft | Generate or refresh deliverables | `artifacts/solution-release/release-note.md` | - |
| uatTesting | QA Lead | draft | Generate or refresh deliverables | `artifacts/uat-testing/uat-test-cases.md` | - |
| securityMatrix | Security Architect | draft | Generate or refresh deliverables | `artifacts/security-matrix/security-matrix.md` | - |
| cutoverPlan | Release Manager | draft | Generate or refresh deliverables | `artifacts/cutover-plan/cutover-plan.md` | - |
| productionSupport | Support Lead | draft | Generate or refresh deliverables | `artifacts/production-support/incident-analysis.md` | - |

## Gate Summary
| Gate | Latest Status | Scope | Notes |
|---|---|---|---|
| security.gate.md | WARN | requirementAnalysis | Pending formal gate execution evidence |
| production-safety.gate.md | WARN | requirementAnalysis | Pending formal gate execution evidence |
| code-quality.gate.md | WARN | pluginDevelopment | Pending formal gate execution evidence |
| d365-plugin.gate.md | WARN | pluginDevelopment | Pending formal gate execution evidence |
| d365-webresource.gate.md | WARN | webresourceDevelopment | Pending formal gate execution evidence |
| power-automate.gate.md | WARN | powerAutomate | Pending formal gate execution evidence |
| d365-solution.gate.md | WARN | solutionRelease | Pending formal gate execution evidence |
| release-readiness.gate.md | WARN | solutionRelease | Pending formal gate execution evidence |

## Current Recommended Review Order
1. `artifacts/requirement-analysis/requirements-summary.md`
2. `artifacts/solution-release/release-note.md`
3. `artifacts/cutover-plan/cutover-plan.md`

## Delivery Notes
- Update this section with approved delivery highlights, blockers, or escalation notes when a workflow closes.
<!-- AUTO-GENERATED:END -->

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

## PM-Oriented Table Template

For project managers and delivery leads, use the following table in the generated section or in review packs.

```markdown
## PM Summary View
| Workflow | Suggested Owner | Delivery Status | Next Action | Main Deliverable | Last Updated |
|---|---|---|---|---|---|
| requirementAnalysis | BA / Solution Architect | approved | Move into fit-gap and design review | `artifacts/requirement-analysis/requirements-summary.md` | 2026-04-27 |
| pluginDevelopment | Engineering Lead | in_review | Close plugin gate and confirm test evidence | `artifacts/plugin-development/plugin-design.md` | 2026-04-27 |
| solutionRelease | Release Manager | blocked | Resolve release-readiness blockers before deployment | `artifacts/solution-release/deployment-checklist.md` | 2026-04-27 |
```

Suggested PM interpretation:

- `Suggested Owner`: who is expected to drive the next step
- `Delivery Status`: where the work stands from a delivery-governance perspective
- `Next Action`: the shortest next operational action to keep delivery moving
- `Main Deliverable`: the first file a PM or lead should review
- `Last Updated`: latest known artifact update date

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
Refresh the PM Summary View as part of the update.
Only include stable delivery artifacts. Do not include secrets, transient debug files, or raw sensitive logs.
Output the modified file list when done.
```

## Maintainer Note

If your project needs stricter governance, treat `artifacts/index.md` as the project delivery register and require every workflow execution to update it before closing the task.



