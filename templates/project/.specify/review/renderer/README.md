# SpecCompass Review Renderer

This renderer directory / renderer 目录 contains the multi-file fixed
infrastructure for SpecCompass flow, UI, and PRD Outline review pages:
`speccompass-review-renderer.html` is only the entry page, while
`styles/*.css` and `scripts/*.js` are shared page infrastructure. Normal
`/sp.flow`, `/sp.ui`, and `/sp.prd` runs must not edit the renderer. Normal
commands still only fill the matching structured review data and validate it
before presenting the review page.

Contract sentence for template checks: normal `/sp.flow` and `/sp.ui` commands still only fill structured review data / 普通 `/sp.flow`、`/sp.ui` 只填结构化数据.

The fixed renderer is shared by Flow, UI, and Outline review. Outline is a
stage inside `/sp.prd`, not a separate required command and not a replacement
for `/sp.specify`.
For flow review, this fixed renderer is not Mermaid-based: it reads structured
JSON nodes and edges and draws a native SVG/DAG flow diagram. Mermaid, PlantUML,
or Graphviz files may still exist as project flow source or external preview
artifacts, but normal `/sp.flow` and `/sp.ui` runs must not replace this fixed
renderer with a Mermaid page.

## DO NOT EDIT in normal /sp.flow or /sp.ui runs

This renderer is fixed shared infrastructure for both flow and UI review, and
it is multi-file fixed infrastructure, not a generated one-off HTML artifact.
Normal `/sp.flow` and `/sp.ui` commands must not edit this file, page CSS,
page JavaScript, or renderer interaction state. They still only fill
`flow-review-data.json` or `ui-review-data.json` and validate that data
instead. Renderer changes require a separate implementation task with tests.

## Prohibited in /sp.flow and /sp.ui runs

- Do not edit `.specify/review/renderer/speccompass-review-renderer.html`.
- Do not add or modify CSS classes, styles, or layout rules.
- Do not add or modify JavaScript functions, event handlers, or state logic.
- Do not change the interaction state machine
  `MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED`.
- Do not modify copy-summary, navigation-safety, localStorage, diagram redraw,
  or two-way selection behavior.
- Only write `flow-review-data.json` or `ui-review-data.json`.
- Review data values are plain data. Do not place HTML, CSS, JavaScript, SVG,
  CSS classes, event handlers, or layout instructions in any value, including
  free-text note arrays such as `schema_notes` and `trace_notes`.
- No complex animation / 不使用复杂动画 in the review surface. If a future
  product UI has dynamic behavior that cannot be implemented safely in the
  review renderer, express it as plain text markers / 纯文本标注 such as
  `此处数字未来会自动更新`.
- The shared renderer may use a minimal native `<dialog>` only for explanation
  or preview / 只用于说明或预览. The dialog must be built with safe DOM text
  APIs, not `innerHTML`. It must not carry recommendation choices, non-recommended
  choices, review notes, authorization confirmation, copy-summary actions, or
  global notifications / 不得承载推荐/非推荐选择、审核意见、授权确认、复制摘要或全局通知.
- Prioritize position, size, click choices, right rail, persistence, and summary
  stability over animation, decorative transitions, or complex popups.
- Only run `validate-review-data.mjs` to validate routine generated data.

## Contract

- Flow data path: `specs/<feature>/flows/review/flow-review-data.json`
- UI data path: `specs/<feature>/ui/review/ui-review-data.json`
- Outline data path: `specs/<feature>/prd/review/outline-review-data.json`
- Outline discovery data path:
  `specs/<feature>/prd/review/outline-discovery-data.json`
- Outline discovery pending response (restricted local writeback, consumed by
  the next `/sp.prd` run):
  `specs/<feature>/prd/review/outline-discovery-response-pending.json`
- Outline discovery response download fallback:
  `outline-discovery-response-*.json`
- Outline intent ledger path:
  `specs/<feature>/prd/review/outline-intent-ledger.json`
