window.SPECCOMPASS_REVIEW_DATA = {
  "schema_version": 1,
  "review_type": "flow",
  "artifact_path": "specs/ask-survey/flows/review/flow-review-data.json",
  "confirm_strategy": "batch",
  "batch_id": "ask-survey-flow-2026-06-25",
  "project": {
    "name": "ASK",
    "feature": "问卷与文档协同",
    "business_overview": "ASK 示例把问卷、文档和租户管理放在同一轮集中审核里。审核人先看每个模块要解决什么业务问题，再处理少数必须人工决定的选择。",
    "review_goal": "确认问卷发布、文档关联和租户权限这些业务路径是否清楚，避免后续开发按错误规则推进。"
  },
  "source_snapshot": [
    {
      "path": "specs/ask-survey/prd.md",
      "anchors": [
        "问卷发布",
        "文档关联",
        "租户管理"
      ],
      "semantic_scope": [
        "业务规则",
        "审核责任",
        "开发授权"
      ]
    }
  ],
  "modules": [
    {
      "id": "survey-management",
      "title": "问卷管理",
      "summary": "处理问卷从草稿到发布、回收和关闭的业务过程。产品经理重点确认发布条件和异常处理方式。",
      "review_layer": "business",
      "must_confirm_total": 2,
      "diagrams": [
        {
          "id": "survey-draft-publish",
          "title": "问卷从草稿到发布",
          "summary": "这个流程说明运营创建问卷后，系统如何检查发布条件，并在信息不足时把问题退回给运营补齐。",
          "source_path": "specs/ask-survey/flows/survey-draft-publish.md",
          "item_type": "flowchart",
          "nodes": [
            {
              "id": "survey-draft-publish-start",
              "label": "运营创建问卷草稿",
              "plain_summary": "运营先录入问卷名称、题目和预计回收范围，草稿阶段不会影响真实用户。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#问卷草稿"
            },
            {
              "id": "survey-draft-publish-edit",
              "label": "补齐题目和说明",
              "plain_summary": "题目、选项和说明要能让被调查人看懂；这一步已由 PRD 说明，通常不需要重复确认。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#题目编辑"
            },
            {
              "id": "survey-draft-publish-readiness",
              "label": "确认发布前必须检查哪些内容",
              "plain_summary": "发布前要不要强制检查题目、回收范围和截止时间，会直接影响问卷能否被误发布。",
              "action_prompt": "请选择发布前的强制检查范围。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "prd.md#发布条件",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "发布前同时检查题目、回收范围和截止时间",
                  "when_to_choose": "适合把问卷发布当成正式对外动作的场景。只要题目、目标人群或截止时间缺一项，运营就不应该把问卷发出去。",
                  "consequence": "下一轮模型会把这三项写成明确的发布前拦截规则，并保留“缺什么就提示什么”的修复路径。",
                  "project_impact": "开发范围会增加校验和提示，但统计口径、运营责任和验收标准最清楚，误发问卷的风险最低。",
                  "next_exit": "continue: 写入三项发布前强制校验",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补产品决策，再决定发布前检查范围",
                  "when_to_choose": "适合 PRD 还没有说清楚哪些信息缺失必须阻止发布，或者不同问卷类型需要不同规则。",
                  "consequence": "下一轮模型不会授权开发发布校验，会生成待补问题清单，让产品先确认问卷类型、必填信息和例外情况。",
                  "project_impact": "会延后发布流程开发，但能避免团队按错误规则实现，减少后续返工。",
                  "next_exit": "needs-decision: 补充发布前检查规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "只先固定题目完整性，发布范围由运营线下确认",
                  "when_to_choose": "适合一期只想尽快上线基础发布能力，并且团队已经接受由运营在线下确认目标人群和截止时间。",
                  "consequence": "下一轮模型会把系统校验缩小到题目和选项完整性，同时在确认文件里记录回收范围、截止时间暂由人工负责。",
                  "project_impact": "开发速度更快，但后续容易出现发错人群或忘记关闭问卷的问题，运营培训和验收备注要写得更明确。",
                  "next_exit": "revise-local-and-continue: 缩小发布校验范围"
                },
                {
                  "id": "OPTION_D",
                  "label": "拆成内容校验和发布范围校验两个子流程",
                  "when_to_choose": "适合发布规则已经变复杂，例如题目由内容负责人确认，目标人群和截止时间由运营负责人确认。",
                  "consequence": "下一轮模型会把当前节点拆成两个更短流程，分别确认问卷内容是否合格、发布对象和回收时间是否合格。",
                  "project_impact": "流程审核会更清楚，但开发和验收要多覆盖一次负责人分工，适合高风险或多角色发布场景。",
                  "next_exit": "split-flow: 拆分发布前校验流程"
                }
              ]
            },
            {
              "id": "survey-draft-publish-release",
              "label": "问卷上线",
              "plain_summary": "通过检查后，问卷进入可填写状态，目标用户可以开始提交答卷。",
              "review_layer": "business",
              "review_level": "key_step",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#问卷上线"
            },
            {
              "id": "survey-draft-publish-gap",
              "label": "信息不足时退回补齐",
              "plain_summary": "如果发布前发现信息缺失，系统要告诉运营缺什么，避免只显示笼统失败。",
              "action_prompt": "请选择信息不足时的处理方式。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "prd.md#发布失败提示",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "列出全部缺失项，并让运营回到对应位置补齐",
                  "when_to_choose": "适合希望运营一次看懂所有问题的场景，例如同时缺少题目说明、目标人群和截止时间。",
                  "consequence": "下一轮模型会把失败提示写成逐项清单，并把每个缺失项连接到问卷编辑页里的对应区域。",
                  "project_impact": "提示设计和测试用例会多一些，但运营不需要反复试错，发布效率和客服解释成本都会更可控。",
                  "next_exit": "continue: 生成缺失项清单和返回编辑路径",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补齐失败文案和责任边界，再授权开发",
                  "when_to_choose": "适合团队还没决定错误文案由谁维护，或者不确定哪些缺失项应该由系统拦截、哪些交给运营判断。",
                  "consequence": "下一轮模型会生成待确认问题，要求产品明确提示文案、责任人和缺失项优先级后再改流程。",
                  "project_impact": "发布体验开发会后移，但能避免错误提示太含糊，减少上线后运营和研发互相解释。",
                  "next_exit": "needs-decision: 补充发布失败提示规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "只提示最影响发布的一项，先保证流程能跑通",
                  "when_to_choose": "适合一期时间紧，只需要避免最严重的误发布，其他提示可以后续慢慢补。",
                  "consequence": "下一轮模型会保留单项错误提示，例如优先提示“缺少截止时间”或“题目为空”，并记录剩余提示待后续完善。",
                  "project_impact": "实现成本较低，但运营可能需要多次修改才能成功发布，验收时要接受这个体验限制。",
                  "next_exit": "revise-local-and-continue: 先做单项缺失提示"
                },
                {
                  "id": "OPTION_D",
                  "label": "把失败处理拆成提示、补齐、再次发布三个小步骤",
                  "when_to_choose": "适合失败场景较多，产品希望单独审核每一步用户看到什么、点哪里、补完后如何继续。",
                  "consequence": "下一轮模型会拆出更短的失败处理子流程，并分别标明提示内容、返回位置和重新发布条件。",
                  "project_impact": "审核材料会更细，但后续 UI、测试和客服话术都能直接复用这些步骤。",
                  "next_exit": "split-flow: 拆分发布失败处理流程"
                }
              ]
            },
            {
              "id": "survey-draft-publish-audit-log",
              "label": "系统记录发布结果",
              "plain_summary": "系统保存谁在什么时候发布或被拦截。该记录用于追踪问题，无需产品经理确认。",
              "action_prompt": "系统/架构负责人确认审计记录保存方式；无需产品确认。",
              "review_layer": "system_arch",
              "review_level": "system_arch",
              "owner": "系统架构负责人",
              "node_kind": "system",
              "source_ref": "architecture.md#审计记录"
            }
          ],
          "edges": [
            {
              "from": "survey-draft-publish-start",
              "to": "survey-draft-publish-edit",
              "label": "录入内容"
            },
            {
              "from": "survey-draft-publish-edit",
              "to": "survey-draft-publish-readiness",
              "label": "准备发布"
            },
            {
              "from": "survey-draft-publish-readiness",
              "to": "survey-draft-publish-release",
              "label": "符合条件"
            },
            {
              "from": "survey-draft-publish-readiness",
              "to": "survey-draft-publish-gap",
              "label": "信息不足"
            },
            {
              "from": "survey-draft-publish-release",
              "to": "survey-draft-publish-audit-log",
              "label": "记录结果"
            },
            {
              "from": "survey-draft-publish-gap",
              "to": "survey-draft-publish-edit",
              "label": "补齐后重试"
            }
          ],
          "trace_notes": [
            "此示例把必须人工决定的点控制在两个，便于集中审核。"
          ]
        },
        {
          "id": "survey-response-close",
          "title": "问卷回收和关闭",
          "summary": "这个流程说明问卷发布后如何接收答卷，并在到期或人工关闭后停止继续回收。",
          "source_path": "specs/ask-survey/flows/survey-response-close.md",
          "item_type": "flowchart",
          "nodes": [
            {
              "id": "survey-response-open",
              "label": "用户提交答卷",
              "plain_summary": "问卷处于开放状态时，目标用户可以填写并提交答卷。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#答卷提交"
            },
            {
              "id": "survey-response-duplicate",
              "label": "重复提交怎么处理",
              "plain_summary": "同一用户是否允许重复提交，会影响统计结果和用户体验。",
              "action_prompt": "请选择重复提交的业务规则。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "prd.md#重复提交",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "每人只保留一份有效答卷，后一次更新前一次",
                  "when_to_choose": "适合满意度、投票、报名等一人只能有一个最终答案的问卷，同时允许用户发现填错后修改。",
                  "consequence": "下一轮模型会把重复提交写成“更新原答卷”，并要求记录更新时间，统计只读取最新有效版本。",
                  "project_impact": "统计结果最稳定，但开发要识别提交人并处理修改记录，测试也要覆盖重复提交后的计数变化。",
                  "next_exit": "continue: 按一人一份且可更新设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "按问卷类型区分规则，先补分类再继续",
                  "when_to_choose": "适合 ASK 后续既有投票类问卷，也有周期反馈类问卷，无法用一条规则覆盖所有情况。",
                  "consequence": "下一轮模型会暂停当前重复提交规则，先让产品补充问卷类型分类和每类默认处理方式。",
                  "project_impact": "短期会增加一次产品决策，但后续扩展不同问卷类型时不容易推翻已有设计。",
                  "next_exit": "needs-decision: 补充问卷类型与重复提交规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "每人只允许提交一次，提交后不能再改",
                  "when_to_choose": "适合考试、正式投票或合规要求较高的场景，业务不希望用户反复修改答案。",
                  "consequence": "下一轮模型会加入重复提交拦截和清楚的提示文案，告诉用户已经提交过，不能再次修改。",
                  "project_impact": "规则最严格，统计和审计简单，但用户填错后的客服处理压力会上升，需要产品确认例外处理办法。",
                  "next_exit": "revise-local-and-continue: 改为一次提交后锁定"
                },
                {
                  "id": "OPTION_D",
                  "label": "允许多次提交，并把每次提交都作为独立答卷",
                  "when_to_choose": "适合每日反馈、巡检记录、培训打卡等同一个人可能多次提供有效信息的问卷。",
                  "consequence": "下一轮模型会把统计口径改成按提交次数计算，并在报表说明里写清一个人可以有多份答卷。",
                  "project_impact": "流程更灵活，但统计解释、导出字段和验收样例都要按多份答卷重新设计。",
                  "next_exit": "continue: 按多份答卷继续设计"
                }
              ]
            },
            {
              "id": "survey-response-count",
              "label": "统计回收数量",
              "plain_summary": "系统展示已提交答卷数量，帮助运营判断是否需要提醒用户继续填写。",
              "review_layer": "business",
              "review_level": "key_step",
              "owner": "产品经理",
              "node_kind": "state",
              "source_ref": "prd.md#回收统计"
            },
            {
              "id": "survey-response-close",
              "label": "到期或人工关闭",
              "plain_summary": "问卷到截止时间，或运营手动关闭后，不再接收新答卷。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#问卷关闭"
            },
            {
              "id": "survey-response-archive",
              "label": "系统归档答卷",
              "plain_summary": "系统归档关闭后的答卷数据，供报表和后续导出使用；无需产品确认。",
              "action_prompt": "系统/架构负责人确认归档方式和数据留存策略；无需产品确认。",
              "review_layer": "system_arch",
              "review_level": "system_arch",
              "owner": "系统架构负责人",
              "node_kind": "system",
              "source_ref": "architecture.md#答卷归档"
            }
          ],
          "edges": [
            {
              "from": "survey-response-open",
              "to": "survey-response-duplicate",
              "label": "收到答卷"
            },
            {
              "from": "survey-response-duplicate",
              "to": "survey-response-count",
              "label": "答卷有效"
            },
            {
              "from": "survey-response-count",
              "to": "survey-response-close",
              "label": "继续回收或到期"
            },
            {
              "from": "survey-response-close",
              "to": "survey-response-archive",
              "label": "停止回收"
            }
          ]
        }
      ]
    },
    {
      "id": "document-management",
      "title": "文档管理",
      "summary": "处理文档上传、解析和问卷关联。产品经理主要确认文档解析失败时是否允许继续发布。",
      "review_layer": "mixed",
      "must_confirm_total": 1,
      "diagrams": [
        {
          "id": "document-link-survey",
          "title": "文档上传并关联问卷",
          "summary": "这个流程说明运营上传说明文档后，系统如何解析文件并把它挂到对应问卷上。",
          "source_path": "specs/ask-survey/flows/document-link-survey.md",
          "item_type": "flowchart",
          "nodes": [
            {
              "id": "document-link-upload",
              "label": "运营上传说明文档",
              "plain_summary": "运营把制度说明、培训材料或答题参考上传到系统。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#文档上传"
            },
            {
              "id": "document-link-parse",
              "label": "系统解析文档内容",
              "plain_summary": "系统提取标题、页数和可检索文本，供问卷关联和后续搜索使用；无需产品确认。",
              "action_prompt": "系统/架构负责人确认解析队列和失败重试；无需产品确认。",
              "review_layer": "system_arch",
              "review_level": "system_arch",
              "owner": "系统架构负责人",
              "node_kind": "system",
              "source_ref": "architecture.md#文档解析"
            },
            {
              "id": "document-link-failure-policy",
              "label": "解析失败是否允许继续发布",
              "plain_summary": "如果文档解析失败，问卷还能不能带着原文件继续发布，需要产品明确。",
              "action_prompt": "请选择文档解析失败时的业务策略。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "prd.md#文档关联",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "允许问卷发布，但明确提示文档暂时不能搜索",
                  "when_to_choose": "适合文档只是辅助说明，用户能下载或查看原文件即可，不要求马上按文档内容搜索。",
                  "consequence": "下一轮模型会保留发布路径，并在流程里写清原文件可见、内容检索暂不可用、后台可继续重试解析。",
                  "project_impact": "问卷发布不容易被技术处理卡住，但 UI 和验收必须清楚展示文档状态，避免用户误以为搜索可用。",
                  "next_exit": "continue: 按可发布但提示解析状态设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补文档使用场景，再决定失败策略",
                  "when_to_choose": "适合 PRD 还没说明文档到底是附件、必读材料还是搜索资料，当前无法判断失败后该不该拦截。",
                  "consequence": "下一轮模型会生成产品待确认项，要求补充文档用途、用户是否必须阅读、解析失败时谁负责处理。",
                  "project_impact": "会延后文档关联开发授权，但能避免把辅助附件误做成强制依赖，或把必读文档误放行。",
                  "next_exit": "needs-decision: 补充文档用途和失败策略"
                },
                {
                  "id": "OPTION_C",
                  "label": "文档是必读材料时禁止发布，普通附件允许发布",
                  "when_to_choose": "适合有些问卷必须依赖说明文档，有些问卷只是附带参考资料的情况。",
                  "consequence": "下一轮模型会增加文档重要性判断：必读文档解析失败就拦截发布，普通附件失败只显示提醒。",
                  "project_impact": "业务风险控制更细，但需要产品补充文档类型，开发和测试也要覆盖两种发布路径。",
                  "next_exit": "revise-local-and-continue: 增加文档重要性分层规则"
                },
                {
                  "id": "OPTION_D",
                  "label": "解析失败就禁止发布，直到换文件或解析成功",
                  "when_to_choose": "适合问卷填写必须依赖文档内容，例如政策阅读确认、考试材料或合同说明。",
                  "consequence": "下一轮模型会把文档解析状态写入发布前强制检查，失败时要求运营换文件或等待重试成功。",
                  "project_impact": "用户拿到错误材料的风险最低，但发布会依赖解析服务稳定性，排期要预留失败重试和提示设计。",
                  "next_exit": "continue: 发布前强制检查文档解析状态"
                }
              ]
            },
            {
              "id": "document-link-attach",
              "label": "关联到问卷",
              "plain_summary": "文档通过规则后，运营可以把它作为问卷说明材料展示给填写用户。",
              "review_layer": "business",
              "review_level": "key_step",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#文档关联"
            },
            {
              "id": "document-link-visible",
              "label": "填写页显示文档入口",
              "plain_summary": "用户填写问卷时能看到文档入口，知道在哪里查看补充说明。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "ui",
              "source_ref": "prd.md#填写页说明"
            }
          ],
          "edges": [
            {
              "from": "document-link-upload",
              "to": "document-link-parse",
              "label": "上传成功"
            },
            {
              "from": "document-link-parse",
              "to": "document-link-failure-policy",
              "label": "解析失败"
            },
            {
              "from": "document-link-parse",
              "to": "document-link-attach",
              "label": "解析成功"
            },
            {
              "from": "document-link-failure-policy",
              "to": "document-link-attach",
              "label": "允许继续"
            },
            {
              "from": "document-link-attach",
              "to": "document-link-visible",
              "label": "保存关联"
            }
          ]
        }
      ]
    },
    {
      "id": "tenant-management",
      "title": "租户管理",
      "summary": "处理租户开通、角色分配和停用。示例中大部分规则已从 PRD 得到确认，只保留系统权限校验给架构侧。",
      "review_layer": "mixed",
      "must_confirm_total": 0,
      "diagrams": [
        {
          "id": "tenant-open-close",
          "title": "租户开通和停用",
          "summary": "这个流程说明管理员如何开通租户，并在租户停用后停止其继续创建问卷。",
          "source_path": "specs/ask-survey/flows/tenant-open-close.md",
          "item_type": "flowchart",
          "nodes": [
            {
              "id": "tenant-open-create",
              "label": "管理员创建租户",
              "plain_summary": "平台管理员录入租户名称、联系人和启用时间。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "flow",
              "source_ref": "prd.md#租户创建"
            },
            {
              "id": "tenant-open-role",
              "label": "分配租户管理员",
              "plain_summary": "租户管理员负责本租户内的问卷和文档管理。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "role",
              "source_ref": "prd.md#租户角色"
            },
            {
              "id": "tenant-open-permission",
              "label": "系统隔离租户数据",
              "plain_summary": "系统确保一个租户看不到另一个租户的问卷、文档和答卷；无需产品确认。",
              "action_prompt": "系统/架构负责人确认租户隔离方案；无需产品确认。",
              "review_layer": "system_arch",
              "review_level": "system_arch",
              "owner": "系统架构负责人",
              "node_kind": "system",
              "source_ref": "architecture.md#租户隔离"
            },
            {
              "id": "tenant-open-disable",
              "label": "停用后禁止新操作",
              "plain_summary": "租户停用后不能再创建问卷或上传文档，历史数据按约定保留。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "state",
              "source_ref": "prd.md#租户停用"
            }
          ],
          "edges": [
            {
              "from": "tenant-open-create",
              "to": "tenant-open-role",
              "label": "创建成功"
            },
            {
              "from": "tenant-open-role",
              "to": "tenant-open-permission",
              "label": "角色生效"
            },
            {
              "from": "tenant-open-permission",
              "to": "tenant-open-disable",
              "label": "租户停用时"
            }
          ]
        }
      ]
    }
  ],
  "schema_notes": [
    "示例只用于查看确认页效果，不代表真实 ASK 项目已经完成授权。"
  ]
};
