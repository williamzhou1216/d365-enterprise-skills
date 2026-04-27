# Dynamics CRM Delivery Harness

## 1. What Harness Engine Is

Harness Engine is the execution framework that turns OpenCode from a conversational assistant into a delivery-oriented working model for Dynamics CRM / Dynamics 365 / Power Platform projects. It standardizes how tasks are planned, executed, validated, reviewed, and delivered.

In this repo, the harness is intentionally documentation-first and tool-aware:

- `workflows/` define how a delivery scenario should be run.
- `gates/` define what must pass before the work is accepted.
- `prompts/` provide copy-ready prompts for OpenCode.
- `scripts/` provide repeatable local verification helpers.
- `harness.config.json` provides the machine-readable registry for the framework.

## 2. Relationship Between Harness, OpenCode, MCP, And Skills

- OpenCode is the execution runtime.
- Skills provide domain reasoning patterns and delivery style.
- `d365-mcp` provides environment-aware CRM metadata and delivery tooling.
- Harness provides the operating model that tells OpenCode which sequence to follow and which controls to enforce.

Recommended mental model:

1. Skills answer with the right specialist mindset.
2. MCP tools fetch trustworthy CRM facts.
3. Harness workflows turn those facts into repeatable delivery outcomes.

## 3. Why Dynamics CRM Projects Need A Harness

Dynamics CRM delivery work often fails when tasks are done as one-off prompts without environment checks, metadata validation, release controls, or deliverable discipline. A harness avoids that by enforcing:

- profile-aware execution using `D365_PROFILE`
- explicit read-only boundaries for production
- standard plan -> execute -> validate -> review -> deliver stages
- consistent use of metadata before design or code changes
- reusable quality gates across plugin, Web Resource, Power Automate, solution, and release work

## 4. Supported Delivery Scenarios

The harness currently supports these scenarios:

1. Requirement analysis
2. Fit-gap analysis
3. Plugin development
4. Web Resource / UCI JavaScript development
5. PCF control development
6. Power Automate / OData Filter development
7. Solution analysis and release
8. UAT test case generation
9. Security matrix generation
10. Cutover plan generation
11. Production issue analysis

## 5. Repository Layout

```text
harness/
├── README.md
├── EXECUTION.md
├── harness.config.json
├── workflows/
├── gates/
├── prompts/
└── scripts/
```

Default delivery outputs are written under the repo-level `artifacts/` directory.

## 6. How To Use A Workflow

Typical execution sequence:

1. Choose the matching file under `harness/workflows/`.
2. Confirm `D365_PROFILE` and environment type.
3. Run read-only context collection using `d365-mcp` tools.
4. Execute the task according to the workflow steps.
5. Run the referenced quality gates.
6. Produce deliverables in the workflow output path.
7. Record added or modified files in the final response.

Artifact convention:

1. Write workflow outputs into `artifacts/<workflow-name>/`.
2. Keep generated evidence, review notes, and delivery files together under the same workflow folder.
3. Use subfolders such as `test-results/` or `build-output/` only for reproducible machine-generated evidence.
4. Do not store secrets, environment exports, or raw credential dumps in `artifacts/`.
5. If the output is customer-facing, prefer stable filenames such as `release-note.md`, `cutover-plan.md`, or `security-matrix.md`.

Recommended working prompt pattern:

```text
Use harness/workflows/plugin-development.workflow.md.
First call d365_get_current_profile and d365_test_connection.
Respect readonly rules. Then execute the workflow end-to-end and report deliverables and changed files.
```

## 7. How To Execute A Quality Gate

Each workflow points to one or more gates under `harness/gates/`.

Gate execution model:

1. Run automatic checks first.
2. Record manual confirmations.
3. Mark each gate result as `PASS`, `WARN`, or `BLOCK`.
4. Do not promote work with any unresolved `BLOCK` result.

Suggested gate output format:

```markdown
## Gate Result
- Gate: d365-plugin.gate.md
- Status: PASS | WARN | BLOCK
- Automatic Checks: <summary>
- Manual Confirmations: <summary>
- Blocking Issues: <list>
- Recommended Actions: <list>
```

## 8. How To Switch `D365_PROFILE`

PowerShell:

```powershell
$env:D365_PROFILE = "customerA-online-dev"
```

Linux / macOS:

```bash
export D365_PROFILE=customerA-online-dev
```

Before any workflow execution, OpenCode should call:

- `d365_get_current_profile`
- `d365_test_connection`

When switching between Online and On-Premises projects, restart the MCP session or OpenCode session if needed.

## 9. How Harness Uses `d365-mcp` Tools

The harness is designed around the following D365 MCP tools.

