# Flows Index

## Flow Catalog

| Flow ID | Canonical Name | Alias Keywords | Owner Stage | Key Step IDs | Source Rules | Source Screens | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FLOW-001` | primary business flow | mainline, primary journey | `STAGE-01`, `STAGE-02`, `STAGE-03` | `STEP-010`, `STEP-040`, `STEP-080`, `STEP-110` | `RULE-001`, `RULE-002`, `RULE-003`, `RULE-004` | `SCREEN-PRIMARY`, `SCREEN-REVIEW`, `SCREEN-DETAIL` | covers submit, review, and finalization |
| `FLOW-SEQ-001` | interaction sequence | actor-system sequence | `STAGE-01`, `STAGE-02`, `STAGE-03` | `STEP-040`, `STEP-090`, `STEP-120` | `RULE-003`, `RULE-004` | `SCREEN-PRIMARY`, `SCREEN-REVIEW` | emphasizes actor/system order |
| `FLOW-STATE-001` | state progression | state machine, lifecycle | `STAGE-01`, `STAGE-02`, `STAGE-04` | `STATE-DRAFT`, `STATE-PENDING`, `STATE-APPROVED`, `STATE-REJECTED`, `STATE-CLOSED` | `RULE-002` | `SCREEN-PRIMARY`, `SCREEN-DETAIL`, `SCREEN-REVIEW` | state and transition view only |

## Key Node Lookup

| Node ID | Canonical Name | Alias Keywords | Parent Flow | Type | Notes |
| --- | --- | --- | --- | --- | --- |
| `STEP-010` | open primary screen | start, enter feature | `FLOW-001` | Step | enters `SCREEN-PRIMARY` |
| `DEC-020` | validate required fields and rules | pre-submit validation | `FLOW-001` | Decision | corresponds to request creation checks |
| `STEP-040` | submit primary request | create, send, confirm | `FLOW-001` | Step | triggers `UC-PRIMARY-SUBMIT` |
| `STEP-080` | enter review decision | review, approve, reject | `FLOW-001` | Step | enters `SCREEN-REVIEW` |
| `DEC-090` | choose final decision | approve or reject | `FLOW-001` | Decision | splits decision path |
| `STEP-110` | emit side effects | notify, audit, compensate | `FLOW-001` | Step | downstream system handling |