- Outline source path: `specs/<feature>/spec-outline.md`
- Authoritative boundary path: `specs/<root-feature>/outline-boundaries.json`
- Review index path: `specs/review-index.json`
- Renderer directory: `.specify/review/renderer/`
- Renderer path: `.specify/review/renderer/speccompass-review-renderer.html`
- Flow review Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>`
- UI review Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>`
- Outline review Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?outline=<feature>`
- Outline discovery Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?outline-discovery=<feature>`
- Validator: `.specify/review/scripts/validate-review-data.mjs`
- Schemas: `.specify/review/schemas/flow-review-data.schema.json`,
  `.specify/review/schemas/ui-review-data.schema.json`, and
  `.specify/review/schemas/outline-review-data.schema.json`, plus the separate
  Outline discovery data, response, and intent-ledger schemas.

The installed review package also distributes the authoritative Outline
transition schemas and mechanical helpers: proposal start, owner lease, impact
inventory, fixed state advance, activation, and pre-commit rollback. They are
command-side controls only. The renderer and loopback writer never invoke them,
never change `outline-boundaries.json`, and never interpret a review click as
transition approval. `scan-outline-transition-impact.mjs` lists and hashes
artifacts without inferring successors; `rollback-outline-transition.mjs`
requires an empty live-write proof and never deletes working-tree content.

Outline has two explicit modes. Level 1 `outline_maturity: explore` and Level 2
`outline_maturity: frame` use `interaction_mode: discovery`; Level 3
`outline_maturity: specify_ready` uses `interaction_mode: confirmation`.
Discovery shows 2-4 candidates, a recommendation and reason, none of the above,
free-form input, and the operations `confirm_candidate`, `add`, `replace`,
`exclude`, and `context_note`. Its primary action is `写入项目`; after success,
the surface directs the reviewer to rerun `/sp.prd` and continuously says that
the writeback does not authorize `/sp.specify`.

Discovery and confirmation share the fixed visual shell, but not their schemas,
packages, or state machines. A discovery package must not accept or emit
`speccompass-confirmation-package`, and the confirmation package logic must not
accept `outline-discovery-response`. Browser discovery state, mechanical local
writeback, and response downloads are non-authoritative; only `/sp.prd` may
interpret and validate the response, append `outline-intent-ledger.json`, and
write provenance anchors. Accepted new
text uses `[src:user]`, accepted candidates use `[src:user-confirmed]`,
unaccepted candidates stay `[src:ai-proposed]`, and consumed events use
`<!-- intent-delta:<id> -->`.
Existing entries that can be replaced or excluded use
`<!-- intent-target:<id> -->`; the generated delta block records its exact
reference as `<!-- intent-ref:<delta-id>:<target-or-candidate-id> -->`. After
`/sp.prd` regenerates both temporary documents, it runs
`node .specify/review/scripts/apply-outline-discovery.mjs --response <response-package> --prd-temp specs/<feature>/prd.md.tmp --outline-temp specs/<feature>/spec-outline.md.tmp`.
Valid events are appended before temporary-document validation. A failure keeps
the formal documents unchanged and leaves those events pending, so the same
response can be retried without duplicating the ledger. Keep the pending file
in place on failure; only after helper success and provenance-anchor validation
may `/sp.prd` atomically move it into `prd/review/history/consumed/`.
The helper serializes writeback for each feature with
`specs/<feature>/prd/review/.outline-discovery-writeback.lock`. If an active
process owns the lock, wait for it to finish before retrying. If the recorded
owner is no longer running, the helper first acquires the exclusive
`.outline-discovery-writeback.recovery.lock` claim and rechecks the main lock
identity before recovering it. Unique ownership IDs ensure cleanup preserves a
lock that has changed owners. If a dead process left both locks, the helper
fails closed and preserves them until an operator verifies no writeback is
running and removes only the recovery claim. When the old main lock is already
absent, the helper removes an orphaned recovery claim only after acquiring a
fresh main lock.

Interactive review must start from the project root with the self-contained
launcher. Use exactly one matching command and keep it running:

```bash
node .specify/review/scripts/serve-review.mjs --flow <feature>
node .specify/review/scripts/serve-review.mjs --ui <feature>
node .specify/review/scripts/serve-review.mjs --outline <feature>
node .specify/review/scripts/serve-review.mjs --outline-discovery <feature>
```

