# D365 Plugin Design Template
1. Requirement and business goal
- Business background:
- Trigger scenario:
- Success criteria:
- Why Plugin instead of Flow / JS / Business Rule / PCF:

2. Registration design
- Plugin class:
- Message:
- Primary Entity:
- Secondary Entity:
- Stage:
- Mode:
- Execution Order:
- Filtering Attributes:
- Step Name:
- Secure / Unsecure Config:

3. Execution context and security boundary
- Execution identity:
- Impersonation needed:
- BU / Team / Role / Field Security impact:
- SharedVariables / ParentContext usage:

4. Input and output contract
- Input source:
- Required fields:
- Output changes:
- Related record operations:
- External side effects:
- Should block transaction:

5. Image and data access strategy
- Target fields:
- PreImage fields:
- PostImage fields:
- Retrieve needed:
- Batch / ExecuteMultiple needed:
- Avoided reads:

6. Idempotency and recursion control
- Depth guard:
- Duplicate trigger detection:
- Idempotency key / signature:
- Self-trigger risk:
- Multi-step chain risk:

7. Exception, logging, and recovery
- Blocking exceptions:
- Non-blocking exceptions:
- Trace points:
- Business log points:
- Alert conditions:
- Correlation / Record / Message identifiers:
- Recovery or manual fallback path:

8. Performance and operability
- Sync latency risk:
- External dependency risk:
- Optimization suggestions:
- Avoid full-field updates:
- Monitoring suggestions:

9. Configuration design
- Config name:
- Purpose:
- Default value:
- Environment-specific:
- Read method:
- Fallback behavior:
- Must not be hardcoded:

10. Testing and quality gate
- Unit test scope:
- Fake Context / Mock strategy:
- Happy path tests:
- Exception tests:
- Idempotency tests:
- Recursion tests:
- Config branch tests:
- Coverage target:
- CI gate:

11. Deployment and rollback
- Deployment order:
- Dependencies:
- Release notes:
- Rollback plan:
- Feature toggle:
- Data repair / backfill needed:

12. Risks and open questions
- Security risk:
- Performance risk:
- Data consistency risk:
- External dependency risk:
- Open questions:
