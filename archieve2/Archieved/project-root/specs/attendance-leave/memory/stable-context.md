# Stable Context

## Role Lookup

| Role ID | Core Actions | Main Screens | Main APIs | Notes |
| --- | --- | --- | --- | --- |
| `ROLE-EMPLOYEE` | create, submit, view, withdraw own requests | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-LIST`, `SCREEN-LEAVE-DETAIL` | `API-LEAVE-DRAFT-SAVE`, `API-LEAVE-CREATE`, `API-LEAVE-LIST`, `API-LEAVE-DETAIL`, `API-LEAVE-WITHDRAW` | owns request initiation and self-service visibility |
| `ROLE-MANAGER` | approve or reject pending requests in owned scope | `SCREEN-LEAVE-APPROVAL`, `SCREEN-LEAVE-DETAIL` | `API-LEAVE-APPROVE`, `API-LEAVE-REJECT`, `API-LEAVE-DETAIL` | may act only within owned approval scope |
| `ROLE-HR` | global visibility and exceptional correction | `SCREEN-LEAVE-LIST`, `SCREEN-LEAVE-DETAIL` | `API-LEAVE-LIST`, `API-LEAVE-DETAIL` | not a replacement for normal approval path |
| `ROLE-SYSTEM` | balance linkage, notification dispatch, audit, compensation handling | none | internal event handling after `API-LEAVE-APPROVE` | highest-risk downstream area |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `attendance-leave` |
| Status | stable first-layer backbone and second-layer delivery anchors exist |
| Refresh Date | `2026-04-02` |
| Refresh Basis | `clarifications.md`, `bundle.md`, `flows/index.md`, `ui/screen-map.md`, `delivery/*` |
| Source Of Truth | `clarifications.md`, `flows/*`, `ui/*`, `bundle.md`, `delivery/*` |
| Required Sync Files | `memory/index.md`, `memory/trace-index.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `.specify/memory/active-context.md` |
| Stale Trigger | route-level clarify changes, flow owner changes, screen owner changes, workset split changes |

## Feature Summary

This feature covers employee leave request, manager approval, result visibility, and post-approval linkage at the document stage.

## Target Resolution Shortcuts

| User Phrase | Resolved Target | Target Type | Resolution Basis | Primary Doc |
| --- | --- | --- | --- | --- |
| 申请页提交按钮 | `ACTION-LEAVE-APPLY-020` | action | canonical name + alias + owner screen | `ui/screen-leave-apply.md` |
| 申请页保存草稿按钮 | `ACTION-LEAVE-APPLY-010` | action | canonical name + alias + owner screen | `ui/screen-leave-apply.md` |
| 列表页筛选区 | `SECTION-LEAVE-LIST-010` | section | alias + owner screen | `ui/screen-leave-list.md` |
| 列表页结果区 | `SECTION-LEAVE-LIST-020` | section | canonical name + owner screen | `ui/screen-leave-list.md` |
| 审批页驳回原因框 | `FIELD-LEAVE-APPROVAL-010` | field | canonical name + alias + owner section | `ui/screen-leave-approval.md` |
| 审批页通过按钮 | `ACTION-LEAVE-APPROVAL-010` | action | canonical name + owner screen | `ui/screen-leave-approval.md` |
| 提交请假申请步骤 | `STEP-LEAVE-040` | step | canonical name + flow context | `flows/index.md` |
| 审批结果判断点 | `DEC-LEAVE-090` | decision | alias + flow context | `flows/index.md` |

## Stage Lookup

| Stage ID | Stage | Primary Owner | Entry Condition | Exit Condition |
| --- | --- | --- | --- | --- |
| `STAGE-LEAVE-01` | request preparation | `ROLE-EMPLOYEE` | employee opens apply page or draft | draft saved or request submitted |
| `STAGE-LEAVE-02` | pending review | `ROLE-MANAGER` | create API accepts the request | request is approved or rejected |
| `STAGE-LEAVE-03` | decision capture | `ROLE-MANAGER` | manager acts within owned scope | approval record is written |
| `STAGE-LEAVE-04` | downstream effects | `ROLE-SYSTEM` | approval success is confirmed | balance, notification, audit, and compensation handling reach a stable result |
| `STAGE-LEAVE-05` | final visibility | `ROLE-EMPLOYEE`, `ROLE-MANAGER`, `ROLE-HR` | request has a visible latest state | actors can query and trace the final outcome |

## Object Lookup

| Object ID | Purpose | Main States Or Use | Primary Screens Or APIs | Primary Workset |
| --- | --- | --- | --- | --- |
| `OBJ-LEAVE-REQUEST` | primary request object | draft, pending, approved, rejected, withdrawn | apply, list, detail, create, list, detail, withdraw | all worksets |
| `OBJ-LEAVE-APPROVAL` | captures manager action | approve or reject decision record | approval screen, approve, reject | `WS-LEAVE-MANAGER-APPROVAL` |
| `OBJ-LEAVE-BALANCE` | eligibility and downstream ledger linkage | balance check and post-approval deduction | create, approve | `WS-LEAVE-EMPLOYEE-SUBMIT`, `WS-LEAVE-SIDE-EFFECTS` |
| `OBJ-NOTIFICATION` | to-do and result communication | pending to-do, result notice, failure compensation | approve side effects | `WS-LEAVE-SIDE-EFFECTS` |

## Decision Lookup

| Decision ID | Question | Stable Answer | Primary Rule Or API |
| --- | --- | --- | --- |
| `DEC-LEAVE-001` | are required fields and time range valid | submit only proceeds when required fields and time range are valid | `RULE-LEAVE-001`, `API-LEAVE-CREATE` |
| `DEC-LEAVE-002` | can the employee submit now | submission is blocked when balance or conflict checks fail | `RULE-LEAVE-003`, `RULE-LEAVE-009`, `API-LEAVE-CREATE` |
| `DEC-LEAVE-003` | can the current actor approve or reject | only managers in owned scope may act | `RULE-LEAVE-005`, `API-LEAVE-APPROVE`, `API-LEAVE-REJECT` |
| `DEC-LEAVE-004` | what happens after approve succeeds | approval record and downstream effects must be produced | `RULE-LEAVE-006`, `API-LEAVE-APPROVE` |
| `DEC-LEAVE-005` | can the employee withdraw | withdraw is only allowed for own pending requests | `RULE-LEAVE-004`, `API-LEAVE-WITHDRAW` |

## Flow Target Lookup

| Flow ID | Canonical Name | Key Step IDs | Key Decision IDs | Primary Doc |
| --- | --- | --- | --- | --- |
| `FLOW-LEAVE-001` | 请假申请主流程 | `STEP-LEAVE-010`, `STEP-LEAVE-040`, `STEP-LEAVE-080`, `STEP-LEAVE-110` | `DEC-LEAVE-020`, `DEC-LEAVE-030`, `DEC-LEAVE-090` | `flows/index.md` |
| `FLOW-LEAVE-SEQ-001` | 请假交互时序 | `STEP-LEAVE-040`, `STEP-LEAVE-100`, `STEP-LEAVE-140` | none | `flows/index.md` |
| `FLOW-LEAVE-STATE-001` | 请假状态流转 | `STATE-REQUEST-DRAFT`, `STATE-REQUEST-PENDING`, `STATE-REQUEST-APPROVED`, `STATE-REQUEST-REJECTED`, `STATE-REQUEST-WITHDRAWN` | none | `flows/index.md` |

## UI Target Lookup

| Screen ID | Canonical Name | Key Sections | Key Actions | Key Fields | Primary Doc |
| --- | --- | --- | --- | --- | --- |
| `SCREEN-LEAVE-APPLY` | 请假申请页 | `SECTION-LEAVE-APPLY-010`, `SECTION-LEAVE-APPLY-020`, `SECTION-LEAVE-APPLY-030`, `SECTION-LEAVE-APPLY-040` | `ACTION-LEAVE-APPLY-010`, `ACTION-LEAVE-APPLY-020` | `FIELD-LEAVE-APPLY-010`, `FIELD-LEAVE-APPLY-020`, `FIELD-LEAVE-APPLY-030`, `FIELD-LEAVE-APPLY-040`, `FIELD-LEAVE-APPLY-050`, `FIELD-LEAVE-APPLY-060`, `FIELD-LEAVE-APPLY-070` | `ui/screen-leave-apply.md` |
| `SCREEN-LEAVE-LIST` | 请假记录页 | `SECTION-LEAVE-LIST-010`, `SECTION-LEAVE-LIST-020`, `SECTION-LEAVE-LIST-030` | `ACTION-LEAVE-LIST-010`, `ACTION-LEAVE-LIST-020`, `ACTION-LEAVE-LIST-030` | `FIELD-LEAVE-LIST-010`, `FIELD-LEAVE-LIST-020`, `FIELD-LEAVE-LIST-030`, `FIELD-LEAVE-LIST-040` | `ui/screen-leave-list.md` |
| `SCREEN-LEAVE-DETAIL` | 请假详情页 | `SECTION-LEAVE-DETAIL-010`, `SECTION-LEAVE-DETAIL-020`, `SECTION-LEAVE-DETAIL-030`, `SECTION-LEAVE-DETAIL-040` | `ACTION-LEAVE-DETAIL-010`, `ACTION-LEAVE-DETAIL-020` | `FIELD-LEAVE-DETAIL-010`, `FIELD-LEAVE-DETAIL-020`, `FIELD-LEAVE-DETAIL-030`, `FIELD-LEAVE-DETAIL-040` | `ui/screen-leave-detail.md` |
| `SCREEN-LEAVE-APPROVAL` | 请假审批页 | `SECTION-LEAVE-APPROVAL-010`, `SECTION-LEAVE-APPROVAL-020`, `SECTION-LEAVE-APPROVAL-030`, `SECTION-LEAVE-APPROVAL-040` | `ACTION-LEAVE-APPROVAL-010`, `ACTION-LEAVE-APPROVAL-020` | `FIELD-LEAVE-APPROVAL-010`, `FIELD-LEAVE-APPROVAL-020`, `FIELD-LEAVE-APPROVAL-030` | `ui/screen-leave-approval.md` |

## Confirmed Boundaries

| Boundary Type | Items |
| --- | --- |
| In Scope | apply, submit, list, detail, withdraw, single-manager approval, notification |
| Deferred | proxy approval, multi-level approval, attachment upload, roster linkage, payroll linkage |
| Phase Limit | document stage only, no production code, no deployment design |

## Stable Delivery Anchors

| Anchor Type | Stable Items |
| --- | --- |
| Screens | `SCREEN-LEAVE-APPLY`, `SCREEN-LEAVE-LIST`, `SCREEN-LEAVE-DETAIL`, `SCREEN-LEAVE-APPROVAL` |
| Use Cases | submit, approve, reject, withdraw, list, detail |
| Core Tables | `TABLE-LEAVE_REQUEST`, `TABLE-LEAVE_APPROVAL`, `TABLE-LEAVE_BALANCE_LEDGER` |
| Acceptance Anchors | `ACC-LEAVE-SUBMIT-SUCCESS`, `ACC-LEAVE-APPROVE-SUCCESS`, `ACC-LEAVE-REJECT-REASON`, `ACC-LEAVE-WITHDRAW-SUCCESS`, `ACC-LEAVE-LIST-VIEW` |