The launcher binds to `127.0.0.1` by default. For a trusted private network,
the operator may explicitly pass `--host` with the machine's RFC1918 IPv4
address, such as `10.0.0.209`, `172.16.0.20`, or `192.168.1.20`; public
addresses, hostnames, and `0.0.0.0` are rejected. It chooses an available port
unless an explicit port is supplied, and emits `SPECCOMPASS_REVIEW_URL=` only
after the renderer 和 review data 均返回 HTTP 200. The agent must return that
exact emitted URL and must not guess a port. 交互复核禁止使用 `file://`，并且
`localhost` 不接受; HTTPS, `::1`, and other hostnames are also unsupported.
When `--host` exposes the page to a LAN, the launcher prints a warning; stop it
after review because reachable devices may read the current review and submit
the current session. Static HTTP access is limited to the fixed renderer,
same-type structured review data used by feature navigation, and
`specs/review-index.json`; unrelated project
files are not served. On any unsupported origin, the renderer rejects inline
data and disables writeback and fallback controls. There is no manual JSON selector
or colocated-file load button: a manually selected artifact can
disagree with the launcher's bound feature, review type, capability token, and
target identity. Loading is exclusively derived from the launcher's short URL.

The primary reviewer-facing entry uses short URL parameters / 短参数. Opening
`speccompass-review-renderer.html?flow=<feature>` auto-loads
`specs/<feature>/flows/review/flow-review-data.json`; opening
`speccompass-review-renderer.html?ui=<feature>` auto-loads
`specs/<feature>/ui/review/ui-review-data.json`; opening
`speccompass-review-renderer.html?outline=<feature>` auto-loads
`specs/<feature>/prd/review/outline-review-data.json`; opening
`speccompass-review-renderer.html?outline-discovery=<feature>` auto-loads
`specs/<feature>/prd/review/outline-discovery-data.json`. The renderer resolves these
locations with browser URL paths and `new URL(..., window.location.href)`, not
operating-system file separators, so the same contract applies on macOS,
Windows, and Linux. The feature parameter must be a simple feature directory
name only: letters, numbers, dot, underscore, and dash are allowed; path
separators and `..` are rejected. When the short parameter is missing or the
bound artifact cannot be loaded, the page fails closed and directs the user to
rerun the owning command and open its newly emitted URL.

New projects receive the launcher and renderer through `specify init`. Projects
that were already initialized do not receive new templates automatically.
Existing projects refresh this fixed `.specify/review/` infrastructure with
`specify init --force`; review data, discovery responses, intent ledgers, and
confirmation documents under `specs/` remain project-owned artifacts and are
outside that fixed directory.

The fixed renderer also reads schema-v2 `specs/review-index.json` for
demand-level navigation / 需求级导航. `feature_code` is the immutable global code;
`order` is the mutable global navigation order; `sibling_order` is only the
local order under one explicit `parent_feature`. None of those fields substitutes
for another, and a numeric prefix never implies parentage. When a real `000-*`
feature exists it is the explicit root. A `001-*` feature becomes its first child
only when `parent_feature` points to that root, `sibling_order` is `1`, and
`boundary_source` points to a confirmed `Subproject Handoff`.

`boundary_source` records the SP-authorized delivery boundary. Analytical
Outline nodes use independent stable IDs and never create feature entries. Once
a project-boundary node is confirmed, it shares one immutable `feature_code`
with exactly one active feature. A stable baseline requires
`outline_alignment: one_to_one`; `merged`, `split`, `diverged`, and `not_mapped`
are legacy-migration or approved structure-change transition states only and
must block ordinary downstream development. Flow/UI modules are still local
responsibility and business-chain decompositions inside the confirmed feature
boundary, so analytical node count and titles do not dictate module layout.

Repository-wide allocation history lives in `specs/feature-code-ledger.json`.
`manage-feature-codes.mjs` reserves sequential codes only when a final boundary
candidate is ready for human review. Reserved, active, retired, and void codes
are never reused. Transition start verifies every new boundary reservation;
activation reconciles it to active/retired, and pre-commit rollback makes unused
reservations void. This ledger does not replace `outline-boundaries.json` as the
authority for current project boundaries.

