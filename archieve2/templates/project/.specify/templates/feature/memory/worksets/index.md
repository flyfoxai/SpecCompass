# Workset Index

## Workset Selection Guide

| If You Need To... | Choose Workset | Why |
| --- | --- | --- |
| work on entry fields, submission rules, or request creation | `WS-PRIMARY-JOURNEY` | smallest bounded area for the main path |
| work on reviewer actions, permissions, or decision rules | `WS-DECISION-AND-APPROVAL` | isolates decision behavior without downstream spillover |
| work on list, detail, query, or follow-up | `WS-QUERY-AND-FOLLOWUP` | isolates read-path and post-submit visibility |
| work on events, notification, audit, or compensation | `WS-SIDE-EFFECTS` | isolates the highest-risk downstream area |

## Workset Catalog

| Workset ID | Use When | Avoid When | Context Budget | Key Screens | Key APIs | Key Tables | Acceptance | Adjacent Worksets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WS-PRIMARY-JOURNEY` | primary page, create action, validation, submit | the issue starts after reviewer action | small | `SCREEN-PRIMARY` | `API-CREATE` | `TABLE-PRIMARY_RECORD` | `ACC-PRIMARY-SUCCESS` | `WS-DECISION-AND-APPROVAL`, `WS-QUERY-AND-FOLLOWUP` |
| `WS-DECISION-AND-APPROVAL` | review page, approve, reject, permission checks | the issue is mainly about downstream compensation | small | `SCREEN-REVIEW` | `API-APPROVE`, `API-REJECT` | `TABLE-PRIMARY_RECORD`, `TABLE-DECISION_RECORD` | `ACC-DECISION-SUCCESS` | `WS-SIDE-EFFECTS`, `WS-QUERY-AND-FOLLOWUP` |
| `WS-QUERY-AND-FOLLOWUP` | list page, detail page, status visibility, follow-up actions | the issue is about create validation or review rules | small | `SCREEN-LIST`, `SCREEN-DETAIL` | `API-LIST`, `API-DETAIL` | `TABLE-PRIMARY_RECORD` | `ACC-QUERY-VIEW` | `WS-PRIMARY-JOURNEY`, `WS-DECISION-AND-APPROVAL` |
| `WS-SIDE-EFFECTS` | event ordering, audit, notification, compensation, idempotency | the issue is limited to page-field behavior | medium | `SCREEN-REVIEW`, `SCREEN-DETAIL` | `API-APPROVE` | `TABLE-SIDE_EFFECT_LEDGER`, `TABLE-DECISION_RECORD` | `ACC-SIDE-EFFECT-STABLE` | `WS-DECISION-AND-APPROVAL` |
