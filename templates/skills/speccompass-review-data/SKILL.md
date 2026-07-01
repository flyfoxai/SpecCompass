---
name: speccompass-review-data
description: Use when generating or repairing SpecCompass flow/UI structured review data JSON for /sp.flow or /sp.ui confirmation pages.
compatibility: Requires spec-kit project structure with .specify/review schemas and validator
metadata:
  author: github-spec-kit
  source: core_pack:skills/speccompass-review-data/SKILL.md
---

# speccompass-review-data

Use this skill when `/sp.flow` or `/sp.ui` needs a confirmation page. The agent
must fill structured review data and let the fixed renderer display it. The
renderer directory / renderer 目录 is multi-file fixed infrastructure / 多文件固定基础设施;
ordinary commands only supply JSON data.

## Core Rule

普通 `/sp.flow`、`/sp.ui` 只填数据 / fill only structured review data. They
must not edit the renderer, must not edit the renderer directory
`.specify/review/renderer/`, must not edit page CSS/JS, and must not write
HTML/CSS/JS for the confirmation surface. 不要编写 HTML/CSS/JS for normal flow
or UI confirmation runs.

- Renderer directory: `.specify/review/renderer/`
- Fixed renderer entry: `.specify/review/renderer/speccompass-review-renderer.html`
- Flow review Web entry: `.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>`
- UI review Web entry: `.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>`
- Flow data: `specs/<feature>/flows/review/flow-review-data.json`
- UI data: `specs/<feature>/ui/review/ui-review-data.json`
- Flow schema: `.specify/review/schemas/flow-review-data.schema.json`
- UI schema: `.specify/review/schemas/ui-review-data.schema.json`
- Validator: `.specify/review/scripts/validate-review-data.mjs`

example data must not replace generation rules / 实验数据不能替代生成规则.
`docs/examples/review/*`, experiment JSON files, and preview-only HTML pages are
few-shot references or visual smoke-test fixtures only. They are not a valid
substitute for repairing `/sp.flow`, `/sp.ui`, this skill, or the validator. A
normal run must generate or repair the target feature's
`flow-review-data.json` or `ui-review-data.json` from that feature's current
PRD/spec/flow/UI evidence, then run `validate-review-data.mjs`. Do not claim the
SP mechanism is fixed just because an example file was hand-edited.

When reporting the review result to a user, present the Web review entry above
as the primary page. The renderer uses short URL parameters / 短参数 to resolve
the data file with browser URL paths, so it works the same on macOS, Windows,
and Linux when served from the project root. Do not ask the user to open
`flow-review-batch.md` or `ui-review-batch.md` as the primary review entry;
those Markdown files are fallback / 兜底 text records only. If the renderer is
opened without `?flow=<feature>` or `?ui=<feature>`, it should show a visible
fallback prompt and the manual load buttons.

If validation fails, do not finish the command and do not promote readiness.
Fix model-fixable data issues first. If the remaining gap requires human
information, mark the item blocked with a short reason and owner route.

review data 是待审内容 / review data is draft review content. The renderer is not
an editor / 不是编辑器 and does not directly edit flow or UI design /
不直接修改 flow 或 UI 设计. It only helps reviewers accept a recommended option or
submit a structured natural-language revision / 自然语言修改意见. Browser
localStorage is a temporary draft only. Authorization and requested changes live
in the confirmation document / 确认文档: `flow-confirmation.md` for flow and
`ui-confirmation.md` for UI.

The reviewer-facing export path is 下载确认包 / download confirmation package.
The fixed renderer, not ordinary `/sp.flow` or `/sp.ui`, creates JSON packages
with `format: "speccompass-confirmation-package"` and a `target_path` pointing
to `specs/<feature>/flows/review/flow-confirmation.md` or
`specs/<feature>/ui/review/ui-confirmation.md`; other repository paths are not
valid writeback targets. 复制摘要 / copy summary is only a fallback when download
handoff is unavailable. Ordinary commands must still only fill
`flow-review-data.json` or `ui-review-data.json`; do not add custom package
scripts or page export logic to generated review data.

