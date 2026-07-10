# SpecCompass Review Renderer

This renderer directory / renderer 目录 contains the multi-file fixed
infrastructure for SpecCompass flow and UI review pages:
`speccompass-review-renderer.html` is only the entry page, while
`styles/*.css` and `scripts/*.js` are shared page infrastructure. Normal
`/sp.flow` and `/sp.ui` runs must not edit the renderer. Normal `/sp.flow` and
`/sp.ui` commands still only fill structured review data and validate it before
presenting the review page.

Contract sentence for template checks: normal `/sp.flow` and `/sp.ui` commands still only fill structured review data / 普通 `/sp.flow`、`/sp.ui` 只填结构化数据.

The fixed renderer is shared by both flow review and UI review.
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
- Review index path: `specs/review-index.json`
- Renderer directory: `.specify/review/renderer/`
- Renderer path: `.specify/review/renderer/speccompass-review-renderer.html`
- Flow review Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>`
- UI review Web entry:
  `.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>`
- Validator: `.specify/review/scripts/validate-review-data.mjs`
- Schemas: `.specify/review/schemas/flow-review-data.schema.json` and
  `.specify/review/schemas/ui-review-data.schema.json`

The renderer may load `window.SPECCOMPASS_REVIEW_DATA`, a selected local JSON
file input / 本地 JSON 文件, or a colocated `flow-review-data.json` /
`ui-review-data.json` file when the browser permits it. `window.SPECCOMPASS_REVIEW_DATA`
is useful for server previews or generated wrapper pages; local files are useful
for static review from `file://`; colocated JSON is a convenience only and must
not be treated as a persistence guarantee.

The primary reviewer-facing entry uses short URL parameters / 短参数. Opening
`speccompass-review-renderer.html?flow=<feature>` auto-loads
`specs/<feature>/flows/review/flow-review-data.json`; opening
`speccompass-review-renderer.html?ui=<feature>` auto-loads
`specs/<feature>/ui/review/ui-review-data.json`. The renderer resolves these
locations with browser URL paths and `new URL(..., window.location.href)`, not
operating-system file separators, so the same contract applies on macOS,
Windows, and Linux. The feature parameter must be a simple feature directory
name only: letters, numbers, dot, underscore, and dash are allowed; path
separators and `..` are rejected. When no short parameter is present, the page
must show a visible fallback / 兜底 prompt and keep the manual load buttons.
If `file://` browser restrictions block JSON fetch, use a local server preview
or the manual JSON file selector.

The fixed renderer also reads `specs/review-index.json` for demand-level
navigation / 需求级导航. The top navigation text is `上一需求 / 需求 X/Y / 下一需求`;
it follows the feature order recorded in `features[].order` and the feature slug
in `features[].feature`. This is different from the current feature's business
module navigation, which must be labeled `上一业务模块 / 业务模块 X/Y / 下一业务模块`.
Each index entry uses `has_flow_review` and `has_ui_review` so the renderer can
disable a target and mark it `待生成` when the selected review type has not been
generated. Do not invent future slugs in the index: if only
`001-phase-one-core-loop` exists, the index contains only that feature and the
page shows `需求 1/1` with previous/next disabled.

Minimum `specs/review-index.json` shape:

```json
{
  "schema_version": 1,
  "project": "<project-name>",
  "updated_at": "YYYY-MM-DD",
  "features": [
    {
      "order": 1,
      "feature": "<feature-slug>",
      "title": "<human title>",
      "has_flow_review": true,
      "has_ui_review": false
    }
  ]
}
```

Normal `/sp.flow` and `/sp.ui` runs create or update this index when they create
review data. They preserve existing real feature entries, keep their order, add
only the current real feature when missing, and update only the relevant
`has_flow_review` or `has_ui_review` flag plus `updated_at`.

Browser `localStorage` is only a draft convenience for review selections. It is
scoped by review type, artifact path, batch id, source snapshot, and the current
module/item/node structure so a later review-data version does not silently reuse
an older local draft. It is not authorization. Authorization is the downloaded
confirmation package, or fallback copied summary, after it has been written into
`flow-confirmation.md` or `ui-confirmation.md` and tracked with the project.

The renderer may also store display-only layout preferences in `localStorage`,
for example `speccompass-review:right-rail-width` for the draggable right
confirmation rail. This preference only changes the local page width. It is not
authorization, must not enter the confirmation package, and must not be mixed
with review draft state. The right rail uses a slightly larger reading size than
the rest of the page so long decision options remain legible on lower-resolution
screens.

