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
- Renderer directory: `.specify/review/renderer/`
- Renderer path: `.specify/review/renderer/speccompass-review-renderer.html`
- Validator: `.specify/review/scripts/validate-review-data.mjs`
- Schemas: `.specify/review/schemas/flow-review-data.schema.json` and
  `.specify/review/schemas/ui-review-data.schema.json`

The renderer may load `window.SPECCOMPASS_REVIEW_DATA`, a selected local JSON
file input / 本地 JSON 文件, or a colocated `flow-review-data.json` /
`ui-review-data.json` file when the browser permits it. `window.SPECCOMPASS_REVIEW_DATA`
is useful for server previews or generated wrapper pages; local files are useful
for static review from `file://`; colocated JSON is a convenience only and must
not be treated as a persistence guarantee.

Browser `localStorage` is only a draft convenience for review selections. It is
scoped by review type, artifact path, batch id, source snapshot, and the current
module/item/node structure so a later review-data version does not silently reuse
an older local draft. It is not authorization. Authorization is the copied or
written confirmation summary in `flow-confirmation.md` or `ui-confirmation.md`
and must be tracked with the project.

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
decision node should explain the choice background in `when_to_choose` (do not
invent a separate `background` field), each option's consequence, project
impact, next exit, and recommendation reason in plain language.

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
needs copied-summary writeback before it becomes external authorization; and
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
- nodes with saved `selected_option: OPTION_B` go to `needs_decision_items`.
- nodes with no selected option, or no exit path, become ordinary unresolved /
  普通未处理决策 in `unresolved_decision_items`.

Draft nodes are excluded separately so exported authorization cannot confuse a
local draft with a real decision.

Copy-summary and navigation safety are mandatory. If any DRAFT node exists, the
first copy-summary click must warn near the copy button, change the button to
`仍要复制摘要`, and return without rebuilding the right rail, losing the current
input, redrawing the diagram, or calling a whole-page render. A second explicit
click may copy, but the copied summary must keep DRAFT nodes only in
`draft_excluded_items` and include a top-level warning. Copy success must be
checked; if the browser clipboard call fails, the page must not claim the
summary was copied and must not mark the current choices as exported. The page
must also warn on 离开页面 / beforeunload or navigation/close when drafts are
excluded or locally saved choices have not yet been copied for writeback.

The right confirmation rail must show the authorization path as three distinct
steps: 本地选择 / local browser choice, 复制摘要 / copy confirmation summary, and
写回确认文档 / write back to `flow-confirmation.md` or `ui-confirmation.md`.
This prevents browser state or a successful button click from being mistaken
for repository-tracked authorization.

批量按推荐确认不能覆盖 / bulk recommended-option must not overwrite existing
saved choices, submitted non-recommended choices, or draft choices waiting for a
note. Batch feedback must say how many nodes were saved and how many saved or
draft choices were skipped / 跳过. Reset controls clear only the current view's browser local state back to MISSING and do not delete authorization already
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
