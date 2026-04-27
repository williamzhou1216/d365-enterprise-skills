# Security Matrix Workflow

## Goal
Generate a role-to-entity access matrix aligned to CRM entity scope, ownership model, and delivery assumptions.

## Applicable Scenarios
- security design workshops
- role remediation
- delivery handover documentation
- audit preparation

## Inputs
- role list
- target entities
- ownership and business unit assumptions

## Input Files
- role inventory document
- entity scope list
- optional existing security model notes

## Required Context
- current `D365_PROFILE`
- deployment type and readonly state
- target roles, teams, and BU model assumptions
- whether field security or hierarchy security is in scope

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_list_entities`
- `d365_get_entity_metadata`
- `d365_list_relationships`
- `d365_generate_security_matrix`

## Tooling And Build Requirements
- `pac` CLI: No
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: confirm roles, entity scope, and ownership model assumptions.
2. Execute: inspect entity metadata and relationship dependencies that affect privilege decisions.
3. Validate: review user-owned vs organization-owned implications, parent-child dependencies, and special field protection requirements.
4. Review: verify that matrix language is customer-readable and implementation-ready.
5. Deliver: provide matrix plus assumptions and open issues.

## Quality Gates
- `security.gate.md`
- `production-safety.gate.md`

## Outputs
- `artifacts/security-matrix/security-matrix.md`
- `artifacts/security-matrix/assumptions.md`

## Safety Rules
- do not claim final privilege settings without business confirmation
- make inherited or dependent privileges explicit
- do not leak real user identities or privileged accounts in shared documents
- flag any admin-only or segregation-of-duty risk

## Acceptance Criteria
- matrix includes all scoped roles and entities
- ownership assumptions are explicit
- sensitive areas such as delete, assign, share, and field security are covered
- output is usable for both configuration and review discussions
