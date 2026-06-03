# Open Items

Use this file for real unresolved questions, todos, risks, blockers, rollback advice, and close conditions. Inline tags such as `@t0` and `@r0` are only search signals; the full reason, impact, owner, and close condition belong here when the item is not trivial.

Common item types: `Question`, `Todo`, `Risk`, `Blocker`. Anchors should use fixed framework coordinates where possible, or trace/source anchors already registered in `memory/trace-index.md`.

Link rule: each open item should resolve through either `Anchor` or `Affected Docs`. A valid `Anchor` matches at least one cell in `memory/trace-index.md`; otherwise at least one `Affected Docs` entry should match the `Expand Docs` cell for the affected trace row. Keep the full reason, impact, rollback, and close condition here rather than adding risk columns to `trace-index.md`.

Start empty. Do not add default `OPEN-*` or `RISK-*` blocks unless the current feature has real evidence for the unresolved item. Reminder dimensions belong to the checklist below; actual item blocks are only for real feature facts.

## Items

No open items yet.

When a real unresolved item exists, replace the line above with one block per item.
Use the short form for Low/Medium `Question` or `Todo` items when the item is local and does not affect scope, acceptance, release, rollback, security, or implementation confidence:

```markdown
### OPEN-001

- Type: Question | Todo
- Severity: Low | Medium
- Description: one sentence with the unresolved fact
- Status: Open | Monitoring | Closed
```

Use the full form for any `Risk`, any `Blocker`, any `High` severity item, or any item that affects scope, acceptance, release, rollback, security, or implementation confidence:

```markdown
### OPEN-001

- Type: Question | Todo | Risk | Blocker
- Severity: Low | Medium | High
- Domain: scope | UI | API | data | permissions | delivery | operations
- Workset: WS-PRIMARY-JOURNEY or another registered workset
- Anchor: TRACE-001 or another trace/source anchor
- Tags: @t0, @r0, or none
- Owner: named person, role, or next responsible step
- Description: one sentence with the unresolved fact
- Impact Area: affected scope, acceptance, release, data, security, or rollback area
- Affected Docs: spec.md, plan.md, ui/screen-primary.md
- Suggested Rollback: safe fallback, degradation, or "none needed"
- Close Condition: evidence required to close the item
- Last Refresh: YYYY-MM-DD
- Status: Open | Monitoring | Closed
```

## When To Create An Item

- Create a block only when the current feature has real evidence of an unresolved question, todo, risk, or blocker.
- Low/Medium `Question` or `Todo` items may stay short: `Type`, `Severity`, `Description`, and `Status` are enough unless the item affects scope, acceptance, release, rollback, security, or implementation confidence.
- `Risk`, `Blocker`, and `High` severity items must use the full form with owner, impact, rollback/degradation, close condition, refresh date, and trace/source link.
- Create a block when a `@t0` validation gap is not trivial: it affects scope, acceptance, release, rollback, human decision, follow-up work, or later implementation confidence.
- Create a `Risk` or `Blocker` block when `@r0` appears in source documents, trace rows, tasks, or workset memory.
- Create a block when a critical flow step lacks node type, port contract coverage, failure path, or verification evidence and the gap affects later planning, implementation, or acceptance.
- Create a block when a UI screen, field, or action cannot trace to a flow step, business event, data object, permission, API contract, acceptance path, or source document.
- Create a block when a draft fact from `sp.flow`, `sp.ui`, or `sp.plan` is needed for a PASS, risk closure, stable trace update, or implementation basis before it has been checked.
- Do not use this file for generic reminders, default concerns, or template examples.
- If a block cannot be linked through `Anchor` or `Affected Docs`, keep it visible and mark the missing link as part of the item description rather than guessing the link.

## Reminder Dimensions

Before deciding this file is empty, scan the current feature for unresolved issues in these dimensions:

- Scope boundary and excluded behavior
- Acceptance paths, edge cases, and failure paths
- Permissions, roles, approval rules, and audit expectations
- Data model, state transitions, migrations, retention, and deletion
- API contracts, events, side effects, compensation, and external dependencies
- UI fields, validation, copy, empty/error states, and navigation
- Release, rollout, rollback, degradation, and operational safety
- Security, privacy, compliance, and sensitive data handling
- Test evidence, smoke checks, and manual verification paths

If no real unresolved issue is found, leave the items section empty. An empty items section is valid.

## Conditional Risk Requirements

An open risk may support a conditional decision only when the row records all of the following:

- Owner
- Revisit anchor or next `sp.*` step
- Trace registration through `Anchor` or `Affected Docs`
- Impact scope
- Rollback or degradation path
- Close condition
- Evidence that the risk does not require rewriting `spec.md`, `plan.md`, or `tasks.md` before the current stage can continue
