# Power Automate Gate

## Check Goal
Ensure flow design and OData filters are metadata-valid, resilient, and production-safe.

## Check Items
- filter fields exist in the target table
- option set values and operators are correct
- null handling and empty result handling are considered
- retry and exception behavior are documented
- concurrency assumptions are explicit
- service account or connection identity is appropriate
- exported flow does not expose secret material in Git

## Automatic Check Method
- run `d365_validate_odata_filter`
- run `d365_generate_odata_filter` where building expressions from intent
- run `d365_analyze_power_automate_flow` for exported Flow JSON
- validate fields using metadata tools

## Manual Confirmation Items
- flow ownership and support model are defined
- trigger volume and throttling risks are reviewed
- downstream side effects are understood

## Blocking Conditions
- invalid OData filter
- use of non-existent field or wrong choice value
- unsafe secret handling in Flow JSON or documentation
- missing retry/error strategy for production-critical automation

## Output Result Format
```markdown
## Gate Result
- Gate: power-automate.gate.md
- Status: PASS | WARN | BLOCK
- Filter Validation: <summary>
- Flow Analysis: <summary>
- Identity/Retry Review: <summary>
- Blocking Issues: <list>
```
