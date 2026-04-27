# Production Support Workflow

## Goal
Diagnose production issues in a controlled, read-only-first manner and deliver a support-ready incident analysis with root cause hypotheses, evidence, and recovery options.

## Applicable Scenarios
- production incident triage
- post-release defect analysis
- plugin, form, view, or flow behavior troubleshooting
- high-severity business outage investigation

## Inputs
- incident summary
- impacted entity, process, or user journey
- timestamps, sample record IDs, and error symptoms when available

## Input Files
- incident notes
- logs or screenshots if available
- solution folder, plugin source, or exported flow JSON when relevant

## Required Context
- current `D365_PROFILE`
- environment type and readonly state
- production severity and affected business area
- whether issue is limited to UI, plugin, automation, security, or release packaging

## Required MCP Tools
- `d365_get_current_profile`
- `d365_test_connection`
- `d365_get_entity_metadata`
- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_list_views`
- `d365_analyze_view_fetchxml`
- `d365_list_plugin_steps`
- `d365_analyze_plugin_code`
- `d365_list_webresources`
- `d365_analyze_webresource_js`
- `d365_analyze_power_automate_flow`
- `d365_analyze_solution_folder`

## Tooling And Build Requirements
- `pac` CLI: Optional for solution unpack/review
- `dotnet build`: No
- `npm build`: No

## Execution Steps
1. Plan: classify issue type, severity, impacted scope, and safe evidence sources.
2. Execute: collect profile and metadata context, inspect relevant local artifacts, and analyze plugin, Web Resource, view, Flow, or solution components.
3. Validate: separate observed facts from hypotheses and identify the smallest safe remediation path.
4. Review: run production-safety checks to ensure investigation remains read-only unless explicitly approved.
5. Deliver: provide incident analysis, probable root cause, containment options, and next-step recommendations.

## Quality Gates
- `security.gate.md`
- `production-safety.gate.md`
- `release-readiness.gate.md`

## Outputs
- `artifacts/production-support/incident-analysis.md`
- `artifacts/production-support/root-cause.md`
- `artifacts/production-support/recovery-plan.md`

## Safety Rules
- default to read-only investigation
- do not run production write operations without explicit approval
- never expose live secrets, tokens, or user passwords during diagnostics
- if evidence is insufficient, state uncertainty instead of over-claiming root cause

## Acceptance Criteria
- incident analysis distinguishes fact, hypothesis, and recommendation
- impacted component and probable failure path are documented
- safe next steps are identified for operations or engineering teams
- no unsupported production action is taken implicitly
