# SP 复核页本地 HTTP 启动器与推荐保存作用域设计

## 背景

当前 `/sp.flow` 与 `/sp.ui` 只要求模型输出固定 renderer 的仓库相对路径。renderer 在 `file://` 下读取结构化 JSON 失败时才显示软提示，程序并未阻止模型把本地文件链接交给用户，也没有统一完成端口选择、服务启动和 HTTP 就绪检查。

现有右侧确认栏提供“全部选择推荐”和“当前视图剩余项选推荐”。前者实际覆盖当前加载需求的全部模块，名称没有表达需求边界；后者无法覆盖当前模块。用户需要三个明确层级：当前视图、当前模块、当前需求。

## 目标

- 通过随项目分发的程序启动复核页面，不再把 `file://` 视为有效复核方式。
- 从目标项目根目录提供静态 HTTP 内容，仅绑定 `127.0.0.1`，自动选择可用端口。
- 在向用户报告链接之前，实际验证 renderer URL 和对应 review-data URL 都返回 HTTP 200。
- 为 `/sp.flow` 与 `/sp.ui` 提供同一个跨平台启动接口和稳定的就绪输出协议。
- 在确认栏提供“当前视图按推荐保存”“当前模块按推荐保存”“当前需求按推荐保存”三个按钮。
- 所有机制保持通用，不写入任何具体项目的模块、流程、界面或 review data。

## 非目标

- 不自动打开浏览器；启动器只负责保持服务运行并输出可点击链接。
- 不替代现有 `validate-review-data.mjs` 的 schema 与内容校验。
- 不增加后台守护进程、PID 文件、端口复用或跨终端服务管理。
- 不修改确认包、确认文档和浏览器本地状态的数据格式。

## 方案比较

### 方案 A：随项目分发 Node 启动器（采用）

在 `.specify/review/scripts/` 中新增 `serve-review.mjs`。它与现有 `validate-review-data.mjs` 使用同一 Node 运行时，并由 `specify init` 随固定复核基础设施分发。

优点是项目自包含、跨集成一致，不依赖全局 Specify CLI 的具体版本。启动、路径验证、HTTP 200 自检和 URL 输出由同一程序负责，命令模板不需要自行拼接端口。

### 方案 B：Specify CLI 子命令

增加 `specify review serve` 可以集中管理实现，但已生成项目必须保持全局 CLI 可用且版本匹配。复核基础设施不能脱离安装器独立运行，因此不采用。

### 方案 C：Shell/PowerShell 包装 Python 静态服务

Python 标准库可以快速启动服务，但会在已有 Node 工具链之外增加运行时与双平台包装脚本，并需要额外实现可靠的就绪握手和 Host/path 安全控制，因此不采用。

Gemini 与 Claude 的独立架构审查均推荐方案 A。Gemini 建议只做文件存在检查，但明确需求要求实际 HTTP 200 结果，因此文件检查只能作为快速失败，不能替代网络自检。

## 启动器接口

启动命令使用互斥的复核类型参数：

```bash
node .specify/review/scripts/serve-review.mjs --flow <feature>
node .specify/review/scripts/serve-review.mjs --ui <feature>
```

可选 `--port <port>` 用于诊断或人工固定端口；未提供时传入端口 `0`，由操作系统选择可用端口。feature 必须匹配 `/^[A-Za-z0-9][A-Za-z0-9._-]*$/`，并额外拒绝包含 `..` 的值；因此首字符不能是点或短横线，也不能包含路径分隔符。

脚本从自身真实路径定位项目根目录，不依赖调用者当前工作目录。它先检查 renderer 与目标 review-data 文件可访问，再绑定 `127.0.0.1`。进入 `listening` 后取得实际端口，使用硬编码的 `http://127.0.0.1:<port>` origin 分别请求：

- `/.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>` 或 `?ui=<feature>`
- `/specs/<feature>/flows/review/flow-review-data.json` 或 `/specs/<feature>/ui/review/ui-review-data.json`

两个自检请求并行发出，各自从发出时起有独立的 5 秒超时；必须全部返回 200 才算成功。成功后根据类型输出唯一、稳定的机器可读行：

```text
SPECCOMPASS_REVIEW_URL=http://127.0.0.1:<port>/.specify/review/renderer/speccompass-review-renderer.html?flow=<feature>
SPECCOMPASS_REVIEW_URL=http://127.0.0.1:<port>/.specify/review/renderer/speccompass-review-renderer.html?ui=<feature>
```

