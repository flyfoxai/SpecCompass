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
              "plain_summary": "本轮需要先拍板发布前必须检查哪些内容，否则 UI、开发和验收会按猜测推进，可能导致问卷误发布。",
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
                  "consequence": "模型后续把题目、回收范围和截止时间写入发布前拦截规则，并保留“缺什么就提示什么”的修复路径。",
                  "next_exit": "continue: 写入三项发布前强制校验",
                  "recommended": true,
                  "benefit": "发布门槛会一次说清，运营、开发和验收都能按题目、回收范围、截止时间三项检查推进，误发布风险最低。",
                  "cost": "开发范围会增加校验和提示，但统计口径、运营责任和验收标准最清楚，误发问卷的风险最低。",
                  "recommendation_reason": "推荐这条路，因为它覆盖了当前 PRD 里最容易导致误发布的三类信息，比先缩小校验范围更稳，也比拆流程更省审核和开发成本。"
                },
                {
                  "id": "OPTION_B",
                  "label": "先补产品决策，再决定发布前检查范围",
                  "consequence": "模型先生成待补问题清单，产品经理确认问卷类型、必填信息和例外情况前，不授权开发团队实现发布校验。",
                  "next_exit": "needs-decision: 补充发布前检查规则",
                  "benefit": "产品经理能先把不同问卷类型和必填门槛补清楚，后续流程、界面、开发和验收不会按猜测推进。",
                  "cost": "会延后发布流程开发，但能避免团队按错误规则实现，减少后续返工。 在产品经理补充决定前，相关流程、界面或开发任务会暂停，排期需要预留这次确认时间。"
                },
                {
                  "id": "OPTION_C",
                  "label": "只先固定题目完整性，发布范围由运营线下确认",
                  "consequence": "模型后续只把题目和选项完整性写成系统校验，并在确认文件里记录回收范围、截止时间暂由运营人工负责。",
                  "next_exit": "revise-local-and-continue: 缩小发布校验范围",
                  "benefit": "一期发布能力可以更快落地，开发先集中处理题目完整性，回收范围和截止时间由运营人工兜底。",
                  "cost": "开发速度更快，但后续容易出现发错人群或忘记关闭问卷的问题，运营培训和验收备注要写得更明确。 这种做法更快，但会把一部分风险交给运营培训、人工检查或后续补充测试。"
                },
                {
                  "id": "OPTION_D",
                  "label": "拆成内容校验和发布范围校验两个子流程",
                  "consequence": "模型后续拆出两个短流程：内容检查确认题目是否合格，投放检查确认发布对象和回收时间是否合格。",
                  "next_exit": "split-flow: 拆分发布前校验流程",
                  "benefit": "发布前责任会拆得更清楚，内容检查和投放检查各自独立，审核人更容易看懂每个子流程的入口、出口和责任人。",
                  "cost": "流程审核会更清楚，但开发和验收要多覆盖一次负责人分工，适合高风险或多角色发布场景。 审核材料、流程文件和验收点会增加，模型下一轮要分别维护这些子流程。"
                }
              ],
              "decision_background": "问卷一旦发布，填写人就能看到并提交答卷。发布前如果题目、回收范围或截止时间没检查清楚，后续统计、运营责任和用户通知都会受影响。",
              "decision_summary": "请决定发布前系统必须检查哪些内容，以及是否需要把复杂发布规则拆成更小的确认流程。"
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
              "plain_summary": "本轮需要先明确发布失败时怎么提示，否则发布失败页面、开发和测试会按笼统错误处理。",
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
                  "consequence": "模型后续把发布失败提示写成逐项清单，并把每个缺失项连接到问卷编辑页里的对应区域。",
                  "next_exit": "continue: 生成缺失项清单和返回编辑路径",
                  "recommended": true,
                  "benefit": "运营能一次看到所有缺失项，并直接回到对应位置修改，发布失败后的反复试错和沟通成本会降低。",
                  "cost": "提示设计和测试用例会多一些，但运营不需要反复试错，发布效率和客服解释成本都会更可控。",
                  "recommendation_reason": "推荐这条路，因为运营一次看到全部缺失项后最容易修正，虽然提示和测试多一些，但比单项报错更少反复试错。"
                },
                {
                  "id": "OPTION_B",
                  "label": "先补齐失败文案和责任边界，再授权开发",
                  "consequence": "模型先生成待确认问题，产品经理明确提示文案、责任人和缺失项优先级后，再继续改发布失败流程。",
                  "next_exit": "needs-decision: 补充发布失败提示规则",
                  "benefit": "产品经理能先定清提示文案、维护责任和缺失项优先级，后续界面、开发和验收不会按笼统错误处理。",
                  "cost": "发布体验开发会后移，但能避免错误提示太含糊，减少上线后运营和研发互相解释。 在产品经理补充决定前，相关流程、界面或开发任务会暂停，排期需要预留这次确认时间。"
                },
                {
                  "id": "OPTION_C",
                  "label": "只提示最影响发布的一项，先保证流程能跑通",
                  "consequence": "模型后续只保留一个最优先错误提示，例如“缺少截止时间”或“题目为空”，并把剩余提示列入后续产品补充清单。",
                  "next_exit": "revise-local-and-continue: 先做单项缺失提示",
                  "benefit": "一期实现范围更小，团队能先拦住最严重的误发布问题，让基础发布流程尽快跑通。",
                  "cost": "实现成本较低，但运营可能需要多次修改才能成功发布，验收时要接受这个体验限制。 这种做法更快，但会把一部分风险交给运营培训、人工检查或后续补充测试。"
                },
                {
                  "id": "OPTION_D",
                  "label": "把失败处理拆成提示、补齐、再次发布三个小步骤",
                  "consequence": "模型后续拆出提示、返回编辑、再次发布三个短流程，并分别标明提示内容、返回位置和重新发布条件。",
                  "next_exit": "split-flow: 拆分发布失败处理流程",
                  "benefit": "失败处理会被拆成提示、补齐、再次发布三个短步骤，UI、测试和客服话术都能复用这些清楚的步骤。",
                  "cost": "审核材料会更细，但后续 UI、测试和客服话术都能直接复用这些步骤。 审核材料、流程文件和验收点会增加，模型下一轮要分别维护这些子流程。"
                }
              ],
              "decision_background": "发布失败不是单纯报错，运营需要知道哪里缺材料、回到哪里补、补完后能不能继续发布。这里如果没定清楚，UI 和测试会按笼统错误处理。",
              "decision_summary": "请决定信息不足时给运营怎样的提示和返回路径，避免发布失败后不知道该补什么。"
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
              "plain_summary": "现在需要先定重复提交规则，否则统计口径、开发实现和测试样例都会按猜测推进。",
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
                  "consequence": "模型后续把重复提交写成“更新原答卷”，开发团队需要记录更新时间，统计只读取最新有效版本。",
                  "next_exit": "continue: 按一人一份且可更新设计",
                  "recommended": true,
                  "benefit": "统计口径最稳定，同一填写人只留下最新有效答案，同时保留用户填错后修改的空间。",
                  "cost": "统计结果最稳定，但开发要识别提交人并处理修改记录，测试也要覆盖重复提交后的计数变化。",
                  "recommendation_reason": "推荐这条路，因为大多数问卷需要稳定统计口径，同时保留修改入口能减少用户填错后的客服压力。"
                },
                {
                  "id": "OPTION_B",
                  "label": "按问卷类型区分规则，先补分类再继续",
                  "consequence": "模型先暂停重复提交规则，产品经理补充问卷类型分类和每类默认处理方式后再恢复流程设计。",
                  "next_exit": "needs-decision: 补充问卷类型与重复提交规则",
                  "benefit": "产品经理能先区分投票、报名、周期反馈等问卷类型，后续扩展不同回收规则时不容易推翻已有设计。",
                  "cost": "短期会增加一次产品决策，但后续扩展不同问卷类型时不容易推翻已有设计。 在产品经理补充决定前，相关流程、界面或开发任务会暂停，排期需要预留这次确认时间。"
                },
                {
                  "id": "OPTION_C",
                  "label": "每人只允许提交一次，提交后不能再改",
                  "consequence": "模型后续加入重复提交拦截和清楚提示文案，开发团队按“已提交，不能再次修改”处理用户再次提交。",
                  "next_exit": "revise-local-and-continue: 改为一次提交后锁定",
                  "benefit": "规则最简单，统计和审计最容易解释，正式投票、考试类问卷可以避免用户反复改答案。",
                  "cost": "规则最严格，统计和审计简单，但用户填错后的客服处理压力会上升，需要产品确认例外处理办法。"
                },
                {
                  "id": "OPTION_D",
                  "label": "允许多次提交，并把每次提交都作为独立答卷",
                  "consequence": "模型后续把统计口径改成按提交次数计算，并在报表说明里写清一个人可以有多份答卷。",
                  "next_exit": "continue: 按多份答卷继续设计",
                  "benefit": "问卷能支持每日反馈、巡检记录、培训打卡等多次有效提交的业务，回收数据不会被强行覆盖。",
                  "cost": "流程更灵活，但统计解释、导出字段和验收样例都要按多份答卷重新设计。"
                }
              ],
              "decision_background": "同一个填写人是否能多次提交，会直接改变回收数量、统计口径和后续导出解释。这个规则不先定，数据结果很容易被误读。",
              "decision_summary": "请决定同一填写人再次提交时是覆盖、禁止，还是按多份答卷处理。"
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
              "plain_summary": "本轮需要先明确解析失败是否拦截发布，否则文档状态页面、开发和验收会按猜测处理。",
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
                  "consequence": "模型后续保留发布路径，并在流程里写清原文件可见、内容检索暂不可用、后台可继续重试解析。",
                  "next_exit": "continue: 按可发布但提示解析状态设计",
                  "recommended": true,
                  "benefit": "问卷发布不会被文档解析服务卡住，用户仍能查看原文件，运营也能清楚知道内容搜索暂时不可用。",
                  "cost": "问卷发布不容易被技术处理卡住，但 UI 和验收必须清楚展示文档状态，避免用户误以为搜索可用。",
                  "recommendation_reason": "推荐这条路，因为它能在当前业务风险和交付成本之间取得更稳的平衡。"
                },
                {
                  "id": "OPTION_B",
                  "label": "先补文档使用场景，再决定失败策略",
                  "consequence": "模型先生成产品待确认项，产品经理补充文档用途、用户是否必须阅读、解析失败时谁负责处理后再继续。",
                  "next_exit": "needs-decision: 补充文档用途和失败策略",
                  "benefit": "产品经理能先定清文档是附件、必读材料还是搜索资料，后续不会把辅助材料误做成强制依赖。",
                  "cost": "会延后文档关联开发授权，但能避免把辅助附件误做成强制依赖，或把必读文档误放行。 在产品经理补充决定前，相关流程、界面或开发任务会暂停，排期需要预留这次确认时间。"
                },
                {
                  "id": "OPTION_C",
                  "label": "文档是必读材料时禁止发布，普通附件允许发布",
                  "consequence": "模型后续增加文档重要性判断：必读文档解析失败就拦截发布，普通附件失败只显示提醒。",
                  "next_exit": "revise-local-and-continue: 增加文档重要性分层规则",
                  "benefit": "文档风险控制更细，必读材料能拦截发布，普通附件又不会拖慢问卷上线。",
                  "cost": "业务风险控制更细，但需要产品补充文档类型，开发和测试也要覆盖两种发布路径。"
                },
                {
                  "id": "OPTION_D",
                  "label": "解析失败就禁止发布，直到换文件或解析成功",
                  "consequence": "模型后续把文档解析状态写入发布前强制检查，失败时要求运营换文件或等待重试成功。",
                  "next_exit": "continue: 发布前强制检查文档解析状态",
                  "benefit": "用户拿到错误或不可解析材料的风险最低，必须依赖文档内容的问卷可以获得最强保护。",
                  "cost": "用户拿到错误材料的风险最低，但发布会依赖解析服务稳定性，排期要预留失败重试和提示设计。"
                }
              ],
              "decision_background": "本轮需要先明确解析失败是否拦截发布，否则文档状态页面、开发和验收会按猜测处理。",
              "decision_summary": "请决定文档解析失败时，问卷是否还能发布，以及哪些场景必须拦截。"
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
