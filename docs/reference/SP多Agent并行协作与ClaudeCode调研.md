# SP 多 Agent 并行协作与 Claude Code 调研

## 结论先行

SP 未来可以支持多 agent 并行工作，但不应该把自己做成重型调度平台。更稳的方向是：SP 只定义协作协议、任务边界、证据格式和收口规则；Codex、Claude Code、Gemini 等宿主负责实际调用子 agent、后台 agent、CLI 会话或独立工作区。

最适合 SP 的默认模型是：

```text
Coordinator -> 分配任务包 -> Workers 并行执行 -> Handoff 回收 -> Coordinator 串行合并 -> analyze/gate 验证
```

说人话就是：可以让多个模型同时干活，但不能让它们互相抢方向、抢文件、抢共享记忆。并行只负责提速，最终判断、合并和写回仍由一个 coordinator 串行完成。

## 调研边界

Claude Code 的公开仓库主要展示 README、插件、commands、agents、hooks、MCP 和示例结构，不等于完整运行内核源码。当前判断基于以下公开可验证信息：

- Claude Code README：说明它是终端里的 agentic coding tool，并指向官方文档。
- Claude Code 插件目录：公开插件可包含 commands、agents、skills、hooks、MCP server。
- `claude --help`：可见 `--agent`、`--agents`、`--worktree`、`--tmux`、`--permission-mode`、`--allowedTools`、`--disallowedTools`、`--plugin-dir`、`--mcp-config`、`--bare`，以及 `agents`、`ultrareview` 等命令。
- `claude mcp --help`：可见 MCP server 的增删查和项目级配置管理。
- 官方文档导航可见 subagents、agent teams、dynamic workflows、worktrees、hooks、MCP、skills、plugins 等机制。

因此，本文件不是“照搬 Claude Code 内核源码”的方案，而是从 Claude Code 公开机制和宿主行为中抽象出 SP 可借鉴的工程控制规则。

需要特别说明：下面涉及 Claude Code subagents、worktrees、hooks、agent teams、permission scope 的内容，来自公开文档、公开仓库结构、本地 CLI 帮助和三方审查推断，不是 Anthropic 承诺的稳定内部 API。未来 Claude Code 版本升级可能改变具体行为。SP 可以借鉴这些控制思想，但默认机制不能绑定某个 Claude Code 专属接口。

## Claude Code 可借鉴的机制

### 1. Subagent 独立上下文

Claude Code 的 subagent 思想对 SP 很有价值。每个 worker 拿到独立上下文，避免主会话上下文污染，也降低“我刚才看过所以我记得”的不稳定性。

对 SP 的启发：

- Worker 不能靠聊天历史工作，必须依赖自包含 task packet。
- Task packet 要写清楚目标、上下文入口、允许写入范围、验证命令和 handoff 格式。
- Worker 输出不能直接等同于事实，必须由 coordinator 复核当前文件和可重跑证据。

### 2. Worktree 和独立工作区

Claude Code CLI 暴露 `--worktree`，这说明宿主层已经把并行会话和物理隔离作为重要能力。SP 不需要自己实现复杂文件锁，应该优先借助 git worktree、临时 workspace、CI workspace 或独立 branch。

对 SP 的启发：

- `[P]` 并行任务最好绑定独立 worktree 或至少独立 branch。
- `Allowed Write Set` 是逻辑边界，worktree 是物理隔离。
- Worktree 只能隔离文件，不能自动隔离端口、数据库、缓存、队列、第三方服务和密钥，这些必须在任务包里额外说明。

### 3. Tool 和 permission scope

Claude Code 暴露 `--allowedTools`、`--disallowedTools`、`--permission-mode`。这说明多 agent 并行时，权限边界和工具边界不能只靠模型自觉。

对 SP 的启发：

- Worker 默认只拿完成任务所需的读写和测试权限。
- Reviewer 默认只读，不能修改文件。
- 涉及破坏性命令、发布、迁移、删除、重命名、外部服务写入时，应回到 coordinator 或人工决策。

### 4. Hooks 可以借鉴，但不能强依赖

Claude Code plugins 可包含 hooks，适合做格式检查、完成后验证、危险操作提醒。SP 可以借鉴这种“工具层拦截”的思想，但不能把核心正确性绑定到 Claude 专属 hook。

对 SP 的启发：

- 可选使用 hooks 或脚本检查 handoff 格式、write-set 越权、测试证据缺失。
- 核心规则仍应写在 SP 文档、命令模板和轻量检查脚本里。
- 跨宿主默认路径不能依赖 Claude Code hooks。

