# Project Hotspots

| Hotspot ID | Type | Priority | Trigger Symptom | Affected Domain | Affected Feature | Primary Workset | Recommended Entry | Suggested Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HOTSPOT-001` | side effects | `High` | approval result is stable but downstream behavior is still ambiguous | attendance and leave | `attendance-leave` | `WS-LEAVE-SIDE-EFFECTS` | `specs/attendance-leave/memory/open-items.md` | `sp.plan` |
| `HOTSPOT-002` | field precision | `High` | UI, API, and table fields can drift on timezone or half-day semantics | attendance and leave | `attendance-leave` | `WS-LEAVE-EMPLOYEE-SUBMIT` | `specs/attendance-leave/memory/open-items.md` | `sp.plan` |
| `HOTSPOT-003` | acceptance density | `Medium` | rules are stable but acceptance anchors are still too sparse for lower-supervision delivery | attendance and leave | `attendance-leave` | `WS-LEAVE-QUERY-WITHDRAW` | `specs/attendance-leave/memory/open-items.md` | `sp.tasks` |
