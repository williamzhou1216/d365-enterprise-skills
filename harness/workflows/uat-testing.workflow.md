# UAT Testing Workflow

## Goal
Generate delivery-ready UAT test cases and coverage notes aligned to actual CRM forms, views, entities, and target business scenarios.

## Applicable Scenarios
- pre-UAT preparation
- regression pack creation
- scenario coverage design for new release scope

## Inputs
- scope description or release notes
- target business scenarios
- target modules and personas

## Input Files
- `artifacts/solution-release/release-note.md` when available
- requirement or process documentation
- optional test templates

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- entity and form scope
- primary actors and success criteria

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_get_entity_metadata`
- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_list_views`
- `d365_generate_uat_test_cases`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: identify test scope, personas, entry criteria, and release assumptions.
2. Execute: inspect forms, fields, and views to ensure test steps reflect the actual UI and data model.
3. Validate: review scenario coverage for create, update, exception, security, and reporting outcomes.
4. Review: confirm traceability from requirement or release item to test case.
5. Deliver: produce UAT pack and scenario coverage matrix.

## Quality Gates
- `security.gate.md`
- `release-readiness.gate.md`

## Outputs
- `artifacts/uat-testing/uat-test-cases.md`
- `artifacts/uat-testing/coverage-matrix.md`

## Safety Rules
- metadata inspection only
- do not invent UI controls or labels without verification
- call out assumptions when forms or views are not available through MCP
- avoid embedding customer data in reusable test packs

## Acceptance Criteria
- UAT cases are scenario-driven and traceable
- expected results are measurable
- scope coverage and exclusions are explicit
- outputs are ready for tester handoff
