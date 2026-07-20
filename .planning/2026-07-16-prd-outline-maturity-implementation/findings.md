# Findings

## Step 2 baseline

- The existing launcher accepts only `--flow`, `--ui`, and `--outline` and maps
  formal Outline reviews to `prd/review/outline-review-data.json`.
- Formal Outline confirmation is already schema-v2 and digest-bound; discovery
  therefore needs its own query parameter, data path, renderer, and response
  package rather than branching inside `confirmation-package.js`.
- The current validator is a deterministic JavaScript validator shared by
  Flow, UI, and formal Outline. Discovery validation can be added there, but
  must dispatch by a distinct `review_type` and reject package-type crossover.
- Existing renderer tests use Node `vm` programs, so discovery transport and
  operation constraints can be tested without introducing a second JS test
  framework.
- Step 2 must preserve all pre-existing uncommitted Flow/UI and formal Outline
  changes on `codex/review-priority-outline`.

## Step 2 browser findings

- The real desktop renderer loaded non-empty Discovery content and continuously
  displayed the non-authorization boundary and `/sp.prd` return route.
- Candidate confirmation plus a second question using “none of the above” and
  direct input produced a schema-valid response. The candidate delta used
  `source_tag: user-confirmed`; the direct-input delta used `source_tag: user`;
  the package kept `authorization_effect: none` and `next_route: /sp.prd`.
- The only browser console error was an absent favicon and does not affect the
  review workflow.
- `feature-nav.js` does not recognize `?outline-discovery=<feature>` and shows
  the misleading “unrecognized current requirement” state. Add a regression
  test and teach navigation to use the distinct Discovery mode/query key.

## Step 2 hardening decisions

- Discovery is single-choice in Step 2. The response model stores one
  `candidate_id`, so advertising `selection_mode: multiple` would create a
  contract the renderer and package cannot preserve.
- Package construction must reject an empty response list and contradictory
  operation fields before download. Schema validation remains a second gate,
  not the first place an API/schema mismatch is discovered.
- Operation normalization is fail-closed: candidate confirmation carries one
  candidate and no direct-input fields; add/context notes carry user text and
  no candidate/target; replace requires a target plus user text; exclude
  requires exactly one candidate or target and cannot also claim
  `none_of_the_above`.
- A Discovery draft is unexported when any non-empty response exists and its
  latest edit time is newer than the latest successful download. This includes
  partial direct input and other in-progress answers that do not yet form a
  schema-valid response. Both feature navigation and `beforeunload` must consult
  this state.
- Browser acceptance must mirror the CLI's critical Discovery checks: safe
  artifact path, required project/source structure, unique group/question/
  candidate ids, exactly 2-4 candidates, valid recommendations, single-choice
  mode, and all five operations.
- The review index must track `has_outline_discovery` independently from
  `has_outline_review`; navigation for `?outline-discovery=` consults only the
  Discovery flag and never infers readiness from formal Outline review data.

## Step 3 baseline

- Writeback has two deliberate durability boundaries. Validate the named
  response, current Discovery source, existing ledger, candidate/target
  identities, and operation shape before mutating anything. Then append valid
  events to the ledger before validating model-generated temporary documents.
  A temporary-document failure leaves formal PRD/Outline unchanged and the
  event pending, so the same response can retry without rewriting history.
- A pending event is inferred when it exists in the ledger but its
  `intent-delta` anchor is absent from the formal PRD. Once that anchor is in
  the formal PRD, the event is consumed and replay is rejected.
- Formal PRD and Outline are replaced as a pair. Rollback is allowed only while
  that pair replacement is incomplete. Backup cleanup after both replacements
  is best-effort: cleanup failure emits a warning and must not roll back or
  remove either newly committed document.
- Model-owned semantic rewriting and helper-owned mechanical validation remain
  separate. The helper can prove IDs, operation shape, provenance tags, delta
  anchors, target-section placement, supersession ordering, and file identity;
  it must not claim natural-language equivalence.
- Existing dirty-worktree changes include the prior Flow/UI priority and formal
  Outline work. Step 3 edits must stay scoped to the PRD writeback helper,
  contracts, and focused tests without normalizing unrelated files.
- Consumption is not substring presence. A ledger event is accepted for replay
  and supersession purposes only when its `intent-delta` anchor occurs exactly
  once in the current formal PRD. Zero anchors means pending; duplicate anchors
  mean malformed formal state. Both cases fail closed for `supersedes_delta_id`.
- The existing diagnostic phrase "earlier accepted event" is part of focused
  test coverage. Keep it for compatibility, but qualify it as consumed by the
  current formal PRD so operators do not confuse ledger append durability with
  formal acceptance.

## Step 3 lock-review decisions

- Stale-lock recovery must never move a mismatched recovery claim back into
  place with an overwriting rename. A newer claimant's ownership must be
  preserved even when the old claimant resumes during cleanup.
- The recovery claim serializes stale-main-lock adjudication; it is not itself
  automatically recoverable while an old main lock remains. If a dead process
  left both locks, automatic takeover cannot distinguish abandonment from a
  paused recovery owner safely, so the helper fails closed and requires a
  narrow operator action.
- Operator recovery removes only the stale recovery claim after verifying that
  no writeback is active. The main lock remains as evidence and is re-evaluated
  by the normal identity-checked recovery path on retry.
- When the main lock is absent, an orphan recovery claim may be cleaned only
  after the process owns a newly created main lock. This ordering prevents an
  orphan cleanup attempt from racing an active writeback owner.

## Step 4 review decisions

- Formal critical nodes require both `critical_basis` and `priority_reason` in
  the Flow, UI, and Outline JSON schemas. Browser-only enforcement was not a
  sufficient contract because CLI and third-party producers also emit data.
- Outline digest inputs retain the established compatibility contract: an
  optional `sha256:` prefix and uppercase or lowercase hex are accepted. A
  confirmation package emits one canonical representation: lowercase 64-hex
  without a prefix. This matches the Bash and PowerShell gate normalization.
- Outline Discovery and formal Outline confirmation intentionally have
  different identity boundaries. Discovery binds a response to its named
  source artifact and remains `authorization_effect: none`; it must not acquire
  or imply the formal authorization fingerprint. At `specify_ready`, the
  separately compiled formal artifact binds `review_data_id`, digest, and
  source authorities.
- Review priority filters are transient page controls. Previous/next feature
  navigation loads another review artifact by full page navigation, so a reset
  to `all` is expected and avoids carrying a filter into unrelated content.
- Schema tests must identify conditional branches by their `if` semantics,
  never by an `allOf` array index. Independent conditions may be inserted in
  any order without changing the JSON Schema contract.
- Final verification evidence is `321 passed, 22 skipped` for the focused
  four-file suite and `1920 passed, 54 skipped` for the full repository suite.
