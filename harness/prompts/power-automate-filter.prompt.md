# Power Automate Filter Prompt

```text
Use `harness/workflows/power-automate.workflow.md` as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection`.

Then:
- validate the target Dataverse metadata
- use `d365_generate_odata_filter` or `d365_validate_odata_filter` as needed
- analyze exported flow JSON if provided
- apply `power-automate.gate.md`

Output requirements:
- final OData filter expression or corrected alternative
- flow analysis summary
- validation summary
- deliverables created or updated
- added/modified file list

Do not leak secrets, connection references, tokens, or passwords.
```
