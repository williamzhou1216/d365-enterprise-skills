# Production Safety Gate

## Check Goal
Prevent accidental or unsupported production actions during OpenCode execution.

## Check Items
- current profile and environment type were read first
- `readonly` status is known and respected
- write intent is explicit, approved, and technically supported
- production workflow remains read-only unless explicitly confirmed
- On-Premises connector limitations are documented when relevant

## Automatic Check Method
- call `d365_get_current_profile`
- call `d365_test_connection` where safe and supported
- compare intended action against workflow `writeAccess`
- block if the profile indicates `readonly=true` and the task is write-class

## Manual Confirmation Items
- explicit user approval exists for any production write action
- operator understands rollback path before a write action is attempted
- unsupported connector path is not being forced into execution

## Blocking Conditions
- production write requested without explicit approval
- profile readonly conflicts with intended action
- environment type is unknown but action is not read-only
- unsupported connector path is required for execution

## Output Result Format
```markdown
## Gate Result
- Gate: production-safety.gate.md
- Status: PASS | WARN | BLOCK
- Profile Check: <summary>
- Readonly Check: <summary>
- Approval Check: <summary>
- Blocking Issues: <list>
```
