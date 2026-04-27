# Web Resource Review Prompt

```text
Use `harness/workflows/webresource-development.workflow.md` for the execution model.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection`.

Then:
- inspect form and metadata context with the relevant D365 MCP tools
- analyze the target JavaScript using `d365_analyze_webresource_js`
- verify field names, controls, handlers, and form usage
- run the relevant local web resource checks
- apply `d365-webresource.gate.md`

Output requirements:
- review findings or implemented changes
- deployment mapping notes
- validation summary
- deliverables created or updated
- added/modified file list

Do not reveal secrets or hard-code environment-sensitive values.
```
