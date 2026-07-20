# Task Plan: PRD Outline Levels Workshop

## Goal
Produce an initial, repository-grounded proposal for a three-level PRD Outline workflow, based on independent Claude, Gemini, and Codex analysis, without changing runtime code.

## Current Phase
Complete

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify current PRD/Outline contracts and constraints
- [x] Document findings
- **Status:** complete

### Phase 2: Independent Model Proposals
- [x] Obtain a repository-grounded Claude proposal
- [x] Obtain a repository-grounded Gemini proposal
- [x] Record their substantive recommendations and disagreements
- [x] Ask Claude and Gemini to revise against Codex review feedback
- **Status:** complete

### Phase 3: Codex Review and Synthesis
- [x] Evaluate the three proposals against current contracts
- [x] Select a recommended level model, interaction model, and transition rules
- **Status:** complete

### Phase 4: Proposal Artifact and Verification
- [x] Write the initial proposal file
- [x] Check for contradictions, placeholders, and accidental implementation claims
- **Status:** complete

### Phase 5: Delivery
- [x] Report the proposal path, recommendation, and unresolved choices
- [x] Ask the user to review before implementation planning
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Treat levels as progressive maturity, not Markdown heading depth | This matches the user's distinction between deep participation at levels 1/2 and model generation at level 3. |
| Produce a preliminary workshop artifact only | The user requested an initial proposal; runtime behavior remains unchanged pending review. |
| Keep constitution as constraints, not a substitute product source | Current governance ownership forbids silently deriving feature facts from constitution rules. |
| Separate discovery interaction from formal confirmation | Stage 1/2 collect and refine product intent; only the Stage 3 digest-bound package may authorize `/sp.specify`. |
| Use separate discovery and confirmation schemas/packages inside one renderer shell | Sparse Stage 1/2 data should not weaken the existing formal Outline schema's digest, authority, and view requirements. |
| Require an end-to-end first slice | A UI that only downloads an unconsumed package does not produce a recoverable product-discovery workflow. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Gemini local proxy initially returned transient fetch/502 errors | Allowed CLI retries to complete; Gemini returned a full proposal with exit code 0. |
