# __FEATURE_TITLE__

## Background

`__FEATURE_TITLE__` currently enters the workflow as a new feature branch under `__FEATURE_PATH__`.

Working problem statement:

- `__FEATURE_DESCRIPTION__`
- this document is the first stable scope anchor for later clarify, flow, ui, gate, bundle, plan, and analyze steps

## Goals

- establish one clear feature statement that downstream documents can trace back to
- define a stable in-scope backbone before deeper delivery design begins
- keep the initial draft concrete enough that later automation can detect missing facts instead of re-deriving everything

## In Scope

- the primary user-visible outcome implied by `__FEATURE_DESCRIPTION__`
- the smallest set of roles, states, screens, APIs, tables, and acceptance paths needed to describe the feature coherently
- explicit trace anchors that later `sp.*` steps can refine without changing the feature identity

## Out Of Scope

- implementation details or production code decisions
- unrelated platform cleanup and cross-feature redesign
- hidden assumptions that have not yet been confirmed in clarifications

## Initial Roles

- `ROLE-PRIMARY`: owns the main interaction or request initiation
- `ROLE-REVIEWER`: approves, reviews, or confirms outcomes when the feature needs a second actor
- `ROLE-SYSTEM`: performs validation, state transitions, logging, notifications, or other side effects

## Initial Success Criteria

- the feature can be described in one sentence without ambiguity
- downstream docs can map the feature to at least one primary flow, one screen cluster, and one acceptance path
- missing facts are explicit open items instead of silent gaps

## Open Clarification Items

- which role starts the primary flow and what is the expected end state
- what data objects or records must exist for the feature to be considered complete
- what approvals, permissions, or downstream side effects are in scope for the first pass
