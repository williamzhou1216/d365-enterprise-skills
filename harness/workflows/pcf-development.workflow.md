# PCF Development Workflow

## Goal
Design and build PCF controls with metadata alignment, packaging discipline, and deployable solution integration notes.

## Applicable Scenarios
- new PCF control implementation
- PCF control enhancement
- model-driven app control migration from Web Resource to PCF

## Inputs
- UX or functional requirement
- target entity fields and binding model
- PCF source project or requested component skeleton

## Input Files
- `pcf/**`
- `ControlManifest.Input.xml`
- optional solution folder containing PCF reference
- optional `package.json`

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- target form usage and field binding model
- solution packaging approach and target environments

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_generate_xrm_typings`

## Tooling And Build Requirements
- `pac` CLI: Yes
- `dotnet build`: No
- `npm build`: Yes

## Execution Steps
1. Plan: confirm control purpose, target fields, and packaging approach.
2. Execute: use metadata to validate field types, initialize or refine the PCF project, and update solution references as required.
3. Validate: run `npm` build and any local tests; confirm manifest and bindings align with CRM metadata.
4. Review: verify packaging, output size, control inputs/outputs, and deployment notes.
5. Deliver: provide component summary, build evidence, and solution integration instructions.

## Quality Gates
- `code-quality.gate.md`
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/pcf-development/design.md`
- `artifacts/pcf-development/build-output/`
- `artifacts/pcf-development/deployment-notes.md`

## Safety Rules
- prefer metadata-confirmed field bindings over assumptions
- do not check generated build secrets or local auth settings into Git
- keep packaging steps local unless the user explicitly requests environment deployment
- document any unmanaged dependencies such as dataset limits or external API calls

## Acceptance Criteria
- PCF project builds successfully
- manifest inputs match actual CRM fields and usage
- packaging instructions are documented for solution inclusion
- deployment notes identify dependencies and rollback steps
