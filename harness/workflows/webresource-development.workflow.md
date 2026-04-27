# Web Resource Development Workflow

## Goal
Build or review UCI-ready JavaScript Web Resources with metadata validation, form-context safety, and delivery-ready deployment notes.

## Applicable Scenarios
- form script development
- legacy Xrm.Page remediation
- event handler review
- JavaScript Web Resource deployment planning

## Inputs
- functional requirement or bug report
- target entity, form, and event model
- existing JavaScript or TypeScript source

## Input Files
- `src/**/*.js`
- `src/**/*.ts`
- optional `package.json` and `tsconfig.json`
- optional form script mapping notes

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- target forms, tabs, controls, and event handlers
- browser support and UCI scope

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_list_webresources`
- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_analyze_webresource_js`
- `d365_generate_xrm_typings`
- `d365_generate_webresource_template`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: Yes when package tooling exists

## Execution Steps
1. Plan: confirm entity, form, event pipeline, and target handlers.
2. Execute: validate metadata, implement or review scripts, and align with `formContext` and UCI-safe patterns.
3. Validate: run local syntax or build checks and analyze JavaScript with the MCP tool.
4. Review: apply Web Resource gate for namespace, handler safety, null checks, async behavior, and deployment impact.
5. Deliver: provide code summary, deployment mapping, and test evidence.

## Quality Gates
- `code-quality.gate.md`
- `d365-webresource.gate.md`
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/webresource-development/design.md`
- `artifacts/webresource-development/test-results/`
- `artifacts/webresource-development/deployment-notes.md`

## Safety Rules
- do not assume control names or field names without metadata confirmation
- avoid unsupported legacy APIs unless explicitly required by a legacy client footprint
- do not embed secrets, endpoints, or tokens in front-end code
- never treat Web Resource upload as a production-safe action without approval

## Acceptance Criteria
- scripts pass local checks or build where available
- Web Resource gate has no unresolved blockers
- target form handlers and dependencies are documented
- deployment notes identify libraries, events, and rollback path
