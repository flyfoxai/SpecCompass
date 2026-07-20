# Codex 独立分析

## 判断

当前主要缺陷是信息架构：`question_groups -> questions -> candidates` 让问题成为首页，用户无法先理解项目全局。现有 ledger、来源标签、Discovery 非授权边界和 Formal Confirmation 身份绑定本身合理，应在其上增加稳定的 Outline 拓扑，不应推倒重建。

## 推荐边界

1. `outline_maturity` 继续表示整份 Outline 的成熟度，绝不复用为节点层级。
2. 总图与分图只是同一份 Outline 的确定性投影，共享一个 review-data identity；不能各自产生互相独立的正式授权。
3. Discovery 问题显式引用 `outline_node_id`；响应继续携带 question/candidate/target/delta ID，并新增节点引用作为上下文校验。
4. 横切议题作为 `global_constraint` 节点存在，携带 `affected_node_ids`。一个决策事件记录一次，业务节点只显示引用徽标，不复制事实。
5. 三级必须在只读导图中完成整份 Outline 的正式确认。可以分页或分图浏览，但下载的确认包仍绑定同一个 Outline Digest、Source Authority IDs 和完整 review-data identity。
6. 布局信息分两类：节点父子关系、分图归属和横切影响属于语义合同；缩放、坐标、折叠和最近打开分图属于本地界面状态，不进入 digest。

## 推荐最小字段

- `maps[]`: `map_id`、`title`、`root_node_id`、`parent_map_id?`、`map_kind: overview | branch | global_constraints`。
- `outline_nodes[]`: `node_id`、`parent_node_id?`、`map_id`、`node_kind`、`label`、`source_status`、`affected_node_ids?`。
- Discovery question: `outline_node_id`；全局议题可引用 `global_constraint` 节点。
- Response/ledger event: `outline_node_id`，由 consumer 校验其与当前 question/target 的绑定。

节点坐标、颜色、缩放、折叠状态不进入 schema 和 digest。
