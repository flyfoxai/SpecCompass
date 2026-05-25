# API Contracts

| API ID | Purpose | Input Highlights | Output Highlights | Owner Workset |
| --- | --- | --- | --- | --- |
| `API-CREATE` | create or submit the primary request | required fields, actor identity, validation context | request identifier, current state | `WS-PRIMARY-JOURNEY` |
| `API-APPROVE` | record a positive reviewer decision | request identifier, reviewer identity, optional comment | decision result, downstream trigger | `WS-DECISION-AND-APPROVAL`, `WS-SIDE-EFFECTS` |
| `API-REJECT` | record a negative reviewer decision | request identifier, reviewer identity, rejection reason | rejected state and audit fields | `WS-DECISION-AND-APPROVAL` |
| `API-LIST` | query visible records | filters, pagination, actor scope | list items and summary counts | `WS-QUERY-AND-FOLLOWUP` |
| `API-DETAIL` | read a single visible record | request identifier | current state, history, next actions | `WS-QUERY-AND-FOLLOWUP` |
