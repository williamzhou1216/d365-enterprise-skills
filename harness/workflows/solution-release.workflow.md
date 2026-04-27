# Solution Release Workflow

## Goal
Analyze, verify, and document solution release contents so that deployment teams can promote changes with clear validation, rollback, and release communications.

## Applicable Scenarios
- unpacked solution review
- release note generation
- solution comparison between versions
- deployment checklist preparation

## Inputs
- unpacked solution folder(s)
- release version or tag
- target deployment environment path

## Input Files
- solution folder under `solutions/unpacked/` or equivalent
- optional base solution folder for comparison
- optional release manifest or change log

## Required Context
- current `D365_PROFILE`
- target environment type and readonly state
- release scope and target version
- whether the deployment is Online or On-Premises

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_analyze_solution_folder`
- `d365_compare_solution_folders`
- `d365_generate_release_note`
- `d365_generate_deployment_checklist`

## Tooling And Build Requirements
- `pac` CLI: Yes
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: identify solution scope, release version, base comparison point, and deployment target.
2. Execute: verify solution folder structure, compare changes, and collect release-impact observations.
3. Validate: run solution quality gate, confirm missing dependencies, environment variables, and deployment prerequisites.
4. Review: prepare release note, deployment checklist, and rollback expectations for stakeholders.
5. Deliver: publish release package summary, change comparison, and readiness result.

## Quality Gates
- `d365-solution.gate.md`
- `release-readiness.gate.md`
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/solution-release/release-note.md`
- `artifacts/solution-release/deployment-checklist.md`
- `artifacts/solution-release/comparison-report.md`

## Safety Rules
- production import is out of scope unless explicitly approved
- use `pac` for pack/unpack discipline where applicable
- do not hide unmanaged dependencies or missing environment variables
- release note and rollback content must be customer-safe and operationally clear

## Acceptance Criteria
- release scope is clear and compared against the baseline when available
- deployment checklist is complete and actionable
- rollback and validation steps are documented
- solution gate and release-readiness gate have no unresolved blockers
