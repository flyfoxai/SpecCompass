# Task Plan: SP Review Localhost Launcher

## Goal
Add reusable SP infrastructure that starts review pages through a verified loopback HTTP server and makes file:// an unsupported review path.

## Current Phase
Phase 4

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Inspect template distribution and runtime constraints
- [x] Obtain independent Claude and Gemini architecture reviews
- [x] Document findings and select a design
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Present the design and confirm the implementation boundary
- [x] Write the approved design spec
- [x] Create the TDD implementation plan
- **Status:** complete

### Phase 3: Implementation
- [x] Add failing tests for server startup, URL construction, readiness, and file:// rejection
- [x] Implement the reusable launcher and command contracts
- [x] Keep the implementation independent of project-specific content
- [x] Add view/module/requirement recommendation controls and download completion prompt
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Run focused automated tests
- [ ] Run the full automated test suite
- [x] Exercise the launcher in an installed/generated project
- [ ] Recheck current-view recommendation behavior with a selected node
- [x] Obtain a Gemini code review; Claude CLI provider did not return a usable verdict
- **Status:** in_progress

### Phase 5: Delivery
- [ ] Review the final diff and repository status
- [ ] Commit only the intended files if requested/appropriate
- [ ] Deliver the verified localhost URL behavior to the user
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Bind only to `127.0.0.1` | The review server must not expose project files on LAN interfaces. |
| Treat `file://` as unsupported | The user explicitly requires HTTP serving to be enforced by program behavior. |
| Keep infrastructure generic | This repository defines SP mechanics; project-specific artifacts belong elsewhere. |
| Use three explicit recommendation scopes | The user selected view, module, and requirement controls; all preserve drafts and saved decisions. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Gemini architecture review returned `INVALID_STREAM` after read-only inspection | Retry with a narrower prompt and supplied architecture facts instead of broad repository inspection. |
| First staged design review received an empty diff from `/tmp` | Reran Claude from the repository with the actual staged diff. |
| Claude found undefined scope and UI readiness contracts | Define scope derivation, UI output, timeout, migration, and download continuation precisely before implementation. |
| `当前视图按推荐保存` reused `visibleNodes()` and collapsed to the focused node | Add a tested `currentItemNodes()` scope and keep `visibleNodes()` only for focus-sensitive display/reset behavior. |