If one confirmation package would exceed `100000` UTF-8 bytes, the fixed
renderer automatically splits it into self-contained parts. The split must keep
complete records intact where possible and must repeat `review_type`,
`package_session_id`, `batch_id`, `review_data_id`, `source_review_data`,
`target_path`, `part_index`, `part_count`, `total_record_count`,
`part_record_count`, `continuation_from`, `continuation_to`,
`package_instruction`, and the relevant `module_context`.
This repeated `module_context` is mandatory: a later model must be able to read
any part by itself and still know which module each choice belongs to. Each
record must also repeat `module_id` and `module_title`, so a record stays
self-describing even if it was split away from its original module header. When
writing back multi-part packages, collect all files first, verify the count
equals `part_count`, verify all parts share the same `package_session_id`, verify
all parts repeat the same `total_record_count`, and verify the sum of
`part_record_count` equals `total_record_count`; then merge records in
`part_index` order and write one coherent `target_path` update. Never overwrite
the confirmation document with only one part. `continuation_from` and
`continuation_to` are boundary anchors only; they do not mean a record was split.
Records marked `DRAFT`,
`draft_excluded_items`, `EXCLUDED_DRAFT`, or `is_authorized_decision: false` are
not authorized decisions; keep them as follow-up context only.

When a reviewer chooses a non-recommended option, the confirmation package must
export `revision_requests` (the copied summary does this only as a fallback).
The next `/sp.flow` or `/sp.ui` run reads those requests, applies them to
`flow-review-data.json` or `ui-review-data.json`, and regenerates the
confirmation page. Do not ask reviewers to directly add/delete flow nodes or UI
elements inside the page; they provide structured change type plus
plain-language instructions for the model to execute next.

Flow `change_type` values: `ADD_NODE`, `DELETE_NODE`, `MODIFY_NODE`,
`MODIFY_BRANCH`, `ADD_EXCEPTION_PATH`, `SPLIT_SUBFLOW`, `MERGE_SIMPLIFY`,
`ADD_ENTRY_EXIT`, `OTHER`.

UI `change_type` values: `ADD_SCREEN`, `DELETE_SCREEN`,
`MODIFY_SCREEN_STRUCTURE`, `ADD_REGION`, `MODIFY_REGION_LAYOUT`,
`ADD_COMPONENT`, `DELETE_COMPONENT`, `MODIFY_FIELD_ACTION_COPY`, `ADD_STATE`,
`MODIFY_INTERACTION`, `ADD_PERMISSION_DISPLAY`, `OTHER`.

Each `revision_requests` item must preserve at least `target_ref`,
`target_label`, `review_type`, `change_type`, `selected_option`,
`reviewer_note`, `expected_model_action`, and `next_exit`. The model must treat
`reviewer_note` as the human's natural-language revision request and reason
against the current PRD/spec/flow/UI sources before changing data.

## Data Writing Rules

- 说人话. Write for product managers and business reviewers first.
- Do not expose field-table labels such as 对象类型, 判断点, 来源, 主流程图,
  关联业务, 为什么存在, 需要判断什么, 不需要管什么, or Top Level Baseline.
- Do not put HTML, CSS, JavaScript, SVG, class names, event handlers, or page
  layout instructions in any review data field, including `schema_notes` and
  `trace_notes`. Notes are plain text only.
- Do not describe renderer layout, animation, popup implementation, CSS
  placement, or click handlers in review data. 动态效果用纯文本标注 / use plain
  text markers for future behavior, for example `此处数字未来会自动更新`.
- Business nodes use business language. `system_arch` nodes may use system
  language, but must say 无需产品确认 and route to the system/architecture owner.
- If one real-world step has both a product/business decision and a
  system/architecture support concern, split it into two review nodes: one
  business node for the product manager's decision and one `system_arch` node
  for the technical owner. Do not hide a business decision inside a
  `system_arch` node, and do not ask the product manager to authorize technical
  implementation details.
- Human-judgment option count is tiered:
  - `must_confirm` nodes must have `3-4` executable options.
  - ordinary human-judgment nodes default to 3 options.
  - low-risk binary choices may use 2 options only when
    `options_count_rationale` explains why 2 exits are enough.
