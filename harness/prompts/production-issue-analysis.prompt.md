# Production Issue Analysis Prompt

```text
Use `harness/workflows/production-support.workflow.md` as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection` if safe.

Then:
- keep the investigation read-only unless I explicitly approve a supported write action
- use the relevant MCP tools for metadata, forms, views, plugin code, Web Resources, Flow JSON, or solution analysis
- separate facts, hypotheses, and recommendations
- apply `production-safety.gate.md`

Output requirements:
- incident analysis
- probable root cause summary
- safe recovery or next-step options
- deliverables created or updated
- added/modified file list

Do not reveal secrets, passwords, tokens, or sensitive connection data.
```
