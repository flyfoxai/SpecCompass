# Open Items

| Item ID | Type | Severity | Domain | Workset | Description | Impact Area | Affected Docs | Suggested Rollback | Last Refresh | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OPEN-001` | `Question` | `High` | scope boundary | `WS-PRIMARY-JOURNEY` | Which edge cases are still undefined for the primary journey? | scope, acceptance | `spec.md`, `delivery/12-test-and-acceptance.md` | `sp.specify` | `__FEATURE_DATE__` | `Open` |
| `OPEN-002` | `Question` | `High` | permissions | `WS-DECISION-AND-APPROVAL` | Which reviewer permissions are stable versus deferred? | review, permissions | `clarifications.md`, `delivery/08-permissions-matrix.md` | `sp.plan` | `__FEATURE_DATE__` | `Open` |
| `RISK-001` | `Risk` | `High` | side effects | `WS-SIDE-EFFECTS` | Side-effect ordering or compensation rules are not yet rigid enough for low-supervision automation. | event handling, rollback | `analysis.md`, `delivery/09-events-and-side-effects.md` | `sp.plan` | `__FEATURE_DATE__` | `Open` |
| `RISK-002` | `Risk` | `Medium` | trace density | `WS-QUERY-AND-FOLLOWUP` | Query and detail acceptance may be too thin for later execution confidence. | traceability, acceptance | `memory/trace-index.md`, `delivery/12-test-and-acceptance.md` | `sp.tasks` | `__FEATURE_DATE__` | `Open` |

## Filter Views

| If You Are Working On... | Read These IDs First | Main Workset | Main Rollback |
| --- | --- | --- | --- |
| the primary user journey | `OPEN-001` | `WS-PRIMARY-JOURNEY` | `sp.specify` |
| permissions or review rules | `OPEN-002` | `WS-DECISION-AND-APPROVAL` | `sp.plan` |
| downstream events or compensation | `RISK-001` | `WS-SIDE-EFFECTS` | `sp.plan` |
| query and detail acceptance | `RISK-002` | `WS-QUERY-AND-FOLLOWUP` | `sp.tasks` |
