# Project Memory Index

## Question Routing Matrix

| If The Question Is About... | Keywords | Recommended Feature | Read First | Next Hop |
| --- | --- | --- | --- | --- |
| project rules, phase boundaries, what is forbidden now | constitution, boundary, phase, scope, implement | project-level | `constitution.md` | create or update `feature-map.md` |
| which feature to enter, what to read first, current smallest work area | active feature, read order, workset, smallest context | no active feature yet | `active-context.md` | create the first `specs/<feature>/` pack |
| overall feature stage, gate verdict, readiness, workset count | stage, verdict, readiness, gate, analyze | no feature registered yet | `feature-map.md` | create the first feature record |
| shared object, business domain, cross-feature consistency | domain, object, shared rule, ownership | project-level | `domain-map.md` | register shared objects and domains |
| repeated high-risk topics, rollback entry, where drift may happen | hotspot, risk, rollback, drift | project-level | `hotspots.md` | update after the first feature analysis |

## Current Snapshot

| Key | Value |
| --- | --- |
| Project | fill your project name |
| Stage | document-stage framework bootstrapped |
| Active Feature | not selected |
| Primary Workset | not selected |
| Latest Gate | not available |
| Latest Analysis | not available |
| Refresh Date | fill when first project setup is confirmed |

## Current Minimum Read Set

| Order | File | Why It Is In The Minimum Set |
| --- | --- | --- |
| 1 | `project-index.md` | first-hop routing |
| 2 | `constitution.md` | confirms phase boundary and workflow rules |
| 3 | `active-context.md` | confirms whether an active feature already exists |
| 4 | `feature-map.md` | shows feature registration state |
| 5 | `domain-map.md` | shows shared objects and domains |

## Current Focus

| Topic | Recommended Entry | Why Now |
| --- | --- | --- |
| first feature bootstrapping | `feature-map.md` | no feature is registered yet |
| project boundary alignment | `constitution.md` | phase and workflow rules should be stable first |
| initial domain registration | `domain-map.md` | shared terms should not be invented repeatedly |

## Latest Summary

- Project-level memory has been initialized.
- No feature is active yet.
- Use `sp.specify` to register the first feature and create feature-level memory.
