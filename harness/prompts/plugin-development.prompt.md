# Plugin Development Prompt

```text
Use `harness/workflows/plugin-development.workflow.md` and the referenced gates as the execution contract.

First:
1. Call `d365_get_current_profile`.
2. Determine environment type and `readonly` status.
3. Call `d365_test_connection`.

Then:
- Validate target entity and fields through MCP metadata tools.
- Use `d365_analyze_plugin_code` on the plugin source.
- If implementation is needed, update local code only unless I explicitly authorize environment writes.
- Run required validation, including build and tests where available.
- Apply `code-quality.gate.md` and `d365-plugin.gate.md`.

Output requirements:
- implementation summary
- registration note
- validation and test result summary
- deliverable file list
- added/modified file list

Never expose secrets, passwords, tokens, or connection strings.
```