The primary export path is 下载确认包 / download confirmation package. The
renderer writes a JSON package with `format:
speccompass-confirmation-package`; the older copy-summary / 复制摘要 control is
only a fallback when downloads or file handoff are unavailable. The confirmation
package always includes `target_path`, which must point to
`specs/<feature>/flows/review/flow-confirmation.md` for flow review or
`specs/<feature>/ui/review/ui-confirmation.md` for UI review. Other repository
paths are rejected even when they are repo-relative. A model that receives the
package should write the contained decisions and `revision_requests` to that
`target_path` without needing extra instructions.

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

When an export creates multiple parts, the renderer may attempt browser
downloads for each file, but it must also leave visible 多包下载链接 / manual
part download links in the right rail. Browsers can block repeated automatic
downloads, so the link list is the stable fallback: reviewers should download
each `part_index` file in order and hand all parts to the model together.
Changing any local choice clears the old link list so stale packages are not
mistaken for current authorization.

DRAFT records and records in `draft_excluded_items` are non-authorization
records. Confirmation packages include `has_unauthorized_drafts`,
`unauthorized_draft_count`, and a `draft_rule` instruction so a later model
does not write local draft choices as approved decisions.

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
  review_type: flow | ui
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
middle UI preview is rendered from `screens[].screen_layout`,
`screen_regions`, and `components`; optional `states` add screen-state notes.
`nodes` are only the right-rail
decision and authorization checkpoints. A UI screen that only contains review
nodes is invalid because it gives the reviewer no visible screen to inspect.
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
needs download-package writeback before it becomes external authorization; and
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

Download-package, copy-summary fallback, and navigation safety are mandatory.
If any DRAFT node exists, the first 下载确认包 click must warn near the export
button, change the button to `仍要下载确认包`, and return without rebuilding the
right rail, losing the current input, redrawing the diagram, or calling a
whole-page render. A second explicit click may download, but the package must
keep DRAFT nodes only in `draft_excluded_items` and include a top-level warning.
The same rule applies to the fallback copy-summary / 复制摘要 action: the first
copy-summary click changes the button to `仍要复制摘要`, and a second explicit
click may copy only if the copied summary keeps DRAFT nodes excluded. Copy
success must be checked; if the browser clipboard call fails, the page must not
claim the summary was copied and must not mark the current choices as exported.
The page must also warn on 离开页面 / beforeunload or navigation/close when
drafts are excluded or locally saved choices have not yet been downloaded or
copied for writeback.

The right confirmation rail must show the authorization path as three distinct
steps: 本地选择 / local browser choice, 下载确认包 / download confirmation
package, and 写回确认文档 / write back to `flow-confirmation.md` or
`ui-confirmation.md`. The fallback 复制摘要 / copy confirmation summary must be
visibly labeled as a fallback, not the primary authorization path. This prevents
browser state or a successful button click from being mistaken for
repository-tracked authorization.

The red 待处理必审 counter is must-confirm only. Recommended nodes are not
included in the red must-confirm pending count / 建议确认不计入红色待处理必审, so
the renderer shows recommended pending work separately when it exists.

批量按推荐确认不能覆盖 / bulk recommended-option must not overwrite existing
saved choices, submitted non-recommended choices, or draft choices waiting for a
note. 全部选择推荐 scans all modules and all flow/UI items in the loaded review
data. 当前视图剩余项选推荐 acts on the selected node when one is focused;
otherwise it acts on the current flow/UI item / 只保存当前可见流程或节点. Both
actions fill only `MISSING` decision nodes whose `recommended_option` matches an
actual option in that node. Before
saving, ask how many unfinished items remain in that scope and whether to save
the eligible items with recommendations / 批量按推荐保存前提示当前范围未完成数量.
Batch feedback must say how many nodes were saved and how many saved or draft
choices were skipped and preserved / 跳过并保留已有选择或草稿.

Before confirmation-package download, the renderer scans all decision nodes. If
`MISSING` nodes remain, it asks whether to fill eligible nodes with
recommendations. Cancelling the prompt must not mutate browser state or start a
download. After confirmation, nodes without a valid recommendation remain
unresolved and block the download until they are handled manually. If browser
persistence fails, selection mutations must be rolled back and the renderer
must show the storage error instead of claiming that choices were saved. The existing draft
warning still runs after this preflight: the first click warns without rebuilding
the rail when drafts exist, and only a second explicit click may download a
package that excludes drafts from authorization.

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
