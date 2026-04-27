# Power Automate Workflow

## Goal
Design or review Power Automate logic, especially Dataverse filter expressions and exported flow definitions, using metadata-first validation.

## Applicable Scenarios
- Dataverse trigger/filter design
- flow troubleshooting
- exported flow review
- OData Filter Rows generation or validation

## Inputs
- flow requirement or bug report
- target table, trigger condition, and business rule
- optional exported Flow JSON

## Input Files
- exported flow JSON under `flows/` or equivalent
- requirement notes
- optional API contract documentation

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- target entities, attributes, and option set semantics
- expected volume, retry behavior, and error handling requirements

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_get_option_set`
- `d365_validate_odata_filter`
- `d365_generate_odata_filter`
- `d365_analyze_power_automate_flow`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: identify trigger, table, business condition, and expected throughput.
2. Execute: validate fields and choice values using metadata, then generate or review OData filter expressions and Flow JSON behavior.
3. Validate: check filter correctness, null handling, choice values, retry paths, and concurrency assumptions.
4. Review: apply Power Automate gate for idempotency, resilience, and secret handling.
5. Deliver: produce flow analysis, final filter design, and testing notes.

## Quality Gates
- `power-automate.gate.md`
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/power-automate/flow-analysis.md`
- `artifacts/power-automate/filter-design.md`
- `artifacts/power-automate/test-checklist.md`

## Safety Rules
- validate all OData fields against metadata before approval
- do not store credentials in exported Flow JSON or Git
- do not promote changes directly to production without release controls
- make concurrency and retry assumptions explicit

## Acceptance Criteria
- filter expressions are metadata-valid
- flow analysis identifies risk areas and remediation actions
- testing notes cover positive, negative, and retry scenarios
- no unresolved blocker remains in the Power Automate gate