### 5. Agent teams 和 mailbox 只做思想参考

Claude Code 文档中可见 agent teams、dynamic workflows 等方向。它们说明多 agent 可以有任务列表、协作角色和工作流机制，但这类机制对 SP 默认形态过重。

对 SP 的启发：

- 可以借鉴“任务领取、状态回报、协作角色”的思想。
- 不建议默认引入 worker 之间的 mailbox、抢单、P2P 协商或复杂锁。
- SP 应坚持 coordinator 单点路由，降低 token 消耗和状态漂移。

## Codex 的判断

我认为 SP 的多 agent 机制应坚持“轻协议、强边界、串行收口”。

推荐吸收：

- Task packet 自包含。
- Worker 上下文隔离。
- Worktree 或临时 workspace 隔离。
- Worker 只写自己的 `Allowed Write Set`。
- 共享 truth 文件只由 coordinator 写回。
- Worker 必须输出 handoff。
- `sp.analyze` 和 `sp.gate` 以当前文件和可重跑证据为准，不信任 worker 自报。

不建议吸收：

- 默认引入 agent teams。
- 默认引入 worker 之间直接通信。
- 默认做 AST 锁、函数级锁或行级锁。
- 默认依赖 Claude Code hook、Codex skill、Gemini tool 的某一种宿主实现。
- 默认允许 worker 自动 rebase、merge、commit、push 或清理失败现场。

关键原因是：多 agent 的目标是提高效率，不是增加不可控状态。只要共享状态出现多写入方，模型就容易丢上下文、重复检查、互相覆盖或把冲突当成已解决。

## Claude 的意见

Claude 认为最值得吸收的是三点：

- Subagents：用独立上下文执行 worker，天然减少上下文污染。
- Worktrees：作为文件级隔离的物理保障，不需要 SP 自己实现文件锁。
- Hooks：只适合做轻量质量门禁，例如 handoff 格式检查、测试触发、路径越权检查，不适合承载业务判断。

Claude 重点提示的风险：

- Worker 可能因为任务包不完整而静默失败，但仍生成看起来正常的 handoff。
- 后台 worker 可能因为权限问题自动拒绝某些操作，导致任务看似完成但实际缺步骤。
- Worktree 分叉后，如果 main 继续变化，closeout 时可能出现状态滞后和合并冲突。
- 多个 worker 同时提出 memory 或 trace 更新时，如果没有 coordinator 串行合并，会产生共享 truth 冲突。
- 任务包过大和 closeout 重复读取会浪费 token。

Claude 建议补强：

- 并行前 coordinator 输出 worker 分配表。
- Worker handoff 增加可验证字段，例如实际写入文件、测试命令、测试结果、共享记忆建议。
- Closeout 按明确顺序串行合并。
- `[P]` 可以扩展为 `[P:wN]` 表示 worker 绑定，但这点不一定要立刻进入默认规则。

## Gemini 的意见

Gemini 的主要意见和 Claude 接近，但更强调工程落地的轻量性。

Gemini 认为应该吸收：

- Subagent 的“失忆 worker”模型，要求 task packet 完整。
- Git worktree 的物理隔离。
- Headless worker 的 CI 风格执行，避免依赖交互式权限确认。
- Fork-Join 模型：先分发，再并行，再统一回收。
- Coordinator 绝对审查权：worker 不直接 commit、merge 或写共享 memory。

Gemini 重点提示的风险：

- Worktree 只能隔离文件，不能隔离数据库、Redis、端口、外部服务和密钥。
- 如果每个 worker 都全量读取 spec、plan、tasks、memory，会造成 token 线性爆炸。
- Agent teams 的 mailbox 和抢单机制会增加状态同步成本，不适合 SP 的默认低频协作场景。
- 宿主专属 hooks 不应成为 SP 安全门禁的基础。

Gemini 建议阶段化落地：

- Phase 1：先跑通串行委托，用单个 worker 验证 task packet 和 handoff。
- Phase 2：引入 worktree 和环境隔离策略。
- Phase 3：只对 2-3 个 write set 明确不重叠的任务开启并行。

## 三方共同意见

三方意见基本一致：

