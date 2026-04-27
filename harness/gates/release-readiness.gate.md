# Release Readiness Gate

## Check Goal
Confirm that a delivery package has enough evidence, approvals, test coverage, and operational detail to proceed to the next environment.

## Check Items
- release scope is frozen and traceable
- test evidence exists and is understandable
- deployment checklist exists
- rollback plan exists
- post-deployment validation exists
- support ownership and escalation path are defined

## Automatic Check Method
- verify required release artifacts exist
- review generated release note and deployment checklist outputs
- run solution verification script when applicable

## Manual Confirmation Items
- business sign-off state
- environment owner approval
- go/no-go conditions are understood by operations and support teams

## Blocking Conditions
- no rollback plan
- missing deployment checklist
- critical test gap with no accepted waiver
- no identified owner for deployment validation

## Output Result Format
```markdown
## Gate Result
- Gate: release-readiness.gate.md
- Status: PASS | WARN | BLOCK
- Artifact Presence: <summary>
- Approval State: <summary>
- Deployment Readiness: <summary>
- Blocking Issues: <list>
```
