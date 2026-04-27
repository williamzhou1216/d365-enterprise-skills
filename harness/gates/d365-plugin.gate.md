# D365 Plugin Gate

## Check Goal
Ensure plugin implementation is safe, metadata-valid, operationally traceable, and deployable.

## Check Items
- `context.Depth` is evaluated where recursion risk exists
- target entity and message are validated against intended registration
- `Target` entity existence and type are checked safely
- `PreImage` / `PostImage` usage is explicit and registration-aligned
- filtering attributes are defined when appropriate
- tracing uses `ITracingService`
- business failures use `InvalidPluginExecutionException` intentionally
- logical field names exist in actual metadata
- recursion or self-trigger risk is assessed
- unit tests exist or gap is explicitly documented
- transaction and stage assumptions are explicit

## Automatic Check Method
- run `d365_analyze_plugin_code`
- run `dotnet build`
- run plugin test suite using `harness/scripts/run-plugin-tests.ps1` when available
- compare logical names against `d365_get_entity_metadata` and `d365_get_attribute_metadata`

## Manual Confirmation Items
- registration design matches real business trigger
- image contents are sufficient and not over-broad
- rollback and operational tracing notes are documented
- impersonation or execution identity concerns are understood

## Blocking Conditions
- unresolved recursion risk
- invalid or unverified field logical names
- missing tracing in non-trivial logic
- exception strategy is unsafe or opaque
- build failure or critical test failure

## Output Result Format
```markdown
## Gate Result
- Gate: d365-plugin.gate.md
- Status: PASS | WARN | BLOCK
- Metadata Validation: <summary>
- Build/Test: <summary>
- Registration Review: <summary>
- Blocking Issues: <list>
```
