# Module Boundaries

| Module | Owns | Does Not Own |
| --- | --- | --- |
| `MODULE-PRIMARY` | entry flow, core request lifecycle, visible status | downstream compensation internals |
| `MODULE-REVIEW` | review decision rules and permission checks | unrelated query-only behavior |
| `MODULE-QUERY` | list, detail, visibility, follow-up entry points | create validation and review internals |
| `MODULE-SIDE-EFFECTS` | event emission, audit, compensation | user-facing field capture |

## Boundary Rules

- Keep module ownership aligned with worksets where practical.
- Isolate high-risk side effects, compensation, audit, notification, and permission checks so later implementation does not require a full-feature reread.
- If one module starts owning unrelated user paths or concern types, revisit `/sp.plan` and split the workset or module boundary.
