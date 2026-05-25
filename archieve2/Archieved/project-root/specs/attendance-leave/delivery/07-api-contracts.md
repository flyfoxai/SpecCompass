# API Contracts

## API-LEAVE-DRAFT-SAVE

- Method: `POST`
- Path: `/api/leave/drafts`
- Request:
  - `leaveType: string`
  - `startAt: string(date-time)`
  - `endAt: string(date-time)`
  - `halfDay: boolean`
  - `reason: string`
- Response:
  - `requestId: string`
  - `status: draft`
- Permission: `ROLE-EMPLOYEE`
- Idempotency: 按 `employeeId + draftKey` 覆盖保存

## API-LEAVE-CREATE

- Method: `POST`
- Path: `/api/leave/requests`
- Request:
  - `leaveType: string`
  - `startAt: string(date-time)`
  - `endAt: string(date-time)`
  - `halfDay: boolean`
  - `reason: string`
- Response:
  - `requestId: string`
  - `status: pending`
  - `managerId: string`
- Validation:
  - `RULE-LEAVE-001`
  - `RULE-LEAVE-002`
  - `RULE-LEAVE-003`
  - `RULE-LEAVE-008`
  - `RULE-LEAVE-009`
- Error Codes:
  - `LEAVE_BALANCE_NOT_ENOUGH`
  - `LEAVE_TIME_CONFLICT`
  - `LEAVE_INVALID_RANGE`
- Permission: `ROLE-EMPLOYEE`
- Idempotency: `employeeId + startAt + endAt + leaveType`

## API-LEAVE-LIST

- Method: `GET`
- Path: `/api/leave/requests`
- Query:
  - `status`
  - `leaveType`
  - `dateFrom`
  - `dateTo`
- Response:
  - `items[]`
  - `total`
- Permission: `ROLE-EMPLOYEE`, `ROLE-HR`

## API-LEAVE-DETAIL

- Method: `GET`
- Path: `/api/leave/requests/{requestId}`
- Response:
  - `request`
  - `approvals[]`
- Permission: `ROLE-EMPLOYEE`, `ROLE-MANAGER`, `ROLE-HR`

## API-LEAVE-WITHDRAW

- Method: `POST`
- Path: `/api/leave/requests/{requestId}/withdraw`
- Request:
  - `reason: string(optional)`
- Response:
  - `requestId: string`
  - `status: withdrawn`
- Permission: `ROLE-EMPLOYEE`
- State Precondition: `pending`
- Error Codes:
  - `LEAVE_WITHDRAW_NOT_ALLOWED`

## API-LEAVE-APPROVE

- Method: `POST`
- Path: `/api/leave/requests/{requestId}/approve`
- Request:
  - `comment: string(optional)`
- Response:
  - `requestId: string`
  - `status: approved`
  - `eventId: string`
- Permission: `ROLE-MANAGER`
- State Precondition: `pending`
- Idempotency: `requestId + actedBy + decision`
- Side Effects:
  - 写入审批记录
  - 发送审批通过事件
- Error Codes:
  - `LEAVE_APPROVAL_SCOPE_DENIED`
  - `LEAVE_ALREADY_ACTED`

## API-LEAVE-REJECT

- Method: `POST`
- Path: `/api/leave/requests/{requestId}/reject`
- Request:
  - `comment: string(required)`
- Response:
  - `requestId: string`
  - `status: rejected`
- Permission: `ROLE-MANAGER`
- State Precondition: `pending`
- Error Codes:
  - `LEAVE_REJECT_REASON_REQUIRED`
  - `LEAVE_APPROVAL_SCOPE_DENIED`
