# Quick Start Guide

This guide will help you get started with the document-stage `sp.*` workflow using the current
OpenSpecs starter pack.

> [!NOTE]
> The repository uses the upstream-style command shell, but the active workflow semantics are
> `sp.*`, not `speckit.*`.

## The 10-Step Process

> [!TIP]
> **Routing first**: read project memory, resolve the active feature, and keep to the smallest
> useful read set before expanding into source documents.

### Step 1: Install the Starter Pack

**In your terminal**, install the starter pack into the target project:

```bash
sh scripts/install.sh --ai codex ./your-project
```

Or for a Claude-style slash-command host:

```bash
sh scripts/install.sh --ai claude ./your-project
```

### Step 2: Define the Constitution

Use the host-appropriate `sp` trigger to establish the project-level rules and memory routing
entry.

- Codex: `$sp-constitution`
- Claude: `/sp-constitution`
- Other slash-command hosts: `/sp.constitution`

```markdown
sp.constitution Establish project-level rules, routing rules, and documentation-stage boundaries.
```

### Step 3: Create the Spec

Use `sp.specify` to describe what the feature is and why it matters. Keep the prompt focused on
business requirement and scope, not delivery design.

```markdown
sp.specify Build a leave request workflow for managers and employees. Focus on business rules, approval paths, and success criteria.
```

### Step 4: Clarify the Spec

Use `sp.clarify` to resolve route-changing or high-impact ambiguities before expanding the first
layer of documents.

```markdown
sp.clarify Focus on role boundaries, approval exceptions, and audit requirements.
```

### Step 5: Expand Business Documents

Use `sp.flow`, `sp.ui`, and `sp.gate` to complete the first-layer business and review artifacts.

### Step 6: Bridge into Delivery Design

Use `sp.bundle` to prepare the handoff from first-layer business documents into second-layer
delivery design work.

### Step 7: Create the Delivery Plan

Use `sp.plan` to organize worksets and explicit relationships among flows, screens, APIs, data,
permissions, and acceptance.

### Step 8: Generate Tasks

Use `sp.tasks` to create an executable documentation task set tied to worksets and deliverables.

### Step 9: Analyze the Document System

Use `sp.analyze` to verify whether the overall document system is strong enough for later
automation.

### Step 10: Repeat Narrowly

When analysis fails, revisit only the blocking `sp.*` step and refresh the affected memory and
documents rather than re-running the whole chain blindly.

## Detailed Example: Leave Request Feature

Here is a concise example sequence using the current `sp.*` workflow:

### Step 1: Define Constitution

```markdown
sp.constitution Use routing-first document rules. Treat project memory as a routing layer and preserve smallest useful read sets.
```

### Step 2: Define Requirements with `sp.specify`

```text
sp.specify Create a leave request feature for employees and managers. Employees can submit leave requests, managers approve or reject them, and the system must track balances, audit events, and notification outcomes.
```

### Step 3: Refine with `sp.clarify`

```text
sp.clarify Clarify approval escalation rules, balance edge cases, notification failures, and which actor can cancel an approved request.
```

### Step 4: Expand First-Layer Documents

```text
sp.flow
sp.ui
sp.gate
```

### Step 5: Bridge into Delivery Design

```text
sp.bundle
sp.plan
sp.tasks
sp.analyze
```

## Key Principles

- stay inside documentation work
- read project memory first
- resolve the active feature before expanding documents
- use the smallest useful read set
- refresh memory when stable facts or routing change
- do not mark PASS while major gaps or stale routing remain

## Next Steps

- Read the [Installation Guide](installation.md)
- Review the [Command Spec](reference/sp-command-spec.md)
- Use the [Context Memory Architecture](reference/sp-context-memory-architecture.md) when a feature grows large

## Related Detail

- [Command Spec](reference/sp-command-spec.md)
- [Command Output Contracts](reference/sp-command-output-contracts.md)
- [Context Memory Architecture](reference/sp-context-memory-architecture.md)