- SP 应定义协议，不应绑定某个宿主的多 agent API。
- 多 agent 默认只用于 `sp.implement` 和只读 review/search，不用于 `sp.specify`、`sp.clarify`、`sp.plan`、`sp.tasks`、`sp.analyze`、`sp.gate` 的决策主流程并行。
- Coordinator 是唯一共享 truth 写入者。
- Worker 只做一个明确任务或 workset。
- Worker 不直接抢写 `tasks.md`、`memory/open-items.md`、`memory/trace-index.md`、workset 路由、全局状态摘要。
- Worker 完成必须输出 handoff。
- Handoff 不是证据本身，coordinator 必须复核 diff、运行检查、处理冲突。
- `[P]` 任务必须 write set 不重叠，依赖已满足，验证路径明确。
- 并行输出即使文件不冲突，也可能在业务语义上冲突，因此 `sp.analyze` 和 `sp.gate` 必须检查 UI、API、数据、权限、事件、trace、memory 的一致性。

## 需要特别注意的问题

### 1. 文件隔离不等于环境隔离

两个 worker 不改同一个文件，也可能同时抢一个端口、写同一个测试数据库、清同一个缓存、调用同一个外部 API。

SP 需要在并行任务包里增加 `Environment Isolation`：

- 端口范围。
- 测试数据库或 schema。
- Redis/cache namespace。
- 队列/topic。
- 外部服务 mock 或 sandbox。
- `.env` 和 secret 使用边界。

如果环境隔离说不清，任务不能并行。

### 2. Worker 静默失败

后台 agent 或子 agent 可能没有足够权限，也可能遇到失败后用文字绕过去。

SP 需要要求 handoff 写清：

- 实际运行了什么命令。
- 命令结果是 pass 还是 fail。
- 没运行的检查为什么没运行。
- 实际修改了哪些文件。
- 是否触碰 forbidden/shared 文件。
- 还剩哪些 open item。

### 3. 上下文过大导致 token 浪费

多 agent 并行会把 token 消耗放大。给 4 个 worker 全量 spec 和 memory，成本就是近似 4 倍。

SP 应采用“必要上下文切片”：

- 默认给任务相关的 source docs、anchors、workset、直接依赖文件和验证命令。
- 不把整套方法论塞给 worker。
- Task packet 必须包含压缩后的 effective defaults。
- Worker 发现上下文不足时，允许按需读取相关文档，但要在 handoff 说明扩读原因。

### 4. 合并顺序和 stale worker

并行任务完成时间不同，晚返回的 worker 可能基于旧状态。

SP 需要规定：

- Coordinator 在 fork 前记录 worker 分配表和基线状态。
- Closeout 按明确顺序串行合并。
- 合并每个 worker 后按需要运行局部或全局检查。
- 超时、崩溃、无 handoff、基线过旧的 worker 标为 stale。
- Stale worker 默认不能直接合并，必须选择丢弃、重派、串行补做或人工决策。

### 5. 业务语义冲突

两个 worker 可能分别改 UI 和 API，文件不冲突，但字段名、状态机、权限逻辑不一致。

SP 需要让 `sp.analyze` 和 `sp.gate` 检查：

- UI action 是否有对应 API。
- API 契约和 data model 是否一致。
- 权限和状态机是否冲突。
- 两个 worker 是否关闭了同一个 risk 或 open item。
- trace anchor 是否断链。
- worker proposed memory updates 是否互相矛盾。

## SP 需要适配的机制

### 1. Task packet 字段

并行 worker 的 task packet 建议至少包含：

```markdown
Task ID:
Workset:
Agent Role: worker
Execution Mode: parallel-worker | sequential-worker | reviewer
Packet Carrier: tasks-inline | worker-packet-file | prompt-only
IsolationMode: worktree | branch | directory | none
Context Slice:
Read Set:
Allowed Write Set:
Forbidden Write Set:
Shared Truth Policy: read-only, proposed updates only
Environment Isolation:
Permission Mode:
Attempt Limit:
Required Checks:
Trace Anchors:
Expected Handoff:
Fallback Route:
Merge Owner:
Merge Order:
Post-Merge Checks:
```

普通串行任务不需要把所有字段铺满。默认采用“全局默认 + 只写偏离”，但 worker 能看到的 task packet 必须包含最终生效规则，不能让 worker 自己回忆方法论。

Task packet 的载体应明确，避免“规则写了但 worker 拿不到”：

- 默认载体：写在 `tasks.md` 的任务条目下方，适合少量 worker 和人工复制。
- 推荐载体：为并行 worker 生成独立 packet 文件，例如 feature-local 的 `workers/<task-id>.md`，coordinator 把必要上下文压缩后写入。
- 仅 prompt 注入：只适合临时实验，不适合作为可复盘流程，因为后续 agent 难以验证当时 worker 实际拿到了什么。