随后输出服务运行和 `Ctrl+C` 退出提示并保持前台运行。任何检查失败都先关闭 server，再以非零状态退出，而且不能输出 `SPECCOMPASS_REVIEW_URL=`。

## HTTP 与安全边界

- 监听地址固定为 `127.0.0.1`，不接受 `0.0.0.0`、LAN 地址或环境变量覆盖。
- `Host` 必须严格等于当前 `127.0.0.1:<port>`；其他 Host 返回 403。
- 只处理 `GET` 与 `HEAD`；其他方法返回 405，并设置 `Allow: GET, HEAD`。
- URL 解码、标准化和绝对路径解析后必须仍位于项目根目录；已存在目标还要比较真实路径，阻止符号链接逃逸。
- 不提供目录列表。目录、缺失文件和项目根外路径不能返回文件内容。
- 至少为 HTML、JavaScript、CSS、JSON、SVG、PNG/JPEG/WebP、WOFF、WOFF2、TTF、OTF、EOT 与纯文本提供明确 MIME；响应增加 `X-Content-Type-Options: nosniff` 与 `Cache-Control: no-store`。
- 自检 URL 只能由脚本根据实际端口与已验证 feature 构造，不能接受外部 origin，避免 SSRF。
- `SIGINT`、`SIGTERM`、未捕获异常和未处理 Promise rejection 都要关闭 server 并结束进程。关闭流程必须幂等。

## Renderer 协议强制

固定 renderer 加载数据前检查浏览器位置。只有 `http:` 且 hostname 精确为 `127.0.0.1` 才进入正常复核流程。`localhost`、`::1` 和其他 loopback 表示也有意拒绝，避免扩大 host 契约；启动器始终输出数字 IPv4 地址。

在 `file:` 或其他协议/host 下：

- 显示“必须使用 `.specify/review/scripts/serve-review.mjs` 启动”的错误状态；
- 禁用默认 Flow/UI 加载按钮和本地文件选择；
- 不调用 `acceptReviewData()`，即使页面预置了内联数据也不能进入可确认状态；
- 不允许下载确认包或复制出看似有效的确认摘要。

这个运行时门禁与命令模板要求共同约束行为：模板负责启动正确程序，renderer 负责拒绝绕过程序的入口。

## 命令与技能契约

`templates/commands/flow.md`、`templates/commands/ui.md` 和 `templates/skills/speccompass-review-data/SKILL.md` 必须要求模型：

1. 先运行现有 review-data validator。
2. 运行对应的 `serve-review.mjs --flow/--ui` 命令，并保持终端服务存活。
3. 等待 `SPECCOMPASS_REVIEW_URL=` 出现。
4. 只把该行中的 `http://127.0.0.1:...` URL 作为主要复核入口交给用户。
5. 任一 200 自检失败时继续修复或报告 blocker，不能改用 `file://`、相对文件链接或自行猜测端口收尾。

renderer README 和 SP 方法论文档同步删除把 `file://` 描述为有效静态复核兜底的内容。Flow/UI 命令生成的 `flow-review-batch.md` / `ui-review-batch.md` 仍可作为纯文本审核清单，但不是可交互复核入口。

新项目由 `specify init` 获得启动器；已有项目使用现有显式刷新路径 `specify init --force` 更新整套 `.specify/review` 固定基础设施。此次不增加单文件迁移命令；文档必须说明 `--force` 会刷新固定基础设施，项目自有 review data 和确认文档不属于该固定目录，不能被此刷新覆盖。

## 推荐保存作用域

右侧确认栏按从窄到宽的顺序显示三个按钮：

1. `当前视图按推荐保存`
2. `当前模块按推荐保存`
3. `当前需求按推荐保存`

作用域从 renderer 已有选择状态派生，不受搜索、折叠或其他展示过滤影响：

- 当前视图：`selectedNodeId` 非空时，现有 `visibleNodes()` 返回包含当前 `currentItem().nodes` 中该 id 对应节点的单元素数组；未选节点时返回当前 `currentItem().nodes` 的全部节点。无当前 item 时为空数组。
- 当前模块：新增 `currentModuleNodes()`，按数据顺序拉平 `currentModule()[itemKey()]` 下每个流程或界面的 `nodes`。现有 `itemKey()` 根据 `reviewData.review_type` 返回 `diagrams`（Flow）或 `screens`（UI），因此只处理当前加载复核类型的 item；无当前 module 时为空数组，不受当前流程/界面标签影响。
- 当前需求：`allNodes()` 按数据顺序返回当前已加载 review data 中全部 module/item/node entry；按钮把 entry 映射为 node 后处理，即该需求下的全部模块和流程/界面，不跨其他 feature。

