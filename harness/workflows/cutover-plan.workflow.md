# Cutover Plan Workflow

## Goal
Create an implementation-grade cutover plan with deployment sequencing, rollback actions, validation checkpoints, and environment-specific controls.

## Applicable Scenarios
- go-live planning
- major release deployment preparation
- Online or On-Premises production cutover governance

## Inputs
- target release scope
- source and target environments
- deployment constraints, blackout windows, and approval rules

## Input Files
- solution release outputs
- environment calendar or runbook inputs
- optional infrastructure change notes

## Required Context
- current `D365_PROFILE`
- available profiles and target environment mapping
- Online vs On-Premises deployment differences
- rollback window, owner list, and validation scope

## Required MCP Tools
- `d365_get_current_profile`
- `d365_list_profiles`
- `d365_test_connection`
- `d365_analyze_solution_folder`
- `d365_generate_release_note`
- `d365_generate_deployment_checklist`
- `d365_generate_cutover_plan`

## Tooling And Build Requirements
- `pac` CLI: Yes
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: identify environments, release content, freeze window, owners, and rollback triggers.
2. Execute: build a staged cutover plan using release analysis, deployment checklist, and environment constraints.
3. Validate: confirm readiness checks, dependency sequencing, smoke tests, and rollback timing.
4. Review: align the cutover runbook with approvers, operations, and support teams.
5. Deliver: issue cutover plan, rollback plan, and post-deployment validation checklist.

## Quality Gates
- `release-readiness.gate.md`
- `production-safety.gate.md`
- `security.gate.md`

## Outputs
- `artifacts/cutover-plan/cutover-plan.md`
- `artifacts/cutover-plan/rollback-plan.md`
- `artifacts/cutover-plan/validation-checklist.md`

## Safety Rules
- production execution is outside this workflow unless explicitly authorized
- all write actions must honor profile readonly and user confirmation
- include an emergency backout route and admin access path
- Online and On-Premises infrastructure dependencies must be separated clearly

## Acceptance Criteria
- plan includes owner, timing, dependency, validation, and rollback sections
- blocker conditions and stop/go checkpoints are explicit
- operations team can execute the document without reinterpreting intent
- production-safety and release-readiness gates have no unresolved blockers
