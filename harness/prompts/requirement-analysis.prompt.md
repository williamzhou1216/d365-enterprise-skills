# Requirement Analysis Prompt

```text
Use `harness/workflows/requirement-analysis.workflow.md` as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type, auth mode, api type, and `readonly` status.
3. Call `d365_test_connection` if the profile supports it safely.

Then execute the workflow end-to-end for requirement analysis.

Requirements:
- Use D365 metadata as the source of truth whenever available.
- Call the necessary MCP tools for entities, forms, views, and field dictionary generation.
- Produce delivery-ready outputs, not general commentary.
- State assumptions clearly when metadata or source requirements are incomplete.
- Perform validation before finalizing the output.
- Output the deliverables created or updated.
- Output the added or modified file list.
- Do not reveal secrets, tokens, passwords, or connection strings.
```