- Each `node.id` must be globally unique within the whole review data file, not
  only inside one diagram or screen. Prefer IDs that include module and item
  context, such as `survey-publish-DEC1`, because the fixed renderer scopes
  browser draft state by review data version and then stores node state by
  `node.id`.
- Every option uses `OPTION_A`, `OPTION_B`, `OPTION_C`, or `OPTION_D`.
- Every human-judgment node must set `recommended_option`.
- Every option must provide an actionable exit / 可执行出口 through
  `next_exit`; do not use vague labels such as approve, defer, reject, or block
  as the option outcome.
- Decision option copy must be decision-grade, not boilerplate. Each option must
  include the real business background or real screen/interaction background in
  `when_to_choose`, what happens after selection in `consequence`, downstream project impact
  in `project_impact`, and why this option is recommended when it
  is the `recommended_option`. The renderer shows the same content as three
  reviewer-facing rows: `适合什么情况` from `when_to_choose`,
  `选了以后怎么做` from `consequence`, and `对项目有什么影响` from
  `project_impact`. The reader should understand what the model will change
  next and how the choice affects scope, schedule, risk, UI/flow, plan, tasks,
  implementation, acceptance tests, or delivery. Do not write generic labels
  such as 推荐方案 / 方案A / 确认当前内容, and do not repeat stock phrases /
  模板句 such as 当前依据和风险边界看起来正确.
- Every decision option must say 谁继续处理 after the choice: next model,
  product owner, designer, developer, tester, operations, system owner, or the
  responsible business team. It must also say the cost of 不选推荐 when that cost
  matters, for example more manual review, delayed release, weaker guardrails,
  extra UI work, or later rework. Options inside one node must have 真实差异:
  different scope, route, owner, risk, release timing, or manual cost. Do not
  create four labels that only rephrase 保留 / 补充 / 调整 / 后续完善.
- Clarify-style option checks are mandatory for the common non-recommended
  exits: needs-decision 选项必须说清缺什么、谁拍板、哪些下游工作暂停; split-flow 选项必须说清拆成哪些子流程, short review artifacts, or concrete flow files;
  推荐项必须说明为什么比更慢、更重或更保守的替代方案更适合. If an option cannot
  answer these checks with source-backed facts, rewrite the option or reduce the
  option count with `options_count_rationale` instead of padding.
- Preserve facts before making copy smoother / 先保真再说人话. Do not rewrite,
  translate, shorten, or naturalize `node.id`, `change_type`, `next_exit`
  route markers, file paths, `source_ref` anchors, schema field names, enum
  values, trace IDs, component IDs, or source labels. Keep those exact tokens
  stable and explain their business meaning in nearby human-facing copy when
  needed.
- Do not invent facts just to make 3-4 options look complete / 不要为了凑选项编
  事实. Every option must be traceable to PRD/spec/flow/UI sources,
  clarification records, or a clearly marked model inference. If the sources do
  not support another real executable exit, use the allowed lower option count
  and write `options_count_rationale`; do not create fake risks, fake owners,
  fake screens, fake states, fake permissions, or fake downstream work.
- Use real subjects and real actions / 真主语真动作. Each option must name who
  continues and what they will actually change, check, split, delay, release, or
  write back. Prefer concrete action plus consequence over polished summaries:
  a reviewer should see the decision, the next executor, and the project cost
  without decoding technical or template language.
- Pick one decision template before writing options:
  - 范围决策: decide how much flow/UI work enters this batch, which scenarios
    move later, and how scope affects schedule, manual cost, and rework risk.
  - 门禁决策: decide whether to release, block, request missing material, or
    route to human review, and explain who judges plus the cost of false pass
    or false block.
  - 降级决策: decide the fallback when the full capability is unavailable, and
    explain the user experience, operational cost, release timing, and risk
    boundary.
- Any reviewer-facing 技术词 must be replaced with business wording or followed
  immediately by a Chinese explanation / 中文说明. Acceptable example:
  `网关配置(Gateway Profile，用来决定发布前由哪组规则拦截风险)`. Unacceptable:
  `保留 Gateway Profile 风控路径` without explanation.
- `OPTION_B` is reserved for needs-decision / 补充决策 and must not route to a
  confirmed path.
