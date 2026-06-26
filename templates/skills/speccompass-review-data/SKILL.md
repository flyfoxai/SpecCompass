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
- Flow data: `specs/<feature>/flows/review/flow-review-data.json`
- UI data: `specs/<feature>/ui/review/ui-review-data.json`
- Flow schema: `.specify/review/schemas/flow-review-data.schema.json`
- UI schema: `.specify/review/schemas/ui-review-data.schema.json`
- Validator: `.specify/review/scripts/validate-review-data.mjs`

If validation fails, do not finish the command and do not promote readiness.
Fix model-fixable data issues first. If the remaining gap requires human
information, mark the item blocked with a short reason and owner route.

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
- Each human-judgment node must have 2-4 executable options.
- Each `node.id` must be globally unique within the whole review data file, not
  only inside one diagram or screen. Prefer IDs that include module and item
  context, such as `survey-publish-DEC1`, because the fixed renderer scopes
  browser draft state by review data version and then stores node state by
  `node.id`.
- Every option uses `OPTION_A`, `OPTION_B`, `OPTION_C`, or `OPTION_D`.
- Every human-judgment node must set `recommended_option`.
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
- `decision_recorded_items` is only for nodes/items with a saved
  `OPTION_A`, `OPTION_C`, or `OPTION_D` decision record.
- Nodes/items with `OPTION_B` go to `needs_decision_items`, not
  `decision_recorded_items` and not `confirmed_items`.

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
`when_to_choose` (do not invent a separate `background` field), provide 2-4
executable choices, state each choice's consequence, project impact, and
`next_exit`, and set `recommended_option` with a short reason in the option
copy. A non-technical reviewer should understand what they are choosing and what
downstream work that choice unlocks or blocks.

## Validation

Run the validator before closing:

```bash
node .specify/review/scripts/validate-review-data.mjs specs/<feature>/flows/review/flow-review-data.json
node .specify/review/scripts/validate-review-data.mjs specs/<feature>/ui/review/ui-review-data.json
```

校验失败不能收尾，不能提升 readiness. The JSON must pass before the review
data can support `WAITING_FOR_BATCH_REVIEW`, `READY_FOR_UI`, or
`READY_FOR_PLAN` transitions.

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
                  "label": "按当前发布规则继续",
                  "when_to_choose": "PRD 已经说明发布前检查项。",
                  "consequence": "后续流程按当前发布门槛继续设计。",
                  "project_impact": "后续 UI 和任务可以按当前规则推进。",
                  "next_exit": "continue",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补充发布规则",
                  "when_to_choose": "发布前检查项还缺关键业务条件。",
                  "consequence": "发布相关流程先停在待补充决策状态。",
                  "project_impact": "发布相关 UI 和实现暂不推进。",
                  "next_exit": "needs-decision:product-owner"
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
