# Security Gate

## Check Goal
Ensure delivery artifacts, code, and documentation do not violate identity, secret, or privilege controls.

## Check Items
- no password, token, client secret, or connection string is committed
- least-privilege assumptions are documented
- production identities are not reused casually for automation
- audit-sensitive changes identify ownership and approval needs
- documents avoid exposing customer-sensitive operational details unnecessarily

## Automatic Check Method
- run `harness/scripts/check-secrets.ps1`
- inspect changed files for secret-like patterns
- confirm `D365_PROFILE` and `readonly` awareness in workflow output

## Manual Confirmation Items
- approvers understand privilege impact
- any service-account usage is justified
- environment-specific confidential values are excluded from deliverables

## Blocking Conditions
- secret or credential material is found in tracked files
- undocumented privileged automation account is required
- delivery artifact exposes production-sensitive information inappropriately

## Output Result Format
```markdown
## Gate Result
- Gate: security.gate.md
- Status: PASS | WARN | BLOCK
- Secret Scan: <summary>
- Identity Review: <summary>
- Manual Security Notes: <summary>
- Blocking Issues: <list>
```
