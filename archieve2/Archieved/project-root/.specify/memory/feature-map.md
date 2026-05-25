# Feature Map

## Feature Overview

| Feature | Domain | Current Stage | Latest Verdict | Primary Entry | Primary Workset | Workset Count | Next Best Step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `codex-skills-installation` | installer and agent integration | baseline requirement and analysis recorded | `Analyze: FAIL` | `specs/codex-skills-installation/memory/index.md` | `none` | `0` | lock the remaining installer policy in `sp.clarify`, then run `sp.gate` |
| `attendance-leave` | attendance and leave | document-stage sample completed | `Gate: PASS WITH OPEN QUESTIONS`, `Analyze: PASS WITH RISKS` | `specs/attendance-leave/memory/index.md` | `WS-LEAVE-SIDE-EFFECTS` | `4` | keep hardening side effects and field precision in layer 2 docs |

## Quick Status Notes

| Feature | Stable Areas | Open Areas | Best Risk Entry |
| --- | --- | --- | --- |
| `codex-skills-installation` | Codex trigger form, Windows fallback expectation, manifest-plus-skills success criteria | installer entry strategy, readiness docs, Windows regression coverage | `specs/codex-skills-installation/memory/open-items.md` |
| `attendance-leave` | business backbone, main screens, main flow, trace anchors | side-effect ordering, notification policy, timezone and field precision, acceptance density | `specs/attendance-leave/memory/open-items.md` |

## Stage Meaning

| Stage Label | Meaning |
| --- | --- |
| document-stage sample completed | feature has passed through `sp.specify` to `sp.analyze` as a sample pack |
| `PASS WITH OPEN QUESTIONS` | business backbone is usable, but some deferred decisions remain open |
| `PASS WITH RISKS` | auto-development readiness is acceptable only with explicit risk visibility |
