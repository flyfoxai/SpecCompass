# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | bootstrap the first feature under the `sp` document workflow |
| Active Feature | not selected |
| Primary Workset | not selected |
| Highest Risk | starting detailed design before the first feature is clarified |
| No-Go Boundary | do not enter implementation and do not skip feature registration |
| Refresh Date | fill when active feature is selected |
| Refresh Basis | `project-index.md`, `feature-map.md` |
| Source Of Truth | `project-index.md`, `feature-map.md` |
| Required Sync Files | `project-index.md`, `feature-map.md`, first feature memory |
| Stale Trigger | active feature changes, first feature created, workset selected |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | `.specify/memory/project-index.md` | confirms project-level route |
| 2 | `.specify/memory/constitution.md` | confirms workflow and phase boundary |
| 3 | `.specify/memory/feature-map.md` | confirms current feature registration state |

## Workset Routing

| If You Need To... | Choose | Why |
| --- | --- | --- |
| create the first feature | no workset yet | feature-level memory does not exist yet |
| validate project boundaries | project-level memory only | the first feature should inherit stable project rules |

## Forced Clarify Flush Checkpoints

| When | Why |
| --- | --- |
| before `sp.gate` | route-level questions must not stay hidden in batch queues |
| before `sp.bundle` | stable bundle must not carry unresolved route conflicts |
| before `sp.plan` | delivery design must inherit a stable business frame |

## Current Highest-Risk Area

| Priority | Topic | Entry |
| --- | --- | --- |
| `High` | creating detailed docs before the first feature exists | start with `sp.specify` |