- `OPTION_B.next_exit` must start with the literal route marker
  `needs-decision` (for example `needs-decision:product-owner`) because the
  validator checks that exact route prefix.
- Every option requires: `when_to_choose` (the background / 背景 for when this
  option should be chosen), `consequence` (required),
  `project_impact` (required), and `next_exit` (required).
- System/architecture nodes must use `review_layer: "system_arch"` and
  `review_level: "system_arch"`, route to 系统负责人 or 架构负责人, and say
  无需产品确认 in `plain_summary` or `action_prompt`.
- `confirmed_items` is only for flow/screen/file-level labels that are authorized
  without a node-level option choice.
- `decision_recorded_items` is only for saved node decisions whose `next_exit`
  is a concrete continuation route and does not start with `needs-decision`.
- Nodes/items whose saved option has a `needs-decision` exit go to
  `needs_decision_items`, not `decision_recorded_items` and not
  `confirmed_items`.

## Review Size

- 5-7 review nodes is the normal target for one flow diagram.
- 8+ nodes must trigger a split warning and should become overview plus subflow.
- 10+ nodes cannot enter confirmation unless the data includes a specific
  `complex_flow_exception` or `low_risk_linear_exception`.
- Do not merge real business steps just to satisfy the budget. Split into
  subflows when a step changes state, role, permission, user-visible result,
  external dependency, recovery path, side effect, or acceptance evidence.

## UI Review Data Is Not Flow Review Data / UI 审核数据不是 flow 审核数据

UI review data has its own screen contract. Do not copy flow `nodes` and
`edges` into a UI file and call it a screen. A UI item under `screens` must
describe what the reviewer sees:

- `screen_layout`: the screen layout / 屏幕布局 such as `form`, `dashboard`,
  `list_detail`, `wizard`, or `modal`.
- `screen_regions`: visible screen regions, each with `position`, `purpose`,
  and `components`.
- `components`: visible UI elements such as buttons, inputs, tables, cards,
  navigation, badges, empty states, and plain text markers.
- `states`: default, empty, loading, error, success, permission, or
  `dynamic_marker` notes. A dynamic marker is a plain text marker; write
  `future_behavior_note` such as `此处数字未来会自动更新` instead of animation or
  popup implementation instructions.

The UI `nodes` array is still present, but it is only the right-rail decision
and authorization model. It must not be used as the middle-screen drawing model.
Use `decision_node_id`, `action_ref`, `field_ref`, or `state_ref` on components
when a visible UI element maps to a decision node. If a screen has no visible
regions/components/states, validation fails because the reviewer cannot inspect
the UI.

决策选项需要深度推理 / decision options require deeper reasoning. For every UI
decision node, explain the background in human language with the JSON field
`when_to_choose` (do not invent a separate `background` field), apply the same
tiered option-count rule (`must_confirm` has `3-4`; ordinary human-judgment
nodes default to 3; low-risk binary choices need `options_count_rationale`),
state each choice's consequence, project impact, and `next_exit`, and set
`recommended_option` with a short reason in the option copy. A non-technical
reviewer should understand what they are choosing and what downstream work that
choice unlocks or blocks. UI choices focus on screen layout, visible regions,
component wording, states, permissions, operation efficiency, and mis-click
risk; flow choices focus on business route, branch exits, exception paths,
state changes, authorization boundaries, and whether later UI/plan/tasks are
unlocked. Both must still answer `适合什么情况`, `选了以后怎么做`, and
`对项目有什么影响`.

## Validation

Run the validator before closing:

```bash
node .specify/review/scripts/validate-review-data.mjs specs/<feature>/flows/review/flow-review-data.json
node .specify/review/scripts/validate-review-data.mjs specs/<feature>/ui/review/ui-review-data.json
```

校验失败不能收尾，不能提升 readiness. The JSON must pass before the review
data can support `WAITING_FOR_BATCH_REVIEW`, `READY_FOR_UI`, or
`READY_FOR_PLAN` transitions.

The validator intentionally blocks lazy option writing: duplicate option copy,
模板句 / boilerplate, unexplained 技术词, vague approve/defer/reject/block exits,
missing `when_to_choose`, missing `consequence`, missing `project_impact`,
missing 谁继续处理, missing why-this-must-be-decided-now copy on `must_confirm`
nodes, repeated `project_impact` copy, or a missing actionable `next_exit` must
be fixed in the review data before closing.