`sp.implement` 识别身份时，应优先读取 task packet 中的 `Agent Role` 和 `Execution Mode`。如果没有这些字段，则默认当前 agent 是 coordinator 或普通串行执行者，不能自行假设正在执行 parallel worker。

`IsolationMode` 的含义：

- `worktree`：首选。文件隔离最强，适合多个 worker 同时改代码。
- `branch`：次选。适合不能创建 worktree 但可以分支开发的环境。
- `directory`：只能用于明确不重叠目录或临时 workspace，必须加强 write-set 检查。
- `none`：不允许真正并行写代码，只能串行执行或只读 review。

如果 `IsolationMode` 说不清，或者环境隔离说不清，任务不应进入并行写代码模式。

### 2. Worker handoff 字段

Worker handoff 建议固定为：

```markdown
Task ID:
Workset:
Worker:
Branch or Worktree:
Base Revision:
IsolationMode:
Allowed Write Set:
Files Actually Changed:
Inputs Read:
Commands Run:
Verification Result: pass | fail | partial | not-run
Evidence:
Expected Writes Covered: yes | no | unclear
Context Truncation Alert: yes | no | unclear
Trace Anchors Affected:
Proposed Shared-Memory Updates:
Open Items or Risks:
Forbidden Write Touches:
Merge Notes:
Next Route:
```

如果 handoff 缺关键字段，coordinator 不能直接 PASS，应要求补充、重跑或改为串行复核。

`Expected Writes Covered` 用来防止 worker 静默失败。Coordinator 要把 task packet 里的 `Allowed Write Set`、目标文件或目标 anchor，与实际 git diff 对照。如果 worker 没有覆盖预期写入，或只写了说明没写代码，应标记为 `INCOMPLETE_DELIVERY`，不能因为 handoff 格式完整就通过。

`Context Truncation Alert` 用来暴露上下文截断风险。Worker 如果发现上下文窗口不足、关键信息没读完、工具输出被截断，必须写明。Coordinator 遇到 `yes` 或 `unclear` 时，应降低信任等级，必要时改成串行复核。

### 3. Coordinator 分配表

并行前，coordinator 应输出分配表：

```markdown
| Task | Worker | Worktree/Branch | Allowed Write Set | Environment Scope | Merge Order | Required Checks |
|---|---|---|---|---|---|---|
```

作用是让后续 agent 可以快速知道谁负责什么、谁不能改什么、谁先合并、哪些检查必须跑。

### 4. Closeout 串行收口

Coordinator closeout 应固定做：

1. 读取 worker handoff。
2. 对比实际 diff 和 `Allowed Write Set`。
3. 检查是否触碰 forbidden/shared/global 文件。
4. 检查 worker 证据是否可复核。
5. 按 merge order 串行合并。
6. 每合并一个 worker 后运行必要检查。
7. 统一写回 `tasks.md`、memory、trace、open items。
8. 运行 `sp.analyze`。
9. 运行或准备 `sp.gate` 阶段判断。

### 5. Analyze/Gate 新增关注点

多 agent 场景下，`sp.analyze` 应重点检查：

- worker handoff 是否完整。
- write set 是否越界。
- task packet 的预期写入和实际 diff 是否匹配，必要时输出 `INCOMPLETE_DELIVERY`。
- `IsolationMode` 是否符合任务风险。
- `Base Revision` 是否过旧。
- 环境隔离是否存在端口、数据库、缓存、队列、外部服务冲突。
- proposed shared-memory updates 是否冲突。
- stale worker 是否处理。
- 合并后 UI/API/data/test/trace 是否一致。

`sp.gate` 应重点确认：

- `sp.analyze` 的多 agent 诊断已经完成，或者说明为什么必须独立 gate。
- coordinator closeout 是否完成。
- 合并后验证是否跑过。
- 未合并 worker、失败 worker、stale worker 是否有处理结论。
- 共享 truth 是否只有 coordinator 串行写入。
- 是否存在需要人工决策的风险接受、降级验证、需求冲突或拆分方案。

边界规则：`sp.analyze` 负责诊断和指出回修路线，`sp.gate` 负责阶段放行判断。`sp.gate` 可以复查关键证据，但不应把自己变成第二个完整 analyze；如果 analyze 已经发现 blocker，gate 应直接 `FAIL`、`BLOCKED` 或 `NEEDS_DECISION`，而不是重复消耗 token 重新推理一遍。

