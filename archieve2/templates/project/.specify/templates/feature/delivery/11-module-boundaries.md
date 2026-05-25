# Module Boundaries

| Module | Owns | Does Not Own |
| --- | --- | --- |
| `MODULE-PRIMARY` | entry flow, core request lifecycle, visible status | downstream compensation internals |
| `MODULE-REVIEW` | review decision rules and permission checks | unrelated query-only behavior |
| `MODULE-QUERY` | list, detail, visibility, follow-up entry points | create validation and review internals |
| `MODULE-SIDE-EFFECTS` | event emission, audit, compensation | user-facing field capture |
