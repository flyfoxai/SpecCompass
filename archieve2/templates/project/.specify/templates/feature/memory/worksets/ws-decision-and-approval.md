# Workset: WS-DECISION-AND-APPROVAL

## Scope

- Own reviewer actions, approval or rejection rules, and permission boundaries.
- Keep decision points isolated from downstream side-effect internals.

## Read Set

1. `memory/stable-context.md`
2. `memory/trace-index.md`
3. `ui/screen-review.md`
4. `delivery/07-api-contracts.md`
5. `delivery/08-permissions-matrix.md`

## Owned Anchors

- Screens: `SCREEN-REVIEW`
- APIs: `API-APPROVE`, `API-REJECT`
- Tables: `TABLE-DECISION_RECORD`
- Acceptance: `ACC-DECISION-SUCCESS`

## Exit Checks

- Reviewer role and scope are explicit.
- Approval and rejection paths remain traceable.