The top navigation text remains `上一需求 / 需求 X/Y / 下一需求`, but explicit
hierarchies also display the code path such as `000 › 001`. This is different
from current-feature business module navigation, which remains
`上一业务模块 / 业务模块 X/Y / 下一业务模块`. Formal Outline confirmation and Outline
Discovery use separate availability flags. The renderer reads schema v1 only as
a legacy flat index and visibly warns that it cannot express inheritance.

Minimum `specs/review-index.json` shape:

```json
{
  "schema_version": 2,
  "project": "<project-name>",
  "updated_at": "YYYY-MM-DD",
  "hierarchy": {
    "mode": "explicit",
    "root_feature": "000-product-root"
  },
  "features": [
    {
      "order": 1,
      "feature_code": "000",
      "feature": "000-product-root",
      "title": "<root title>",
      "parent_feature": null,
      "sibling_order": 0,
      "boundary_source": {
        "kind": "root",
        "handoff_ref": null,
        "rationale": "Project-level product root."
      },
      "outline_alignment": {
        "status": "one_to_one",
        "outline_node_refs": ["specs/000-product-root/spec-outline.md#boundary-000"],
        "rationale": "The confirmed root boundary and active root feature share code 000."
      },
      "has_flow_review": true,
      "has_ui_review": false,
      "has_outline_review": true,
      "has_outline_discovery": false
    }
  ]
}
```

`specs/<root-feature>/outline-boundaries.json` is the sole writable source for
project-boundary identity, title, code, order, parentage, lifecycle, and Outline
mapping. The renderer never writes it. `specs/review-index.json` derives those
fields one way and directly owns only `updated_at` plus the four review
availability flags. Normal `/sp.flow`, `/sp.ui`, and `/sp.prd` runs first require
an `ALIGNED` result from `check-outline-boundary-gate.mjs`. After changing only
the owned availability flag they run `sync-review-index.mjs`, which rebuilds all
derived fields while preserving all four flags, followed by
`validate-review-index.mjs` and the gate's `--check` path. The legacy
`migrate-review-index.mjs` creates a backup and a non-authoritative projection;
it never establishes project parentage or Outline authority. A PRD discovery run sets
`has_outline_discovery`; a formal Outline confirmation run sets
`has_outline_review`. Neither operation clears or derives the other flag.

Browser `localStorage` is only a draft convenience for review selections. It is
scoped by review type, artifact path, batch id, source snapshot, and the current
module/item/node structure so a later review-data version does not silently reuse
an older local draft. It is not authorization. The restricted loopback writer
mechanically records the current decisions and notes in `flow-confirmation.md`,
`ui-confirmation.md`, or `outline-confirmation.md`; it does not call a model or
regenerate artifacts. Downloaded packages and copied summaries are fallbacks
only when that local writeback fails.

Schema-v1 data remains readable. Because schema-v2 identity covers the complete
review contract, a v1 page first checks the new complete-identity storage key and
then falls back to the exact pre-v2 `localStorage` key when the new key is absent.
The next successful save writes the restored draft under the new key. This is a
draft migration only; neither key is authorization evidence.

The renderer may also store display-only layout preferences in `localStorage`,
for example `speccompass-review:right-rail-width` for the draggable right
confirmation rail and `speccompass-review:display-theme` for the explicit light
or dark appearance. The theme follows the operating-system preference until the
reviewer chooses a mode, then keeps that local choice in the browser. These
preferences only change the local page presentation. They are not authorization,
must not enter a confirmation or discovery response package, and must not be
mixed with review draft state. The right rail uses a slightly larger reading
size than the rest of the page so long decision options remain legible on
lower-resolution screens.

The primary action is 写入项目 / write to project. The launcher provides a
loopback-only endpoint with a random per-process capability token. On each
request it re-reads the current review data, verifies the complete
`review_data_id` and source identity, derives the target from the served review
type and feature, and rejects client-selected repository paths. It then
atomically writes the fixed Flow, UI, Outline, or Discovery target. This writer
is a mechanical recorder: it does not call a model, interpret reviewer notes,
or change PRD/Flow/UI artifacts. After success, the page shows the exact target
and directs the reviewer to rerun the owning `/sp.flow`, `/sp.ui`, or `/sp.prd`
command so the model can process revision requests.

