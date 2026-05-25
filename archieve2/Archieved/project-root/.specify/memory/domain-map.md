# Domain Map

## Object And Rule Lookup

| Object Or Rule | Domain | Related Feature | Why It Matters | Recommended Entry |
| --- | --- | --- | --- | --- |
| `OBJ-LEAVE-REQUEST` | attendance and leave | `attendance-leave` | main business object across apply, approve, reject, withdraw, and visibility | `specs/attendance-leave/memory/stable-context.md` |
| `OBJ-LEAVE-APPROVAL` | attendance and leave | `attendance-leave` | captures manager decision and approval scope boundary | `specs/attendance-leave/memory/stable-context.md` |
| `OBJ-LEAVE-BALANCE` | attendance and leave | `attendance-leave` | highest impact shared rule for validation and post-approval deduction | `specs/attendance-leave/memory/open-items.md` |
| `OBJ-NOTIFICATION` | attendance and leave | `attendance-leave` | highest drift risk for side-effect timing and compensation | `specs/attendance-leave/memory/open-items.md` |
| `RULE-LEAVE-005` | attendance and leave | `attendance-leave` | defines approval ownership boundary | `specs/attendance-leave/clarifications.md` |
| `RULE-LEAVE-006` | attendance and leave | `attendance-leave` | defines downstream side effects after approval | `specs/attendance-leave/delivery/09-events-and-side-effects.md` |

## Domain Overview

| Domain | Related Features | Shared Boundary | Current Sample Entry |
| --- | --- | --- | --- |
| attendance and leave | `attendance-leave` | single-manager approval is in scope, proxy approval is deferred, current phase remains documentation-only | `specs/attendance-leave/memory/index.md` |
