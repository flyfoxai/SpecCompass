# OpenSpecs

*Keep the upstream bottle. Improve the workflow content.*

**An effort to keep the directory layout, template shell, and installer framing close to upstream
Spec Kit while replacing the active workflow semantics with layered `sp.*` document-stage logic.**

## What is OpenSpecs?

OpenSpecs is a forked workflow built on top of the Spec Kit mechanism frame. The repository keeps
the upstream layout and host-installation model where practical, but changes the workflow content
to a layered `sp.*` process that prioritizes routing, memory discipline, and documentation-first
handoffs before implementation.

The current repository is intentionally narrower than upstream Spec Kit:

- it focuses on documentation-stage workflow outputs
- it stops at `sp.analyze`
- it does not treat production code generation as the active repository promise

## Getting Started

- [Installation Guide](installation.md)
- [Quick Start Guide](quickstart.md)
- [Upgrade Guide](upgrade.md)
- [Local Development](local-development.md)

## Core Philosophy

OpenSpecs currently emphasizes:

- **Keep the upstream bottle where possible** so command shells, template placement, and install behavior remain predictable
- **Keep `sp` as the workflow content layer** so the main differences live in staged document semantics rather than packaging inventions
- **Prefer routing and memory discipline** over broad document or source sweeps
- **Reduce mechanism drift before adding new content ideas**

## Development Phases

| Phase | Focus | Key Activities |
|-------|-------|----------------|
| **Project Routing** | Establish project-level rules | Define constitution, project memory, and active context |
| **Business Clarification** | Specify what and why | Create `spec.md`, clarify scope, model flows, model UI, and gate quality |
| **Delivery Design** | Organize how the documents connect | Bundle artifacts, split worksets, define plan, and generate tasks |
| **Document Analysis** | Validate readiness | Reconcile routing, analyze traceability, and decide PASS or FAIL |

## Experimental Goals

### Mechanical Alignment

- Keep the repository tree, docs shell, helper scripts, and command template framing close to upstream `github/spec-kit`
- Limit local invention in packaging and host wiring

### Workflow Hardening

- Improve document traceability before later automation
- Make routing and memory files reliable enough for bounded read sets
- Keep stale project-level routing from blocking active feature work

### Host Predictability

- Install Codex and Claude project-local skills from the same canonical templates
- Preserve host-specific output shapes without reintroducing ad hoc packaging paths

## Core References

- [Mechanism Alignment Plan](reference/sp-upstream-mechanism-alignment.md)
- [Upstream File Mapping](reference/upstream-sp-file-mapping.md)
- [Command Spec](reference/sp-command-spec.md)
- [Context Memory Architecture](reference/sp-context-memory-architecture.md)
- [Template File Manifest](reference/sp-template-file-manifest.md)

## Contributing

Use the local reference docs when a change touches mechanism alignment, file mapping, or command
contracts. Keep installer behavior, command templates, and docs in sync.

## Support

Use the reference docs in this repository as the primary source of truth for the current fork,
especially where OpenSpecs intentionally diverges from upstream product semantics.