The launcher requires Node.js 18 or newer. The browser allows only one active
write per page, assigns a stable request ID, applies bounded timeouts, and
retries only failures marked `retryable`. The writer serializes each target
across browser requests and launcher processes, verifies the target SHA-256
version while holding the target lock, records completed request IDs for
idempotent replay, fsyncs the temporary file, and uses atomic replacement with
bounded retries for Windows `EPERM`, `EACCES`, and `EBUSY` conditions. A target
changed after page load, stale review identity, reused request ID with different
content, forbidden request, or invalid package fails closed and returns
`allow_fallback: false`; the page tells the reviewer to reload or repair the
data and does not expose download/copy controls. Network/timeouts and temporary
filesystem failures may return `allow_fallback: true`; oversized or unavailable
storage writes may permit fallback without automatic retry. In every fallback
case the primary button remains `重试写入`, while download is a separate visible
link. Changing a choice invalidates that link and its stable request payload.

The renderer still builds JSON packages with `format:
speccompass-confirmation-package` for the local writer payload and explicit
download fallback. The package `target_path` must be the fixed target for the
served review type; other repository paths are rejected. Outline parts repeat
the canonical `outline_digest` plus ordered `source_authority_ids`. Show package
download only after local writeback fails with `allow_fallback: true`, and keep
copy-summary / 复制摘要 as the last fallback when download or file handoff is
unavailable.

Confirmation packages must stay small enough for model handoff. If the package
would exceed `100000` UTF-8 bytes, the renderer must split it into multiple
self-contained JSON files instead of hard-cutting text. Every part repeats
`package_session_id`, `review_type`, `batch_id`, `review_data_id`,
`source_review_data`, `target_path`, `part_index`, `part_count`,
`total_record_count`, `part_record_count`, `continuation_from`,
`continuation_to`, `package_instruction`, and the relevant `module_context`.
`module_context` must travel with every module segment so a record split away
from the original module header still says which module it belongs to. Each
record must also repeat `module_id` and `module_title` so a single record remains
self-describing if it is handed to a model out of context. Process multi-part
exports only after all files are collected and the collected file count equals
`part_count`, all files share the same `package_session_id`, every part repeats
the same `total_record_count`, and the sum of `part_record_count` equals
`total_record_count`; then merge them in `part_index` order and write one
coherent `target_path` update. Never treat a single part as the complete
confirmation document or overwrite the target file with only that part.
Each package's `package_instruction.merge_verification` must repeat the same
formula in machine-readable prose: collect exactly `part_count` files with the
same `package_session_id`, `review_type`, `batch_id`, `review_data_id`,
`source_review_data`, and `target_path`; verify all parts repeat the same
`total_record_count`; and verify `sum(part_record_count) == total_record_count`
before writing. If any part is missing, duplicated, from another package
session, or fails the formula, stop and ask for the correct package set instead
of writing `target_path`.
`continuation_from` and `continuation_to` are boundary anchors / 边界锚点 only,
not proof that a record was cut in half, and must not replace `module_context`
or `target_path`.

When a fallback export creates multiple parts, the renderer may attempt browser
downloads for each file, but it must also leave visible 多包下载链接 / manual
part download links in the right rail. Browsers can block repeated automatic
downloads, so the link list remains the fallback: reviewers should provide each
`part_index` file in order when local writeback is unavailable.
Changing any local choice clears the old link list so stale packages are not
mistaken for current authorization.

DRAFT records and records in `draft_excluded_items` are non-authorization
records. Confirmation packages include `has_unauthorized_drafts`,
`unauthorized_draft_count`, and a `draft_rule` instruction so a later model
does not write local draft choices as approved decisions.

For Outline, browser state, local writeback by itself, and the downloaded package
remain non-authoritative.
Only a complete Markdown confirmation whose digest, source authority IDs, and
review-data identity match the current Outline may promote
`AWAITING_OUTLINE_CONFIRMATION` to `READY_FOR_SPECIFY`. Missing, incomplete,
stale, or identity-mismatched confirmation blocks `/sp.specify`.
Compute the identity from the complete review JSON with
`.specify/review/scripts/review-data-id.mjs`; the browser uses the same
recursively key-sorted serialization and identifier algorithm. The downstream
gate recomputes this value, so changing any review field invalidates the old
confirmation instead of allowing its declared ID to be reused.

