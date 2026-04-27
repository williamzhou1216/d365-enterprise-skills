# Code Quality Gate

## Check Goal
Ensure local code changes are maintainable, buildable, traceable to requirements, and ready for handoff.

## Check Items
- code builds successfully using the project-standard command
- warnings or known failures are documented
- naming, layering, and dependency usage follow project conventions
- changed code includes sufficient validation or tests
- generated files are separated from authored source where practical

## Automatic Check Method
- run `dotnet build` for plugin/server code when applicable
- run `dotnet test` for server test projects when available
- run `npm run build`, `npm run test`, or `npm run lint` when applicable
- run targeted static checks from workflow scripts

## Manual Confirmation Items
- logic is understandable without hidden assumptions
- change scope matches approved requirement or defect
- no dead code or unrelated refactor is mixed into the delivery

## Blocking Conditions
- build fails
- required tests fail
- no explanation exists for intentionally missing automated coverage
- code introduces hidden dependency on local machine state

## Output Result Format
```markdown
## Gate Result
- Gate: code-quality.gate.md
- Status: PASS | WARN | BLOCK
- Build Result: <summary>
- Test Result: <summary>
- Manual Findings: <summary>
- Blocking Issues: <list>
```
