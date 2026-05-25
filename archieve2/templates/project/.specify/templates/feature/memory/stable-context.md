# Stable Context

## Role Lookup

| Role ID | Core Actions | Main Screens | Main APIs | Notes |
| --- | --- | --- | --- | --- |
| `ROLE-PRIMARY-USER` | start the primary journey, submit data, track outcome | `SCREEN-PRIMARY`, `SCREEN-LIST`, `SCREEN-DETAIL` | `API-CREATE`, `API-LIST`, `API-DETAIL` | default initiating actor |
| `ROLE-REVIEWER` | review, approve, reject, or confirm a request | `SCREEN-REVIEW`, `SCREEN-DETAIL` | `API-APPROVE`, `API-REJECT`, `API-DETAIL` | decision-side actor |
| `ROLE-OPERATOR` | inspect, assist, or correct exceptional records | `SCREEN-LIST`, `SCREEN-DETAIL` | `API-LIST`, `API-DETAIL` | optional support actor |
| `ROLE-SYSTEM` | emit side effects, notifications, audit, and compensation handling | none | internal event handling after decision APIs | highest-risk downstream area |

## Freshness And Sync

| Key | Value |
| --- | --- |
| Feature | `__FEATURE_BRANCH__` |
| Status | initial stable backbone captured |
| Refresh Date | `__FEATURE_DATE__` |
| Source Of Truth | `clarifications.md`, `flows/*`, `ui/*`, `bundle.md`, `delivery/*` |
| Required Sync Files | `memory/index.md`, `memory/trace-index.md`, `memory/worksets/index.md`, `memory/worksets/ws-*.md`, `.specify/memory/active-context.md` |
| Stale Trigger | role, stage, object, or flow ownership changes |

## Feature Summary

This feature scaffold captures the initial stable role, stage, object, and trace backbone for `__FEATURE_TITLE__`.

## Stage Lookup

| Stage ID | Stage | Primary Owner | Entry Condition | Exit Condition |
| --- | --- | --- | --- | --- |
| `STAGE-01` | initiation | `ROLE-PRIMARY-USER` | actor opens the primary entry | request is saved or submitted |
| `STAGE-02` | pending review | `ROLE-REVIEWER` | a submitted request is available for decision | request is approved, rejected, or sent back |
| `STAGE-03` | downstream effects | `ROLE-SYSTEM` | decision result is stable enough to emit side effects | side effects and compensation reach a stable result |
| `STAGE-04` | final visibility | `ROLE-PRIMARY-USER`, `ROLE-REVIEWER`, `ROLE-OPERATOR` | the latest state is queryable | actors can inspect the final outcome |

## Object Lookup

| Object ID | Purpose | Main States Or Use | Primary Screens Or APIs | Primary Workset |
| --- | --- | --- | --- | --- |
| `OBJ-PRIMARY-REQUEST` | primary business object | draft, pending, approved, rejected, closed | primary, list, detail, create, list, detail | all worksets |
| `OBJ-DECISION-RECORD` | captures review decision | approve, reject, send-back, confirm | review screen, approve, reject | `WS-DECISION-AND-APPROVAL` |
| `OBJ-SIDE-EFFECT` | captures downstream execution status | queued, completed, compensated | decision APIs, side-effect flow | `WS-SIDE-EFFECTS` |

## Stable Delivery Anchors

| Anchor Type | Stable Items |
| --- | --- |
| Screens | `SCREEN-PRIMARY`, `SCREEN-LIST`, `SCREEN-DETAIL`, `SCREEN-REVIEW` |
| Use Cases | primary submit, review decision, query detail, follow-up |
| Core Tables | `TABLE-PRIMARY_RECORD`, `TABLE-DECISION_RECORD`, `TABLE-SIDE_EFFECT_LEDGER` |
| Acceptance Anchors | `ACC-PRIMARY-SUCCESS`, `ACC-DECISION-SUCCESS`, `ACC-QUERY-VIEW`, `ACC-SIDE-EFFECT-STABLE` |
