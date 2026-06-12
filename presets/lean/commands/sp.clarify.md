---
description: Resolve blocking human decisions and write them back.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Read `.specify/feature.json` to get the feature directory path.

2. **Load context**: `.specify/memory/constitution.md`, `<feature_directory>/spec.md`, `<feature_directory>/plan.md` or `<feature_directory>/tasks.md` when present, and `<feature_directory>/memory/open-items.md` when present.

3. Resolve only the blocking decision.
   - Identify the decision point and its `Blocker ID`, `Failure Signature`, `Root Layer`, `Next Route`, and `Writeback Target` when available.
   - Build a plain-language decision package with background, impact, evidence, 2-4 options, tradeoffs, recommendation, and next `/sp.*` route.
   - If no human-selected choice is available, return `NEEDS_DECISION` and keep downstream work frozen for the same blocker. End with `SP_EXIT_CODE: 1` when the host supports blocking status.
   - If the user has selected an option, record the decision as `human-selected`, write it back to the source doc, task, or `memory/open-items.md`, and unfreeze only the affected blocker scope.
   - Preserve a searchable writeback note that names the chosen option, target document, affected blocker scope, close condition, and next route.
   - If clarification reveals a new independent feature or scope expansion, route to `/sp.specify` instead of silently expanding the current feature.

Do not write production code in this command. Do not replace `/sp.specify`, `/sp.plan`, `/sp.tasks`, `/sp.analyze`, or `/sp.gate`.
