# Test And Acceptance

## ACC-PRIMARY-SUCCESS

- Goal: verify the primary request can be created successfully
- Preconditions:
  - required inputs are valid
  - actor is within allowed scope
- Steps:
  1. Open `SCREEN-PRIMARY`
  2. Submit a valid request
- Expected:
  - `API-CREATE` is called
  - `TABLE-PRIMARY_RECORD` is written
  - the request enters the pending or visible state

## ACC-DECISION-SUCCESS

- Goal: verify reviewer decision handling
- Preconditions:
  - a pending request exists
  - current reviewer has scope
- Steps:
  1. Open `SCREEN-REVIEW`
  2. Approve or reject with valid inputs
- Expected:
  - the correct decision API is called
  - `TABLE-DECISION_RECORD` is written
  - the visible state updates consistently

## ACC-QUERY-VIEW

- Goal: verify list and detail visibility
- Preconditions:
  - at least one visible request exists
- Steps:
  1. Open `SCREEN-LIST`
  2. Filter and open a detail view
- Expected:
  - `API-LIST` and `API-DETAIL` remain consistent
  - returned data matches visibility rules

## ACC-SIDE-EFFECT-STABLE

- Goal: verify side effects settle predictably after a positive decision
- Preconditions:
  - approval path succeeds
- Steps:
  1. Trigger the decision that emits downstream events
  2. Observe audit, notification, and ledger outputs
- Expected:
  - `TABLE-SIDE_EFFECT_LEDGER` records the downstream status
  - compensation or retry behavior is explicit