review data 是待审内容 / review data is draft review content. The review page is
not an editor / 不是编辑器 and does not directly edit flow or UI design /
不直接修改 flow 或 UI 设计. Reviewers either accept the recommended option or submit
a structured natural-language revision / 自然语言修改意见. Submitted
non-recommended choices are exported as `revision_requests` in the confirmation
document / 确认文档, then the next `/sp.flow` or `/sp.ui` run applies those
requests to the structured review data and regenerates the page.

`revision_requests` entries use this minimum shape:

```yaml
- target_ref: <module:item:node>
  target_label: <visible module / flow-or-screen / node label>
  review_type: flow | ui | outline
  change_type: <FlowChangeType | UiChangeType>
  selected_option: OPTION_A | OPTION_B | OPTION_C | OPTION_D
  reviewer_note: <natural-language revision request>
  expected_model_action: <what the next model run should revise>
  next_exit: <owner route or next stage>
```

Flow change types: `ADD_NODE`, `DELETE_NODE`, `MODIFY_NODE`,
`MODIFY_BRANCH`, `ADD_EXCEPTION_PATH`, `SPLIT_SUBFLOW`, `MERGE_SIMPLIFY`,
`ADD_ENTRY_EXIT`, `OTHER`.

UI change types: `ADD_SCREEN`, `DELETE_SCREEN`, `MODIFY_SCREEN_STRUCTURE`,
`ADD_REGION`, `MODIFY_REGION_LAYOUT`, `ADD_COMPONENT`, `DELETE_COMPONENT`,
`MODIFY_FIELD_ACTION_COPY`, `ADD_STATE`, `MODIFY_INTERACTION`,
`ADD_PERMISSION_DISPLAY`, `OTHER`.

Outline change types: `REVISE_INTENT`, `REVISE_USERS`,
`REVISE_PROBLEM_SLICE`, `REVISE_CAPABILITY_BOUNDARY`, `REVISE_SCOPE`,
`REVISE_NON_GOAL`, `REVISE_SCENARIO_COVERAGE`, `REVISE_FIRST_SLICE`,
`REVISE_SOURCE_AUTHORITY`, `REVISE_READINESS`, `OTHER`.

New Flow/UI/Outline schema-v2 actionable nodes use
`confirmation_priority: critical | important | normal`, displayed as
`非常重要 | 重要 | 普通`. Priority is independent from `review_level`.
Informational nodes omit it. Critical is scarce: for `N` actionable nodes its
upper bound is `N == 0 ? 0 : min(3, max(1, ceil(N / 10)))`; zero is valid, and
each critical node must prove severe impact plus no safe reversible or default
route. Critical nodes always require individual confirmation and are excluded
from every bulk recommendation scope.

Every `node.id` must be globally unique inside one review data file because the
renderer scopes browser draft state to one review data version and then keys the
node state by `node.id`. Do not reuse local labels such as `DEC1` across
multiple diagrams or screens; use a module/item prefix such as
`survey-publish-DEC1`.

The renderer also runs a lightweight startup validation for hand-edited JSON.
Duplicate or missing `node.id` values are blocking errors because they can make
browser draft state attach to the wrong checkpoint. Invalid option counts,
missing recommended options, or unavailable `localStorage` are shown as visible
warnings. This runtime validation is a guardrail only; routine commands must still run `validate-review-data.mjs`.

