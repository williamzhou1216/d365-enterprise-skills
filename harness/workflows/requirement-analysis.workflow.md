# Requirement Analysis Workflow

## Goal
Convert raw business requirements into an implementation-ready D365 delivery baseline with validated CRM scope, entity assumptions, and delivery outputs.

## Applicable Scenarios
- new module discovery
- CR intake and impact analysis
- pre-design requirement clarification
- discovery workshops for Online or On-Premises CRM projects

## Inputs
- BRD, workshop notes, backlog items, or user stories
- existing solution inventory if available
- target environment or profile name

## Input Files
- `docs/requirements/*.md` or equivalent source material
- optional exported solution notes
- optional entity inventory from prior phases

## Required Context
- current `D365_PROFILE`
- deployment type: `online`, `onprem`, or `onprem-ifd`
- `readonly` status
- business scope, personas, target modules, and non-functional constraints

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_list_entities`
- `d365_get_entity_metadata`
- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_list_views`
- `d365_generate_field_dictionary`
- `d365_generate_solution_design_doc`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: confirm profile, environment type, readonly status, and missing requirement inputs.
2. Execute: inspect target entities, forms, views, and field metadata to validate business language against actual CRM capability.
3. Validate: identify requirement gaps, ambiguous fields, missing ownership decisions, and environment constraints.
4. Review: map each requirement to standard capability, configuration, customization, or integration.
5. Deliver: produce requirement summary, assumptions, open questions, and implementation scope baseline.

## Quality Gates
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/requirement-analysis/requirements-summary.md`
- `artifacts/requirement-analysis/assumptions.md`
- `artifacts/requirement-analysis/entity-scope.md`
- optional `artifacts/requirement-analysis/solution-design-skeleton.md`

## Safety Rules
- only read CRM metadata in this workflow
- do not promise fields, forms, or views before metadata confirmation
- never expose secret values from profile configuration
- if connection is unavailable, continue from documented assumptions and mark the risk

## Acceptance Criteria
- requirements are mapped to real CRM scope or clearly marked as assumptions
- target entities and major attributes are identified
- unresolved questions are explicit
- output can be consumed by solution design or fit-gap work without re-discovery