三个按钮复用现有且已经具有双参数签名的 `runRecommendationCompletion(entries, scopeLabel)`；`entries` 是上述作用域的 node 数组，`scopeLabel` 分别使用按钮原文“当前视图”“当前模块”“当前需求”。现有函数已经用 scopeLabel、未完成数、可保存数和“不覆盖已有选择或草稿”组成确认文案；本次只替换现有两个按钮绑定并增加模块作用域绑定。函数只写入满足以下条件的节点：

```text
requiresNodeDecision(node)
&& node.recommended_option
&& nodeState(node.id).status === "MISSING"
```

它们不得覆盖 `DRAFT`、`SAVED_RECOMMENDED` 或 `SAVED_SUBMITTED`。确认弹窗首句必须包含对应 scopeLabel，并显示未完成数量、可自动保存数量，同时说明已有选择和草稿不会被覆盖。没有可保存项时只显示状态，不弹确认框。

下载确认包仍检查当前需求的全部节点；发现 `MISSING` 时询问是否补齐当前需求的可推荐项。用户选择“否”时不下载；选择“是”时保存可推荐项并在同一次点击流程中自动继续下载检查，不要求再次点击。补齐后若仍存在没有推荐选项的未完成节点，则保持下载按钮可用但本次不下载，并在 `live-status` 显示错误及待人工处理数量；若只剩草稿，则继续沿用现有“再次点击仍要下载”草稿门禁。

## 测试策略

实现遵循 TDD，先增加失败测试，再写启动器与 renderer 改动。

### 启动器进程测试

- `--flow` 与 `--ui` 同时出现、都不出现、feature 非法、port 非法时非零退出。
- 缺少 renderer 或目标 review-data 时不进入就绪状态。
- 默认端口由系统分配且大于 0；就绪行只在两个 URL 都返回 200 后出现。
- renderer、review data、CSS 与 JavaScript 返回正确 MIME、`no-store` 和 `nosniff`。
- 错误 Host 返回 403，POST 返回 405，路径遍历与符号链接逃逸不返回文件。
- `HEAD` 返回与 GET 一致的状态和 headers，但不含 body。
- 发送 SIGTERM 后进程退出且端口释放。

### Renderer 合约与行为测试

- 固定 renderer 包含三个准确按钮标签和独立 handler。
- 当前视图、当前模块、当前需求分别选择预期节点集合。
- 三个作用域都只补齐 `MISSING` 且有推荐项的节点。
- `file://` 与非 `127.0.0.1` 环境不加载数据，并禁用交互式复核入口。
- `http://127.0.0.1` 下保留现有加载、推荐保存、下载与摘要行为。

### 下载补齐流程测试

- 用户拒绝补齐时不下载，并显示已取消状态。
- 用户同意补齐且所有未选项都有推荐时，同一次点击自动继续生成确认包。
- 补齐后仍有缺少推荐选项的未完成节点时，本次不下载并在 `live-status` 显示数量。
- 补齐后只剩草稿时进入既有草稿警告门禁，首次点击不下载且按钮显示“仍要下载确认包”。

### 分发与文档测试

- `specify init` 和 `--force` 会安装或刷新 `serve-review.mjs`。
- Flow/UI 命令模板与 review-data skill 都包含启动器、200 就绪和禁止 `file://` 的硬性要求。
- 方法论文档与 renderer README 使用同一作用域和启动方式，并测试它们不再把 `file://` 描述为有效交互入口。

## 验收标准

- 新生成或强制刷新的 SP 项目可以用一条 Node 命令启动复核页。
- 用户收到的复核链接始终以 `http://127.0.0.1:<实际端口>/` 开头。
- 链接报告前 renderer 和 review data 已各自通过真实 HTTP 200 检查。
- 直接打开 renderer 文件不能加载、选择或导出确认结果。
- 三个推荐保存按钮作用域准确，不覆盖任何已有草稿或人工决定。
- 聚焦测试、完整测试和真实浏览器复核均通过，且无具体项目内容进入机制模板。