## Minimal complete JSON / 最小完整 JSON

Use this shape first, then add modules, diagrams/screens, nodes, and options as
needed. Do not add HTML, CSS, or JavaScript.

```json
{
  "schema_version": 1,
  "review_type": "flow",
  "artifact_path": "specs/example/flows/review/flow-review-data.json",
  "confirm_strategy": "batch",
  "batch_id": "FLOW-BATCH-001",
  "project": {
    "name": "Example",
    "feature": "survey-publish",
    "business_overview": "运营人员确认问卷从编辑到发布前需要人工判断的业务规则。"
  },
  "source_snapshot": [
    {
      "path": "specs/example/spec.md",
      "anchors": ["问卷发布"],
      "semantic_scope": ["requirements", "flow"]
    }
  ],
  "modules": [
    {
      "id": "survey",
      "title": "问卷管理",
      "summary": "运营人员在这里检查问卷内容，并决定是否进入发布。",
      "diagrams": [
        {
          "id": "publish-main",
          "title": "问卷发布判断",
          "summary": "这张图只看发布前是否满足业务放行条件。",
          "source_path": "specs/example/flows/publish-main.mmd",
          "item_type": "flowchart",
          "nodes": [
            {
              "id": "DEC1",
              "label": "确认问卷是否可以发布",
              "plain_summary": "请判断当前问卷是否已经具备发布条件。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "specs/example/spec.md#问卷发布",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "按问卷发布检查继续",
                  "when_to_choose": "问卷标题、目标人群、截止时间和发布前校验已在 PRD 中说明，产品经理认可这些作为发布门槛。",
                  "consequence": "下一轮会把这些检查写进发布前流程、UI 校验和任务拆分，不再重新询问发布门槛。",
                  "project_impact": "可以解锁问卷发布页面、实现任务和验收测试；风险集中在后续发现遗漏检查项时需要局部补充。",
                  "next_exit": "continue",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补齐发布门槛再设计",
                  "when_to_choose": "发布前到底要检查哪些问卷信息还没有定，继续设计会让开发按猜测实现。",
                  "consequence": "该节点下游的发布页面、流程分支和开发任务先暂停，等待产品经理补充门槛。",
                  "project_impact": "会延后问卷发布相关 UI、计划和实现，但能避免后续返工或错误放行。",
                  "next_exit": "needs-decision:product-owner"
                },
                {
                  "id": "OPTION_C",
                  "label": "局部补充检查项后继续",
                  "when_to_choose": "主发布路径已经明确，只剩一个边界条件需要补上，例如截止时间是否必填。",
                  "consequence": "下一轮只调整当前节点的检查项，不推翻问卷发布主流程。",
                  "project_impact": "影响集中在当前流程或界面的校验文案和测试用例，整体排期变化较小。",
                  "next_exit": "revise-local-and-continue"
                }
              ],
              "recommended_option": "OPTION_A"
            },
            {
              "id": "FLOW1",
              "label": "进入发布准备",
              "plain_summary": "系统进入发布准备，等待后续界面展示发布结果。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "无需产品确认",
              "node_kind": "flow",
              "source_ref": "specs/example/spec.md#问卷发布"
            },
            {
              "id": "SYS1",
              "label": "记录发布证据",
              "plain_summary": "这一步由系统负责人确认证据留存方式，无需产品确认。",
              "action_prompt": "请系统负责人确认发布证据能支撑后续追溯，无需产品确认。",
              "review_layer": "system_arch",
              "review_level": "system_arch",
              "owner": "系统负责人",
              "node_kind": "system",
              "source_ref": "specs/example/spec.md#问卷发布"
            }
          ],
          "edges": [
            { "from": "DEC1", "to": "FLOW1" }
          ]
        }
      ]
    }
  ]
}
```

For UI review data, keep the same top-level shape, set `"review_type": "ui"`,
write `artifact_path` to `specs/<feature>/ui/review/ui-review-data.json`, and
replace each module's `diagrams` array with `screens`.