Auth and profile:

- `d365_get_current_profile`
- `d365_list_profiles`
- `d365_test_connection`

Metadata and model:

- `d365_list_entities`
- `d365_get_entity_metadata`
- `d365_get_attribute_metadata`
- `d365_get_option_set`
- `d365_list_relationships`
- `d365_generate_field_dictionary`

Forms and views:

- `d365_list_forms`
- `d365_get_form_configuration`
- `d365_list_views`
- `d365_analyze_view_fetchxml`

Solution and release:

- `d365_analyze_solution_folder`
- `d365_compare_solution_folders`
- `d365_generate_release_note`
- `d365_generate_deployment_checklist`

Plugin and Web Resource:

- `d365_list_plugin_steps`
- `d365_analyze_plugin_code`
- `d365_generate_plugin_template`
- `d365_generate_plugin_registration_note`
- `d365_list_webresources`
- `d365_analyze_webresource_js`
- `d365_generate_xrm_typings`
- `d365_generate_webresource_template`

Power Automate and OData:

- `d365_validate_odata_filter`
- `d365_generate_odata_filter`
- `d365_analyze_power_automate_flow`

Delivery documents:

- `d365_generate_uat_test_cases`
- `d365_generate_fit_gap_analysis`
- `d365_generate_solution_design_doc`
- `d365_generate_security_matrix`
- `d365_generate_cutover_plan`

If a tool has lower maturity in a specific connector path, the workflow must treat it as read-oriented guidance and fall back to documentation, local analysis, or `pac` based processing.

## 10. How Harness Uses `pac` CLI

`pac` CLI is the preferred command-line tool for solution packaging and PCF lifecycle work.

Use `pac` when you need to:

- pack or unpack solutions
- export or import solutions
- initialize or build PCF controls
- validate solution packaging inputs

Do not use `pac` as a substitute for secret handling. Authentication should stay in approved local profile/session configuration.

## 11. Online And On-Premises Guidance

Online projects:

- prefer `d365-mcp` metadata tools where implemented
- honor `readonly=true` for production environments
- use application identities for automation where possible

On-Premises projects:

- account for `organization-service` based access patterns
- AD / ADFS / IFD differences must be captured in the workflow context
- some workflows may rely more on solution folder analysis and local verification than live CRM execution

## 12. Security Boundary

The harness enforces these baseline boundaries:

- production write operations are opt-in and must never happen without explicit confirmation
- all write operations must honor `D365_PROFILE` and profile `readonly`
- no secrets, passwords, tokens, or connection strings may be written into Git
- OpenCode should prefer read-only metadata inspection first
- scripts must never print sensitive values
- if environment capability is unclear, the workflow must stop and ask

## 13. Recommended Commands

Automatic entrypoint helpers:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\invoke-harness.ps1 -Workflow requirementAnalysis
```

```bash
./harness/scripts/invoke-harness.sh requirementAnalysis
```

These helper scripts do not execute CRM writes. They print the selected workflow metadata and a copy-ready OpenCode prompt that uses the harness contract.

Recommended commands:

Profile and connection:

```powershell
$env:D365_PROFILE = "customerA-online-dev"
```

```bash
cd mcp-servers/d365-mcp
npm run test:connection
```

Solution verification:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\verify-solution.ps1 -SolutionFolder .\solutions\unpacked\Core
```

Plugin tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\run-plugin-tests.ps1 -Path .\src
```

Web Resource verification:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\run-webresource-check.ps1 -Path .\src\webresources
```

Secret scan:

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\scripts\check-secrets.ps1 -Path .
```

## 14. Common Questions

### Can Harness write to production?

Not by default. Production must be treated as read-only unless the user explicitly confirms a supported write path and the active profile is not read-only.

### Do all workflows require live CRM access?

No. Some workflows can run from requirements, solution folders, exported Flow JSON, or local source code. Live metadata access is still preferred when available.

### What if a required MCP tool is not usable for a connector type?

Record the limitation in the workflow output, mark the affected step as constrained, and continue with the safest supported alternative.

### Does this replace skills?

No. Skills still provide specialist reasoning. Harness adds the repeatable delivery process around them.

### Where should deliverables go?

Default output paths are declared in `harness.config.json` and repeated in each workflow. Create the target folders on demand during execution.

### Is there a standard execution entry for operators?

Yes. Use:

- `harness/EXECUTION.md` for the operator-facing runbook
- `harness/scripts/invoke-harness.ps1` on Windows PowerShell
- `harness/scripts/invoke-harness.sh` on Linux/macOS

These entrypoints help the operator select a workflow, inspect required tools, and generate the exact OpenCode instruction block to run.
