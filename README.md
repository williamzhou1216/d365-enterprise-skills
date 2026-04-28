
# D365 Enterprise Skills Library（Detailed）

This repo contains D365 + Power Platform skills, one skill per folder, each with a detailed `SKILL.md` designed for real-world consulting/delivery.

## Installation to OpenClaw
- Copy `skills/` to `~/.openclaw/skills/d365-enterprise`
- Copy `agents/d365-master-agent.json` to `~/.openclaw/agents`
- Restart OpenClaw

## Skills
- d365-solution-architect
- pre-sales-strategist
- fit-gap-analyst
- proposal-delivery-writer
- d365-sales-expert
- d365-customer-service-expert
- d365-omnichannel-expert
- d365-field-service-expert
- power-platform-expert
- copilot-studio-expert
- d365-architecture-designer
- dataverse-data-architect
- security-role-designer
- d365-integration-architect
- d365-sso-integration-architect
- azure-integration-expert
- d365-plugin-developer
- d365-client-unit-test-expert
- d365-server-unit-test-expert
- power-automate-architect
- d365-requirement-spec-writer
- d365-technical-plan-designer
- d365-task-breakdown-manager
- d365-quality-gate-analyzer
- test-case-designer
- uat-support-expert
- release-deployment-manager
- d365-troubleshooting-expert
- performance-optimizer
- data-governance-expert
- vyung-d365-plugin-standard

## Identity And Access Notes
- `d365-sso-integration-architect` is intended for CRM identity integration with local SSO platforms, with explicit design branching for `online` and `op` deployment modes.
- The skill should be used when the main problem is login federation, SSO trust chain, ADFS / IFD / Entra ID alignment, or rollout / rollback planning for CRM authentication changes.

## Recommended Template Assets
- `templates/proposal_template.md`: client-facing proposal skeleton
- `templates/ppt_outline.md`: presentation outline for customer/project reviews
- `templates/test_case_template.md`: generic QA/UAT test case skeleton
- `templates/plugin_design_template.md`: plugin design output for registration, idempotency, logging, and rollout planning
- `templates/server_unit_test_template.md`: backend unit test output for Plugin / BLL / Custom API test planning

## Engineering Notes
- `d365-plugin-developer` is intended to produce implementation-ready plugin design, including registration metadata, images, idempotency, logging, testing, and rollback guidance.
- `d365-server-unit-test-expert` complements the plugin skill by converting design decisions into executable test scope, fake/mock strategy, and CI quality gates.
- `vyung-d365-plugin-standard` should be used when the user explicitly needs the Vyung internal plugin template, framework structure, or extension-method standards.


## Skills 分组清单（Grouped Layout）

### consulting
- d365-solution-architect
- pre-sales-strategist
- fit-gap-analyst
- proposal-delivery-writer

### product
- d365-sales-expert
- d365-customer-service-expert
- d365-omnichannel-expert
- d365-field-service-expert
- power-platform-expert
- copilot-studio-expert

### architecture
- d365-architecture-designer
- dataverse-data-architect
- security-role-designer
- d365-integration-architect
- d365-sso-integration-architect
- azure-integration-expert

### engineering
- d365-plugin-developer
- power-automate-architect
- d365-client-unit-test-expert
- d365-server-unit-test-expert

### delivery
- d365-requirement-spec-writer
- d365-technical-plan-designer
- d365-task-breakdown-manager
- d365-quality-gate-analyzer
- test-case-designer
- uat-support-expert
- release-deployment-manager

### operations
- d365-troubleshooting-expert
- performance-optimizer
- data-governance-expert

## d365-mcp

This repo now also contains a delivery-oriented MCP server for Dynamics 365 / Dataverse:

- Path: `mcp-servers/d365-mcp`
- Purpose: secure profile-based CRM connectivity for OpenCode, metadata analysis, solution inspection, and future On-Premises connector routing
- Setup docs: `mcp-servers/d365-mcp/README.md`

Quick start:

1. Run `./install-d365-mcp.sh` or `./install-d365-mcp.ps1`
2. Fill in `.env.local`
3. Copy `.opencode/opencode.example.jsonc` to `.opencode/opencode.jsonc`
4. Set `D365_PROFILE` and start OpenCode

## Harness Quick Start

This repo also includes a delivery execution harness for Dynamics CRM projects.

- Harness root: `harness/`
- Operator guide: `harness/EXECUTION.md`
- Machine-readable config: `harness/harness.config.json`
- Artifact register: `artifacts/index.md`

Recommended start sequence:

1. Set `D365_PROFILE`
2. Pick the target workflow key, for example `requirementAnalysis`, `pluginDevelopment`, or `solutionRelease`
3. Run the harness entrypoint to print the exact OpenCode execution prompt

PowerShell:

```powershell
pwsh -NoProfile -File .\harness\scripts\invoke-harness.ps1 -Workflow requirementAnalysis
```

Linux / macOS:

```bash
./harness/scripts/invoke-harness.sh requirementAnalysis
```

To refresh the artifact register summary first:

PowerShell:

```powershell
pwsh -NoProfile -File .\harness\scripts\invoke-harness.ps1 -Workflow solutionRelease -RefreshArtifactsIndex -ProjectName "CRM Modernization" -MaintainerName "Delivery PMO"
```

Linux / macOS:

```bash
./harness/scripts/invoke-harness.sh solutionRelease --refresh-artifacts-index --project-name "CRM Modernization" --maintainer-name "Delivery PMO"
```

Recommended first workflows by scenario:

- requirements and discovery: `requirementAnalysis`
- fit-gap decisioning: `fitGapAnalysis`
- plugin work: `pluginDevelopment`
- Web Resource / form script work: `webresourceDevelopment`
- Power Automate / OData filter work: `powerAutomate`
- solution packaging and release note work: `solutionRelease`
- cutover and go-live runbook work: `cutoverPlan`
- production issue diagnosis: `productionSupport`
