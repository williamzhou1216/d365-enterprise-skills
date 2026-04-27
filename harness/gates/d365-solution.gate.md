# D365 Solution Gate

## Check Goal
Ensure a solution package or unpacked solution folder is structurally sound, reviewable, and safe to promote.

## Check Items
- solution folder exists and contains required XML artifacts
- component summary has been reviewed
- version and release identifiers are clear
- missing dependencies, environment variables, and connection references are identified
- plugin, Web Resource, Flow, and security impacts are visible
- rollback and comparison baseline are available where required

## Automatic Check Method
- run `d365_analyze_solution_folder`
- run `d365_compare_solution_folders` when a baseline exists
- run `harness/scripts/verify-solution.ps1` or `.sh`
- use `pac` pack/unpack verification where applicable

## Manual Confirmation Items
- release owner reviewed the scope
- deployment order and environment dependencies are understood
- customer-facing release summary is accurate

## Blocking Conditions
- missing required solution structure
- unknown or undocumented dependency that blocks import
- no rollback view for production-targeted release
- solution analysis identifies unresolved critical risk

## Output Result Format
```markdown
## Gate Result
- Gate: d365-solution.gate.md
- Status: PASS | WARN | BLOCK
- Structure Check: <summary>
- Dependency Review: <summary>
- Release Scope Review: <summary>
- Blocking Issues: <list>
```