### 6. 失败重试和 token 熔断

多 agent 并行会放大 token 消耗。SP 不应默认让 worker 无限重试。

建议规则：

- 每个 worker 的 `Attempt Limit` 默认 1 次，复杂修复最多 2 次。
- 同一失败签名重复出现 2 次，应停止自动重试，交给 coordinator 判断。
- Worker 不应全量读取项目文档；默认只读 task packet、相关 source docs、直接依赖文件和验证命令。
- Worker 需要扩读时，应在 handoff 写明扩读原因和新增读取文件。
- Coordinator closeout 只复核必要 diff、handoff、证据和冲突点，不重复阅读所有 worker 的完整上下文。

粗略判断：如果一个任务拆成 3-5 个 worker，每个 worker 都读取 40k-80k token 上下文，总成本会线性放大到 120k-400k token，还不包括 closeout。只有当 write set 清晰不重叠、验证命令明确、并行能明显缩短时间时，才值得开启多 worker。

## 不建议默认吸收的内容

- 不默认采用 Claude Code agent teams 或 mailbox。
- 不默认做 worker 之间 P2P 协商。
- 不默认做动态抢单。
- 不默认做 AST 级、函数级、行级锁。
- 不默认依赖 Claude Code hooks 承载核心门禁。
- 不默认允许 worker commit、merge、push。
- 不默认允许 worker 修改共享 truth 文件。
- 不默认自动 stash、reset 或删除失败现场。
- 不默认给所有 worker 全量项目上下文。

这些东西不是完全没价值，而是不适合做 SP 默认路径。它们会增加 token 消耗、状态复杂度和宿主绑定风险。后续可以作为高级 preset 或实验能力。

## 分阶段落地方案

### Phase 1：文档和任务包先落地

先不做自动调度，只强化方法论和命令模板：

- `sp.tasks` 能生成并行任务边界。
- `sp.implement` 能识别 worker 模式。
- Handoff 格式固定。
- `sp.analyze` 和 `sp.gate` 能检查多 agent closeout。

验收标准：人工开多个会话，也能按同一套 task packet 和 handoff 稳定协作。

### Phase 2：轻量检查脚本

增加可选脚本检查：

- handoff 字段完整性。
- 实际 diff 是否越过 `Allowed Write Set`。
- 并行任务 write set 是否重叠。
- shared truth 文件是否被 worker 修改。

验收标准：不用模型大量读文档，也能快速发现低级边界错误。

### Phase 3：Worktree 辅助

增加可选 worktree 辅助，不做重型 scheduler：

- 创建 worker worktree。
- 生成 task packet。
- 收集 handoff。
- 汇总 worker diff。

验收标准：coordinator 仍然负责判断和合并，脚本只负责减少机械工作。

### Phase 4：宿主适配 preset

分别为 Claude Code、Codex、Gemini 提供宿主建议：

- Claude Code：可用 subagent、worktree、permission mode、可选 hooks。
- Codex：可用 skills、独立会话、worktree、任务包。
- Gemini：可用长上下文 review、批量检查、独立 CLI worker。

验收标准：SP 协议不变，只是不同宿主用不同执行方式。

## 对当前 SP 的具体建议

当前 SP 已经有多 agent 协作协议，方向正确。下一步不建议大改架构，建议小步补强：

- 在方法论和命令模板中明确 `Environment Isolation`，避免只检查文件不检查外部状态。
- 把 worker handoff 的可验证字段进一步固定下来。
- 在 `sp.tasks` 中明确并行前需要 coordinator 分配表。
- 在 `sp.analyze` 中增加 stale worker、base revision、environment collision 的检查项。
- 在 `sp.gate` 中增加“合并后验证”作为多 agent PASS 前置条件。
- 后续再考虑轻量脚本检查，不要先做复杂调度器。

## 参考来源

- [Claude Code README](https://github.com/anthropics/claude-code)
- [Claude Code plugins README](https://github.com/anthropics/claude-code/tree/main/plugins)
- [Claude Code subagents documentation](https://code.claude.com/docs/en/sub-agents)
- [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks)
- [Claude Code worktrees documentation](https://code.claude.com/docs/en/worktrees)
- [Claude Code agent teams documentation](https://code.claude.com/docs/en/agent-teams)
- Local CLI checks: `claude --help`, `claude mcp --help`