UI review data is not flow review data / UI 审核数据不是 flow 审核数据. The
middle UI preview first explains each screen with `business_context`,
`primary_users`, `entry_scenarios`, `user_goal`, and `user_outcome`, then renders
the product shape from `screen_layout`, `screen_regions`, and `components`;
optional `states` add screen-state notes. `flow_refs` are collapsed evidence
citations only and are explicitly labeled as not being product UI content.
Generic copy such as `用于展示相关信息`, an object inventory such as
`该屏展示命令、订单和成交`, or layout wording such as `列表加详情` does not
satisfy the screen context contract.
`nodes` are only the right-rail
decision and authorization checkpoints. A UI screen that only contains review
nodes is invalid because it gives the reviewer no visible screen to inspect.
Flow roles, triggers, states, exceptions, permissions, and outcomes may support
UI decisions, but Flow node IDs, edges, branches, Mermaid diagrams, and stage
progress must not become visible product UI unless workflow monitoring is an
explicit product requirement.
Use component references such as `decision_node_id`, `action_ref`, `field_ref`,
or `state_ref` to connect a visible UI element to a right-rail checkpoint. For
dynamic behavior, use a dynamic marker / 动态标注 with plain text markers such as
`此处数字未来会自动更新`; do not add animation or popup logic to review data.
Decision options require deeper reasoning / 决策选项需要深度推理: every human
decision node must explain the real business or screen background in
`decision_background` and summarize the actual decision in `decision_summary`.
Each option must explain `benefit` / 收益 and `cost` / 代价 in plain language;
the recommended option must also include `recommendation_reason` / 推荐理由.
`consequence` and `next_exit` remain required execution fields for writeback and
routing. Legacy `when_to_choose` and `project_impact` may be read only for old
data compatibility; new flow/UI review data must not use them as the primary
copy model.

When a real-world step has both product/business meaning and a
system/architecture support concern, the review data should split it into two
nodes. The business node explains the decision a product reviewer owns; the
`system_arch` node routes the support concern to the system or architecture owner
and says it does not require product confirmation. This keeps review
responsibility clear in the shared renderer.

## Design

The review surface follows `huashu-design`: Tiffany Blue `#0ABAB5`, a quiet
work-focused layout, a narrow right confirmation rail, compact node cards, and
human-readable business copy. The right rail records recommended choices,
non-recommended choices with reviewer notes, unresolved decisions, and the
writeback target.

## Interaction Contract

推荐选项点击即保存 / recommended-option click saves immediately. When a reviewer
clicks the current `recommended_option`, the renderer records the selected
`OPTION_*` in browser state, shows immediate visible feedback / 即时可见反馈
such as `正在保存推荐选择` then `已按推荐保存，可重新选择`, exposes that feedback
through `aria-live`, and shows `重新选择` / reselect so accidental clicks can be
repaired. The save path must re-check that the clicked option still matches the
computed recommendation; otherwise it must fall back to the non-recommended
draft path.

非推荐选项 / non-recommended option clicks do not save authorization immediately.
They create a visible draft state, open and focus the right-rail 审核意见 /
review note input, and require a nearby `提交选择` / submit choice action before
the selection is saved. Empty notes must show `请先填写审核意见` or an equivalent
inline error under the input / textarea, not only in a toast or page-level area.

The visible node state machine is `MISSING | DRAFT | SAVED_RECOMMENDED | SAVED_SUBMITTED`:
`MISSING` means no option is selected; `DRAFT` means a non-recommended option
is waiting for a human note and submit action;
`SAVED_RECOMMENDED` means the recommended option is locally saved and still
needs confirmation-document writeback before it becomes external authorization;
and
`SAVED_SUBMITTED` means a non-recommended option was submitted with a note.
重新选择清空正式选择和草稿，回到未选择 / reselect clears saved selection and draft
back to `MISSING`.

DRAFT nodes must be listed only in `draft_excluded_items`. The exported schema
field is `draft_excluded_items:`. 草稿不能进入 `decision_records` / draft choices
must not enter `decision_records`, cannot count as confirmed, cannot promote
readiness, and 草稿不具备授权意义 / draft choices do not authorize.

Writeback classification is fixed:
- nodes in DRAFT state are non-recommended choices selected locally but not
  submitted with a review note, and go only to `draft_excluded_items`.
- nodes whose saved option's `next_exit` starts with `needs-decision` go to
  `needs_decision_items`; this is the explicit needs-decision exit route and
  it must not be counted as an authorized continuation.
- nodes with a saved option whose `next_exit` is concrete and does not start
  with `needs-decision` go to `decision_recorded_items`.
- nodes with no selected option, or no exit path, become ordinary unresolved /
  普通未处理决策 in `unresolved_decision_items`.

