# D365 Web Resource Gate

## Check Goal
Ensure UCI JavaScript or TypeScript Web Resources are form-safe, metadata-valid, and deployable without avoidable runtime failures.

## Check Items
- `formContext` usage is preferred over legacy global APIs unless justified
- namespace and handler entry points are stable and documented
- attribute, control, and tab names are validated against metadata or form configuration
- null and unavailable control handling is present
- async behavior does not break save/load lifecycle unexpectedly
- unsupported secrets or hard-coded environment values are absent
- dependent libraries and handler registrations are documented

## Automatic Check Method
- run `d365_analyze_webresource_js`
- run `harness/scripts/run-webresource-check.ps1`
- validate field names with `d365_get_attribute_metadata`
- validate form handlers with `d365_get_form_configuration`

## Manual Confirmation Items
- UX behavior matches requirement
- event ordering and handler registration are correct
- deployment mapping to forms and events is complete

## Blocking Conditions
- unresolved use of invalid field/control names
- syntax or build failure
- unsupported or unsafe client API usage without justification
- hard-coded secrets, tokens, or environment URLs

## Output Result Format
```markdown
## Gate Result
- Gate: d365-webresource.gate.md
- Status: PASS | WARN | BLOCK
- Static Check: <summary>
- Metadata/Form Check: <summary>
- Deployment Mapping: <summary>
- Blocking Issues: <list>
```
