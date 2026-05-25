# Workset Index

## Workset Selection Guide

| If You Need To... | Choose Workset | Why |
| --- | --- | --- |
| work on apply fields, draft, submit validation, or create payloads | `WS-LEAVE-EMPLOYEE-SUBMIT` | this is the smallest bounded area for employee entry and create-path rules |
| work on approve, reject, manager scope, or reject reason rules | `WS-LEAVE-MANAGER-APPROVAL` | this isolates decision behavior without side-effect detail |
| work on list, detail, visibility, or withdraw | `WS-LEAVE-QUERY-WITHDRAW` | this isolates read-path and withdraw rules |
| work on post-approval balance, notification, compensation, or idempotency | `WS-LEAVE-SIDE-EFFECTS` | this isolates the highest-risk downstream area |

## Workset Catalog

| Workset ID | Use When | Avoid When | Context Budget | Key Screens | Key APIs | Key Tables | Acceptance | Adjacent Worksets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WS-LEAVE-EMPLOYEE-SUBMIT` | apply page, draft save, submit validation, time range, balance gate | the issue starts after manager action or notification dispatch | small | `SCREEN-LEAVE-APPLY` | `API-LEAVE-DRAFT-SAVE`, `API-LEAVE-CREATE` | `TABLE-LEAVE_REQUEST` | `ACC-LEAVE-SUBMIT-SUCCESS` | `WS-LEAVE-QUERY-WITHDRAW`, `WS-LEAVE-MANAGER-APPROVAL` |
| `WS-LEAVE-MANAGER-APPROVAL` | approval page, approve, reject, scope check, reject reason | the issue is mainly about post-approval compensation or employee-side field validation | small | `SCREEN-LEAVE-APPROVAL` | `API-LEAVE-APPROVE`, `API-LEAVE-REJECT` | `TABLE-LEAVE_REQUEST`, `TABLE-LEAVE_APPROVAL` | `ACC-LEAVE-APPROVE-SUCCESS`, `ACC-LEAVE-REJECT-REASON` | `WS-LEAVE-SIDE-EFFECTS`, `WS-LEAVE-QUERY-WITHDRAW` |
| `WS-LEAVE-QUERY-WITHDRAW` | list page, detail page, withdraw path, result visibility | the issue is about request creation or approval-side events | small | `SCREEN-LEAVE-LIST`, `SCREEN-LEAVE-DETAIL` | `API-LEAVE-LIST`, `API-LEAVE-DETAIL`, `API-LEAVE-WITHDRAW` | `TABLE-LEAVE_REQUEST`, `TABLE-LEAVE_APPROVAL` | `ACC-LEAVE-LIST-VIEW`, `ACC-LEAVE-WITHDRAW-SUCCESS` | `WS-LEAVE-EMPLOYEE-SUBMIT`, `WS-LEAVE-MANAGER-APPROVAL` |
| `WS-LEAVE-SIDE-EFFECTS` | approval events, balance ledger, notification, compensation, idempotency | the issue is limited to page-field behavior or basic list/detail rendering | medium | `SCREEN-LEAVE-APPROVAL`, `SCREEN-LEAVE-DETAIL` | `API-LEAVE-APPROVE` | `TABLE-LEAVE_BALANCE_LEDGER`, `TABLE-LEAVE_APPROVAL`, `TABLE-LEAVE_REQUEST` | `ACC-LEAVE-APPROVE-SUCCESS` | `WS-LEAVE-MANAGER-APPROVAL` |
