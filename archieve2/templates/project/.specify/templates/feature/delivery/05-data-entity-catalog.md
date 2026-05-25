# Data Entity Catalog

| Entity | Source Of Truth | Key Fields | Notes |
| --- | --- | --- | --- |
| `TABLE-PRIMARY_RECORD` | primary request lifecycle | owner, state, created_at, updated_at | core user-facing record |
| `TABLE-DECISION_RECORD` | reviewer outcome | request_id, decision, reviewer_id, decided_at | reviewer audit anchor |
| `TABLE-SIDE_EFFECT_LEDGER` | downstream execution | request_id, effect_type, status, compensated_at | side-effect and rollback anchor |
