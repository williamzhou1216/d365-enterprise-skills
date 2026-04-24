
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
