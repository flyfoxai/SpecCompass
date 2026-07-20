# Findings & Decisions

## Requirements
- Start a local static server from the target project root.
- Bind to `127.0.0.1` and choose an available port.
- Verify both the renderer and selected review-data URL return HTTP 200 before reporting success.
- Return a clickable URL using the renderer short parameter (`flow` or `ui`).
- Reject or block `file://` usage through program behavior, not documentation alone.
- Implement reusable SP infrastructure without concrete project content.
- Ask local Claude and Gemini CLIs to review architecture and implementation.

## Research Findings
- The current renderer only warns after a `file://` fetch failure; it does not enforce HTTP.
- The renderer README still documents `file://` as a supported static-review fallback.
- `/sp.flow` and `/sp.ui` command templates point at a repository-relative renderer path but do not invoke a launcher.
- The fixed review infrastructure is distributed from `templates/project/.specify/review/`.
- The repository already requires Node for `validate-review-data.mjs`, so a Node launcher adds no new review-toolchain runtime.
- `_install_shared_infra()` copies the full project template tree and refreshes `.specify/review` during explicit force/upgrade paths.
- Gemini recommends a self-contained Node launcher over Python or a global Specify CLI subcommand. It emphasized strict loopback binding, Host allowlisting, path traversal defense, MIME types, GET/HEAD-only handling, and signal cleanup.
- Gemini proposed replacing HTTP self-checks with filesystem checks. That conflicts with the explicit requirement that both URLs return HTTP 200; filesystem checks can only be an additional fail-fast step.
- Claude recommends the same Node boundary and requires a stable readiness-output protocol, OS-assigned port reporting after `listening`, bounded HTTP self-check timeouts, `Cache-Control: no-store`, symlink-aware realpath boundaries, and clean SIGINT/SIGTERM handling.
- Claude's first repository-reading call stalled because its Bash tool requests were permission-denied; a no-tools architecture call completed successfully without modifying the repository.
- The existing renderer already defines `visibleNodes()`, `allNodes()`, and `runRecommendationCompletion(entries, scopeLabel)`; only a module-level flattening helper is missing.
- The current download path already continues automatically after recommendation completion and then applies unresolved-item and draft gates.
- `itemKey()` is existing renderer infrastructure and maps Flow to `diagrams` and UI to `screens`; module recommendation completion must only flatten that active collection.
- `visibleNodes()` narrows to `selectedNodeId`, so it cannot define the `当前视图按推荐保存` scope; the button must use all nodes from `currentItem()` even when one node is focused.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Prefer `serve-review.mjs` inside `.specify/review/scripts/` | It is self-contained in generated projects and matches the existing Node validator runtime. |
| Keep real HTTP 200 self-checks | The user explicitly requires network verification of renderer and review data before receiving a URL. |
| Run the server in the foreground | The invoking model can keep the terminal session alive; signal handling is clearer and avoids stale PID/lock files. |
| Print a stable `SPECCOMPASS_REVIEW_URL=` readiness line | Templates and agents need a deterministic value to relay without reconstructing the URL. |
| Reject non-loopback/file protocols in renderer code | Command prose alone cannot enforce the review transport. |
| Keep `localhost` and `::1` outside the renderer allowlist | The launcher emits exactly `127.0.0.1`; a strict host contract is simpler to verify. |
| Define current view as the whole current flow/UI item | Node focus controls display only and must not silently reduce the bulk-save scope. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Initial repository-wide search output was truncated | Narrow subsequent reads to launcher/install boundaries and review contract sections. |
| First Gemini call returned `INVALID_STREAM` | Retried with supplied architecture facts and no repository tools; received a complete review. |
| First Claude call waited on denied Bash tool requests | Aborted after repeated no-output waits and retried with `--tools '' --safe-mode`; received a complete review. |

## Resources
-
