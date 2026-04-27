# Artifacts Directory Convention

## Purpose

The `artifacts/` directory is the standard output location for Harness workflow deliverables. It keeps generated delivery documents, test evidence, and release outputs separate from authored source files.

Use `artifacts/index.md` as the master summary page for the current approved or in-flight artifact set.

## Directory Rules

1. Each workflow writes to its own top-level folder under `artifacts/`.
2. Customer-facing documents should use stable, readable filenames.
3. Machine-generated evidence should go in subfolders such as `test-results/` or `build-output/`.
4. Do not store secrets, tokens, passwords, or raw environment exports in `artifacts/`.
5. Do not treat `artifacts/` as the source of truth for executable code.

## Standard Layout

```text
artifacts/
├── requirement-analysis/
├── fit-gap-analysis/
├── plugin-development/
│   └── test-results/
├── webresource-development/
│   └── test-results/
├── pcf-development/
│   └── build-output/
├── power-automate/
├── solution-release/
├── uat-testing/
├── security-matrix/
├── cutover-plan/
└── production-support/
```

## Workflow To Artifact Mapping

- `requirementAnalysis` -> `artifacts/requirement-analysis/`
- `fitGapAnalysis` -> `artifacts/fit-gap-analysis/`
- `pluginDevelopment` -> `artifacts/plugin-development/`
- `webresourceDevelopment` -> `artifacts/webresource-development/`
- `pcfDevelopment` -> `artifacts/pcf-development/`
- `powerAutomate` -> `artifacts/power-automate/`
- `solutionRelease` -> `artifacts/solution-release/`
- `uatTesting` -> `artifacts/uat-testing/`
- `securityMatrix` -> `artifacts/security-matrix/`
- `cutoverPlan` -> `artifacts/cutover-plan/`
- `productionSupport` -> `artifacts/production-support/`

## Recommended File Naming

- `requirements-summary.md`
- `fit-gap-analysis.md`
- `plugin-design.md`
- `plugin-registration.md`
- `design.md`
- `release-note.md`
- `deployment-checklist.md`
- `cutover-plan.md`
- `rollback-plan.md`
- `incident-analysis.md`

## Retention Guidance

- Keep generated artifacts that support delivery traceability.
- Remove temporary scratch files that do not contribute to project handoff.
- If an artifact includes customer-sensitive operational content, store only the approved form in Git.

## Index Maintenance

- Maintain `artifacts/index.md` as the human-readable summary register.
- Update the index after each completed workflow that produces delivery outputs.
- Keep only the current relevant artifact set visible in the summary tables.
