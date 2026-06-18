# Fallback Log

Use this file only to prevent repeated cross-command loops. It is not a blocker
ledger, not a risk register, and not a replacement for `memory/open-items.md`.

`memory/open-items.md` remains the stable source of truth for unresolved
blockers, risks, decisions, and close conditions. Promote a fallback entry there
when it becomes stage-blocking, decision-bound, or repeatedly affects the same
workset.

## Active Entries

No fallback entries yet.

When a repeated fallback or upward route exists, replace the line above with at
most 10 active entries. Keep each entry short:

```markdown
### FB-001

- Workset or Anchor: WS-PRIMARY-JOURNEY or TRACE-001
- Command: /sp.analyze | /sp.gate | /sp.plan | /sp.tasks | /sp.implement
- Failure Signature: <Root Layer>::<command-or-check>::<primary-file-or-anchor>::<error-type>
- Failed Evidence: one line naming the failed command, missing file, stale route, or contradiction
- Attempted Routes: /sp.tasks -> /sp.plan
- Next Recommended Route: /sp.clarify | /sp.specify | /sp.flow | /sp.ui | /sp.plan | /sp.tasks | /sp.implement | /sp.analyze | /sp.gate
- Recorded At: YYYY-MM-DD or run label
- State: active | promoted | stale
- Promoted To: OPEN-001 or none
```

## Promotion Rules

- Keep at most 10 active entries. If more are needed, promote stage-blocking
  entries into `memory/open-items.md` and mark this entry as `promoted`.
- Promote when the same `Failure Signature` appears twice in the same workset,
  blocks stage entry, requires a human decision, or involves data migration,
  permissions, security, release, rollback, or worktree cleanup.
- If an entry was promoted, keep only a one-line reference here: `FB-001
  promoted -> OPEN-001`.
- If current evidence proves an entry no longer applies, mark it `stale` with
  the evidence line. Do not delete it during the same closeout round.
