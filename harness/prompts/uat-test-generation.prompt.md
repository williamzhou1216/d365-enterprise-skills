# UAT Test Generation Prompt

```text
Use `harness/workflows/uat-testing.workflow.md` as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection`.

Then:
- inspect entity, form, and view context using D365 MCP tools
- generate UAT cases aligned with the real CRM structure
- include positive, negative, and role-sensitive scenarios where relevant
- perform a coverage review before finalizing

Output requirements:
- UAT test case document
- coverage summary
- deliverables created or updated
- added/modified file list

Do not expose secrets or real sensitive customer data.
```
