# Plugin Development Workflow

## Goal
Design, implement, verify, and document D365 plugin changes with delivery-safe registration, testing, and rollback information.

## Applicable Scenarios
- new plugin step development
- plugin refactoring
- custom API related server logic
- delivery review of existing plugin code

## Inputs
- functional requirement or technical design
- target entity, message, stage, and triggering rules
- existing plugin source code if present

## Input Files
- `src/**/*.cs`
- solution or project files such as `*.sln` and `*.csproj`
- optional `templates/plugin_design_template.md`
- optional test projects under `tests/`

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- target entity logical names and field list
- existing plugin registration footprint and expected transaction behavior

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_list_relationships`
- `d365_list_plugin_steps`
- `d365_analyze_plugin_code`
- `d365_generate_plugin_template`
- `d365_generate_plugin_registration_note`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: Yes
- `npm build`: No

## Execution Steps
1. Plan: confirm entity, message, stage, filtering attributes, images, recursion expectations, and test scope.
2. Execute: inspect metadata, implement or refine plugin logic, and keep field names aligned with CRM metadata.
3. Validate: run plugin code analysis, build, and unit tests; verify depth checks, tracing, exception behavior, and image usage.
4. Review: apply plugin quality gate and document registration metadata and rollback impact.
5. Deliver: provide implementation summary, registration note, test evidence, and deployment considerations.

## Quality Gates
- `code-quality.gate.md`
- `d365-plugin.gate.md`
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/plugin-development/plugin-design.md`
- `artifacts/plugin-development/plugin-registration.md`
- `artifacts/plugin-development/test-results/`

## Safety Rules
- do not perform CRM write operations from the harness without explicit approval
- validate all logical names against metadata before finalizing code
- do not assume `PreImage` or `PostImage` exists without registration evidence
- preserve operational tracing and controlled exception behavior

## Acceptance Criteria
- solution builds successfully
- plugin gate passes without unresolved blockers
- registration note includes step, image, filtering attributes, and rollback notes
- unit test status is reported and any gaps are explicit
