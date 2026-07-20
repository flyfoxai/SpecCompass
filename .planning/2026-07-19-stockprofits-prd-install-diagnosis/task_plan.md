# Task Plan: stockprofits PRD installation diagnosis

## Goal
Determine whether the weak Level 1 result comes from an outdated installation, stale generated data, or an SP semantic-generation gap; safely refresh stockprofits and verify with a clean regeneration.

## Scope
- Inspect the global CLI, project-local Codex skill, review infrastructure, and generated Discovery data.
- Preserve stockprofits business files, `specs/`, and customized Constitution content.
- Refresh the current Codex integration from the installed v0.11.2 release.
- Regenerate Level 1 in a fresh model invocation and validate the result.
- Do not change SpecCompass source prompts until root cause evidence requires it.

## Current Phase
Phase 2

## Phases

### Phase 1: Installation and artifact inspection
- [x] Verify global CLI version.
- [x] Verify project-local `/sp.prd` contains v0.11.2 atom-first rules.
- [x] Compare install and generated-data timestamps.
- [x] Run the installed structural validator.
- **Status:** completed

### Phase 2: Safe project refresh
- [ ] Back up the customized Constitution outside the project.
- [ ] Refresh with the supported Codex integration command.
- [ ] Restore Constitution and compare managed-file evidence.
- **Status:** in_progress

### Phase 3: Clean Level 1 regeneration
- [ ] Start a fresh model process with current stockprofits sources.
- [ ] Generate a new schema-v3 Level 1 artifact without reusing the old answer.
- [ ] Validate and compare atom/project boundaries.
- **Status:** pending

### Phase 4: Root-cause conclusion
- [ ] Classify CLI, project template, stale artifact, context cache, and prompt/validator contributions.
- [ ] Record reproducible evidence and recommended fix.
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Treat CLI, project templates, and generated data as separate version layers | CLI upgrades do not automatically refresh initialized projects or regenerate active artifacts. |
| Preserve Constitution across `init --force` | The documented refresh path overwrites this shared memory file. |
| Do not modify prompts before clean reproduction | Current evidence already shows the project has the latest prompt, so generation/context behavior must be isolated first. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| `agent-reach doctor --json` unavailable (`command not found`) | The URL is local-only; continue with project files and Playwright instead of internet retrieval. |
| First validator invocation included an unsupported type argument | Re-ran with the documented single JSON path; validation passed. |
