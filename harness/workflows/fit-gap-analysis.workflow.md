# Fit-Gap Analysis Workflow

## Goal
Assess business requirements against standard D365 capability and identify where configuration, customization, integration, or process change is required.

## Applicable Scenarios
- design decision workshops
- pre-estimation delivery analysis
- scope governance for change requests
- customer-facing standard-vs-custom decisions

## Inputs
- approved or draft requirements
- requirement analysis outputs
- target entity and process list

## Input Files
- `docs/requirements/*.md`
- `artifacts/requirement-analysis/*`
- optional process maps or workshop notes

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- module scope and source-of-record assumptions
- any customer-specific non-negotiable constraints

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_list_entities`
- `d365_get_entity_metadata`
- `d365_get_option_set`
- `d365_list_relationships`
- `d365_generate_fit_gap_analysis`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: confirm requirement source, project scope, and environment assumptions.
2. Execute: inspect relevant entities, relationships, and option sets to validate whether requested behavior is standard.
3. Validate: classify each requirement as Standard, Config, Custom, Integration, or Out Of Scope.
4. Review: record risk, effort drivers, dependency on external systems, and data ownership implications.
5. Deliver: issue a fit-gap matrix with recommendation and rationale for each item.

## Quality Gates
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/fit-gap-analysis/fit-gap-analysis.md`
- `artifacts/fit-gap-analysis/decision-log.md`

## Safety Rules
- metadata inspection only
- do not classify a requirement as standard without product evidence
- clearly flag connector or licensing assumptions
- do not hide unsupported requirements behind vague wording

## Acceptance Criteria
- every scoped requirement has a fit-gap disposition
- each non-standard item has a recommended path and justification
- dependencies and risks are explicit
- output is suitable for estimation and customer review