Draft nodes are excluded separately so exported authorization cannot confuse a
local draft with a real decision.

Write-to-project, download fallback, copy-summary fallback, and navigation
safety are mandatory. If any DRAFT node exists, the first 写入项目 click must
warn near the action button, change the button to `仍要写入项目`, and return
without rebuilding the
right rail, losing the current input, redrawing the diagram, or calling a
whole-page render. A second explicit click may write, but the payload must
keep DRAFT nodes only in `draft_excluded_items` and include a top-level warning.
Apply the same exclusion rule to fallback download; downloading must not turn a
draft into authorization. The same rule applies to the fallback copy-summary /
复制摘要 action: the first
copy-summary click changes the button to `仍要复制摘要`, and a second explicit
click may copy only if the copied summary keeps DRAFT nodes excluded. Copy
success must be checked; if the browser clipboard call fails, the page must not
claim the summary was copied and must not mark the current choices as exported.
The page must also warn on 离开页面 / beforeunload or navigation/close when
drafts are excluded or locally saved choices have not yet been written to the
project or exported through a fallback.

The right confirmation rail must show the path as three distinct steps: 本地选择
/ local browser choice, 写入项目 / mechanically record the confirmation document,
and 回到 Codex 重跑所属命令 / rerun the owning command so the model handles
revision requests. Download confirmation package and 复制摘要 / copy confirmation
summary must be visibly labeled as failure fallbacks. This prevents browser
state or mechanical writeback from being mistaken for model-generated revision
or downstream authorization.

The red 待处理必审 counter is must-confirm only. Recommended nodes are not
included in the red must-confirm pending count / 建议确认不计入红色待处理必审, so
the renderer shows recommended pending work separately when it exists.

批量按推荐确认不能覆盖 / bulk recommended-option must not overwrite existing
saved choices, submitted non-recommended choices, or draft choices waiting for a
note. `当前视图按推荐保存` always covers every node in the current flow/UI item,
even when one node is focused. `当前模块按推荐保存` covers every flow/UI item in the
current business module. `当前需求按推荐保存` covers every module and item in the
currently loaded feature requirement; it does not cross into other entries in
`specs/review-index.json`. All three actions fill only `MISSING` decision nodes
whose `recommended_option` matches an actual option in that node. Before saving,
ask how many unfinished items remain in that scope and whether to save the
eligible items with recommendations / 批量按推荐保存前提示当前范围未完成数量. Batch
feedback must say how many nodes were saved and how many saved or draft choices
were skipped and preserved / 跳过并保留已有选择或草稿.

Before write-to-project or fallback confirmation-package download, the renderer
scans all decision nodes. If
`MISSING` nodes remain, it asks whether to fill eligible nodes with
recommendations. Cancelling the prompt must not mutate browser state or start a
write or download. After confirmation, nodes without a valid recommendation
remain unresolved and block writeback until they are handled manually. If browser
persistence fails, selection mutations must be rolled back and the renderer
must show the storage error instead of claiming that choices were saved. The existing draft
warning still runs after this preflight: the first click warns without rebuilding
the rail when drafts exist, and only a second explicit click may write or export
a payload that excludes drafts from authorization.

Reset controls clear only the current view's browser local state back to MISSING and do not delete authorization already
written to `flow-confirmation.md` or `ui-confirmation.md`.

Node-level option actions should update the current card, selected-node facts,
and diagram highlight locally. They should not trigger a full diagram redraw or
whole-page render. Module counters and batch summaries may refresh after the
local card feedback is visible.

The renderer owns the diagram/card two-way selection linkage and accessibility
state. Selectable node cards use `role="button"`, `tabindex="0"`, and keyboard
activation with Enter/Space. Selected choices and active nodes must expose
stable visual states and synchronized `aria-pressed` values. These are renderer
implementation requirements; normal `/sp.flow` and `/sp.ui` commands only
provide stable IDs and structured review data for the renderer to consume.

## Change Rule

Renderer changes must be handled as a separate implementation task with tests.
Routine flow/UI generation should only change JSON review data. If validation
fails, the command must not finish and must not promote readiness.
