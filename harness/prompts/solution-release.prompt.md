# Solution Release Prompt

```text
Use `harness/workflows/solution-release.workflow.md` as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection` when safe.

Then:
- analyze the unpacked solution folder
- compare it with the baseline when available
- generate release notes and deployment checklist
- use `pac` CLI only for packaging or verification steps, not for unconfirmed production import actions
- apply `d365-solution.gate.md` and `release-readiness.gate.md`

Output requirements:
- release summary
- deployment checklist summary
- rollback and validation highlights
- deliverables created or updated
- added/modified file list

Never expose secrets, passwords, tokens, or customer-sensitive connection values.
```
