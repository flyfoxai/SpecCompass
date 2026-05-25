# Use Case Matrix

| Use Case ID | Goal | Primary Actor | Entry Screen | Exit State |
| --- | --- | --- | --- | --- |
| `UC-PRIMARY-SUBMIT` | create the primary request | `ROLE-PRIMARY-USER` | `SCREEN-PRIMARY` | `STATE-PENDING` |
| `UC-DECISION` | approve or reject a pending request | `ROLE-REVIEWER` | `SCREEN-REVIEW` | `STATE-APPROVED` or `STATE-REJECTED` |
| `UC-QUERY-VIEW` | inspect current or past requests | `ROLE-PRIMARY-USER`, `ROLE-OPERATOR` | `SCREEN-LIST`, `SCREEN-DETAIL` | current visible state |
| `UC-SIDE-EFFECT-STABILITY` | verify downstream actions settle correctly | `ROLE-SYSTEM` | internal flow | stable final state |
