# D365 Server Unit Test Template
1. Test target and scope
- Target component:
- Requirement or design source:
- In scope:
- Out of scope:
- Assumptions:

2. Testability prerequisites
- Logic separation needed:
- Repository / service abstractions:
- External dependencies to mock:
- Config dependencies:

3. Fake and mock strategy
- Fake context setup:
- Message / Entity / Stage / Mode:
- Target / PreImage / PostImage:
- Depth / SharedVariables:
- Mocked service calls:
- Time / Guid / current user control:
- Logging / alert observation:

4. Test matrix
- Happy path:
- Boundary conditions:
- Exception path:
- Idempotency:
- Recursion / depth:
- Config branches:
- Permission / identity differences:

5. Test case list
- Case ID:
- Precondition:
- Input data:
- Steps:
- Expected result:
- Key assertions:
- Side effects / no side effects:

6. Assertion design
- Exception assertions:
- Data mutation assertions:
- Duplicate execution assertions:
- Log / alert assertions:
- Not-called assertions:

7. Coverage and CI gate
- Coverage target:
- Must-cover rules:
- Required test suite:
- Merge blocking rule:
- Failure handling:

8. Risks and open questions
- Unmockable dependencies:
- Data ambiguity:
- Environment differences:
- Open questions:
