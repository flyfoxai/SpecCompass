# JSON Forms 选型与落地

## 1. 结论

当前这个“业务澄清层”里，涉及配置页、表单页、业务后台页时，默认选型定为 `JSON Forms`。

原因很直接：

- 它是开源免费的
- 它用 `JSON Schema + UI Schema` 表达，适合大模型稳定生成
- 它不是静态图，而是真实可渲染的 DOM
- 它更适合当前这个 `Codex 配置管理` 方向
- 后续可以直接进入校验、截图、自动化验证，而不是停留在线框图阶段

## 2. 为什么当前固定使用 `JSON Forms`

在当前场景里，`JSON Forms` 合适，原因是：

- 它把“数据约束”和“界面布局”拆得更清楚
- `Categorization`、`Group`、`VerticalLayout` 这类布局更贴近配置页
- 对“左侧分类 + 右侧详情”的表达更直接
- 更适合把业务规则先固化成结构，再交给后续实现

因此当前结论不是“优先使用”，而是“固定使用”。

## 3. 它适合当前项目的什么部分

它最适合承载这几类页面：

- 配置项总览页
- 配置详情页
- 扫描目录设置页
- 项目纳入集中管理设置页
- 规则校验结果页

它尤其适合当前需求中的这些点：

- 每个配置项要展示名称、当前值、说明、是否写入 TOML
- 一部分配置是枚举值，适合下拉或单选
- 一部分配置允许自由输入
- 一部分配置是必选项，需要固定写入
- 一部分配置支持全局/非全局，并且非全局时要指定项目
- 界面需要按分类组织，而不是无限向下滚动

## 4. 建议的数据分层

这里说的不是项目顶层分层，而是 `JSON Forms` 相关产物内部固定拆成四层。

### 4.1 业务说明层

放在 `Markdown` 中：

- 页面目标
- 页面角色
- 核心动作
- 保存规则
- 异常提示

### 4.2 数据约束层

放在 `JSON Schema` 中：

- 字段类型
- 必填项
- 枚举值
- 默认值
- 描述说明
- 条件依赖

### 4.3 界面布局层

放在 `UI Schema` 中：

- 分类
- 分组
- 字段顺序
- 控件类型
- 条件显示
- 布局结构

### 4.4 示例数据层

放在 `data.json` 中：

- 当前配置值
- 已发现的项目
- 当前扫描目录
- 某项是否已经写入 TOML

这样分层后，大模型每一步都更容易被约束。

## 5. 推荐的落地结构

如果某个业务需求准备进入“可验证表单原型”阶段，建议在业务产物包里补这一层：

```text
feature-name/
├── 01-business-summary.md
├── 02-actors-and-objects.md
├── 03-rules-and-decisions.md
├── 04-flows/
│   ├── main-flow.mmd
│   ├── sequence.mmd
│   └── state.mmd
├── 05-screens/
│   ├── screen-map.md
│   ├── screen-01-overview.md
│   └── screen-02-detail.md
├── 06-jsonforms/
│   ├── schema.json
│   ├── uischema.json
│   ├── data.example.json
│   └── validation-cases.md
└── 07-mcp/
    ├── resource-index.md
    ├── prompt-catalog.md
    └── tool-catalog.md
```

## 6. 当前推荐的界面组织方式

对于当前 `Codex 配置管理`，建议使用左侧窄分类栏，对应三类：

1. `搜索目录设置`
2. `具体设置项`
3. `其他设置`

然后每个配置项尽量采用紧凑行展示：

```text
savePasswordSetting    true    已写入
储存数据的密码
```

更进一步的结构建议：

- 第一行显示：配置项名 / 当前值 / 是否已写入 / 作用域
- 第二行显示：简洁说明
- 枚举值优先做单选或下拉
- 布尔值优先做单选
- 自定义模型名允许文本输入
- 作用域为 `非全局` 时，必须联动项目选择器

## 7. JSON Forms 中应该如何表达这些业务

### 7.1 字段说明

每个字段都要在 `schema` 里写 `description`。

原因是：

- 用户能直接看到简洁说明
- 大模型能据此理解字段用途
- 后续导出帮助文档更容易

### 7.2 必选和可选

- 必选项放入 `required`
- 可选项通过布尔开关或显式勾选字段控制是否写入

这里要注意：

- “字段必填”不完全等于“必须写入 TOML”
- 这两个概念要分开建模

建议做法：

- 用 `enabled` 或 `includeInToml` 字段表达“是否写入”
- 用 `required` 表达“业务上此字段必须存在”

### 7.3 全局和非全局

建议对支持作用域的配置项统一使用：

- `scopeMode`: `global | project`
- `targetProjects`: `string[]`

规则：

- `scopeMode = global` 时，`targetProjects` 可为空
- `scopeMode = project` 时，`targetProjects` 必须至少选择一个

### 7.4 分类布局

使用 `Categorization` 承载左侧窄标签。

这正好适合当前用户要求的：

- 左侧标签分类固定
- 右侧显示对应分类内容
- 避免整页无限变长

## 8. 验证方式

`JSON Forms` 的一个关键优势是可精确验证。

建议至少做四类验证：

### 8.1 Schema 验证

验证：

- 枚举是否合法
- 必填项是否完整
- 字段类型是否正确

### 8.2 规则验证

验证：

- 选择 `project` 时是否必须有目标项目
- 必选项是否不可取消
- 非法值是否阻止保存

### 8.3 DOM 结构验证

通过浏览器自动化验证：

- 左侧是否出现三个分类标签
- 当前分类下是否只显示对应字段
- 字段是否按预期顺序出现
- 控件类型是否符合预期

### 8.4 视觉回归验证

通过截图或元素级截图验证：

- 布局是否跑偏
- 分类栏宽度是否异常
- 行展示是否过高导致滚动过长

## 9. MCP 怎么接进来

`JSON Forms` 虽然没有成熟的官方专用 MCP 服务，但它非常适合自己封装。

建议最小接入方式如下。

### 9.1 Resources

- `business://jsonforms/schema`
- `business://jsonforms/uischema`
- `business://jsonforms/example-data`
- `business://jsonforms/validation-cases`

### 9.2 Prompts

- `generate-json-schema-from-business-rules`
- `generate-ui-schema-from-screen-outline`
- `check-scope-conflicts`
- `check-missing-config-fields`

### 9.3 Tools

- `validate_json_schema`
- `validate_scope_rules`
- `build_jsonforms_bundle`
- `render_jsonforms_preview`
- `compare_preview_snapshot`

## 10. 当前建议的推进顺序

既然已经选 `JSON Forms`，后续就不要再反复摇摆。

建议直接按这个顺序推进：

1. 先把业务字段清单补齐
2. 再把字段转成 `JSON Schema`
3. 再写 `UI Schema`，固定分类布局
4. 再补示例数据
5. 最后再做真实渲染与自动化验证

## 11. 本仓库中的对应模板

当前子项目里已经补了两个起步模板：

- `templates/json-forms-config-data.example.json`
- `templates/json-forms-config-schema.template.json`
- `templates/json-forms-config-uischema.template.json`

这两个模板的目标不是直接上线，而是作为：

- 业务字段收敛模板
- 大模型生成模板
- 后续实现的输入骨架

## 12. 参考资料

- JSON Forms 官网
  - https://jsonforms.io/
- JSON Forms 文档
  - https://jsonforms.io/docs/
- JSON Forms UI Schema
  - https://jsonforms.io/docs/uischema/
- JSON Forms Layouts
  - https://jsonforms.io/docs/uischema/layouts/
- JSON Forms Categorization 示例
  - https://jsonforms.io/examples/categorization
- JSON Forms Validation
  - https://jsonforms.io/docs/validation/
- JSON Schema
  - https://json-schema.org/
- Playwright 官方文档
  - https://playwright.dev/
