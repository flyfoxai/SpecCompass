window.SPECCOMPASS_REVIEW_DATA = {
  "schema_version": 1,
  "review_type": "ui",
  "artifact_path": "specs/ask-survey/ui/review/ui-review-data.json",
  "confirm_strategy": "batch",
  "batch_id": "ask-survey-ui-2026-06-25",
  "project": {
    "name": "ASK",
    "feature": "问卷与文档协同",
    "business_overview": "ASK UI 示例展示问卷列表、发布抽屉、文档入口和租户状态。确认页重点看页面上是否放对了信息、按钮和提示。",
    "review_goal": "让产品经理能直观看到主要页面长什么样，并确认少数会影响业务结果的界面选择。"
  },
  "source_snapshot": [
    {
      "path": "specs/ask-survey/ui/ui.md",
      "anchors": [
        "问卷列表",
        "发布抽屉",
        "文档入口",
        "租户状态"
      ],
      "semantic_scope": [
        "页面结构",
        "组件用途",
        "界面确认"
      ]
    }
  ],
  "modules": [
    {
      "id": "survey-ui",
      "title": "问卷管理界面",
      "summary": "展示运营每天使用最多的问卷列表和发布操作。审核重点是筛选、发布确认和状态提示是否足够清楚。",
      "review_layer": "business",
      "must_confirm_total": 2,
      "screens": [
        {
          "id": "survey-list-publish-drawer",
          "title": "问卷列表与发布抽屉",
          "summary": "左侧查看问卷列表，右侧在需要时打开发布抽屉。页面把高风险发布动作集中到右侧确认区，避免误操作。",
          "source_path": "specs/ask-survey/ui/survey-list-publish.md",
          "item_type": "screen",
          "screen_layout": "list_detail",
          "framework_approximation": "示例使用固定 renderer 近似展示；真实前端可按 PRD 选定框架实现。",
          "framework_notes": [
            "动态数量先用文字标注，不在确认页实现动画或真实计算。",
            "发布抽屉只展示结构和决策点，不模拟完整表单提交。"
          ],
          "screen_regions": [
            {
              "id": "survey-list-top",
              "title": "顶部操作区",
              "purpose": "让运营快速搜索问卷，并创建新的问卷草稿。",
              "position": "top",
              "source_ref": "ui.md#问卷列表顶部",
              "components": [
                {
                  "id": "survey-search",
                  "kind": "search",
                  "label": "搜索问卷名称",
                  "purpose": "按问卷名称快速找到目标问卷。",
                  "source_ref": "ui.md#搜索"
                },
                {
                  "id": "survey-new-button",
                  "kind": "button",
                  "label": "新建问卷",
                  "purpose": "进入问卷草稿创建流程。",
                  "source_ref": "ui.md#新建问卷"
                },
                {
                  "id": "survey-tenant-filter",
                  "kind": "filter",
                  "label": "租户筛选",
                  "purpose": "平台管理员可以只看某个租户的问卷。",
                  "source_ref": "ui.md#租户筛选",
                  "decision_node_id": "ui-survey-tenant-filter"
                }
              ]
            },
            {
              "id": "survey-list-main",
              "title": "问卷列表",
              "purpose": "展示问卷名称、状态、回收数量和最近更新时间，帮助运营判断下一步操作。",
              "position": "main",
              "source_ref": "ui.md#问卷表格",
              "components": [
                {
                  "id": "survey-table",
                  "kind": "table",
                  "label": "问卷表格",
                  "purpose": "集中展示草稿、已发布、已关闭等问卷状态。",
                  "source_ref": "ui.md#问卷表格"
                },
                {
                  "id": "survey-response-count-note",
                  "kind": "dynamic-marker",
                  "label": "回收数量",
                  "purpose": "提示这里未来会显示实时回收数量。",
                  "source_ref": "ui.md#回收数量",
                  "state_ref": "survey-count-dynamic",
                  "future_behavior_note": "此处数字未来会按答卷提交情况自动更新。"
                },
                {
                  "id": "survey-publish-action",
                  "kind": "button",
                  "label": "发布",
                  "purpose": "打开右侧发布抽屉，要求运营完成发布前确认。",
                  "source_ref": "ui.md#发布按钮",
                  "decision_node_id": "ui-survey-publish-confirmation"
                }
              ]
            },
            {
              "id": "survey-publish-drawer",
              "title": "发布确认抽屉",
              "purpose": "在发布前集中展示检查结果、容易误发布的提醒和最终发布按钮。",
              "position": "right",
              "source_ref": "ui.md#发布抽屉",
              "components": [
                {
                  "id": "publish-check-summary",
                  "kind": "card",
                  "label": "发布前检查",
                  "purpose": "显示题目、回收范围和截止时间是否已填写。",
                  "source_ref": "ui.md#发布前检查",
                  "decision_node_id": "ui-survey-publish-confirmation"
                },
                {
                  "id": "publish-risk-badge",
                  "kind": "badge",
                  "label": "需重点确认",
                  "purpose": "提醒审核人这是会影响真实用户的高风险操作。",
                  "source_ref": "ui.md#发布风险"
                },
                {
                  "id": "publish-submit-button",
                  "kind": "button",
                  "label": "确认发布",
                  "purpose": "检查通过后将问卷发布给目标用户。",
                  "source_ref": "ui.md#确认发布",
                  "decision_node_id": "ui-survey-publish-confirmation"
                }
              ],
              "notes": [
                "发布动作不使用复杂弹窗，确认页只展示抽屉结构和必须确认点。"
              ]
            }
          ],
          "states": [
            {
              "id": "survey-list-default",
              "label": "默认状态",
              "state_type": "default",
              "plain_note": "列表展示最近更新的问卷，运营可以搜索、筛选和发布。",
              "source_ref": "ui.md#默认状态"
            },
            {
              "id": "survey-list-empty",
              "label": "暂无问卷",
              "state_type": "empty",
              "plain_note": "没有问卷时显示新建入口，不展示空表格。",
              "source_ref": "ui.md#空态"
            },
            {
              "id": "survey-count-dynamic",
              "label": "回收数量自动更新",
              "state_type": "dynamic_marker",
              "plain_note": "确认页只用文字说明，不实现实时刷新。",
              "source_ref": "ui.md#回收数量",
              "future_behavior_note": "此处数字未来会自动更新。"
            }
          ],
          "nodes": [
            {
              "id": "ui-survey-publish-confirmation",
              "label": "发布前是否必须二次确认",
              "plain_summary": "本轮需要先拍板发布前确认方式，否则页面布局、开发和验收会按猜测推进，可能增加误发布风险。",
              "action_prompt": "请选择发布前界面应该如何确认。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "ui.md#发布抽屉",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "用右侧发布抽屉展示检查结果，再让运营确认发布",
                  "when_to_choose": "适合运营在列表里处理多份问卷，同时发布动作风险较高，需要先看题目、范围和截止时间是否都准备好。",
                  "consequence": "下一轮模型会保留列表页，并把发布抽屉设计成检查摘要、发布前提醒和最终发布按钮三块内容。",
                  "project_impact": "界面比直接发布多一步，但误操作风险低，验收时可以清楚检查抽屉里的信息是否完整。",
                  "next_exit": "continue: 按发布抽屉继续设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补发布前要展示的信息，再决定抽屉或页面",
                  "when_to_choose": "适合产品还没有决定发布前必须让运营看到哪些内容，例如目标人群、通知方式或风险提醒。",
                  "consequence": "下一轮模型会暂停发布确认界面定稿，先生成待补清单，让产品明确发布前信息和确认文案。",
                  "project_impact": "会延后发布界面开发，但能避免先做抽屉后发现信息太多又改成页面。",
                  "next_exit": "needs-decision: 补充发布确认信息清单"
                },
                {
                  "id": "OPTION_C",
                  "label": "改成独立发布确认页，适合发布前要填写更多信息",
                  "when_to_choose": "适合发布前还要补充目标人群、通知方式、发布时间等信息，右侧抽屉空间不够用。",
                  "consequence": "下一轮模型会把发布动作从抽屉改成独立页面，并把检查结果、补充字段和确认按钮按步骤排布。",
                  "project_impact": "页面更清楚但操作路径更长，开发要多做一个页面，产品也要验收从列表跳转再返回的体验。",
                  "next_exit": "revise-local-and-continue: 改为独立发布确认页"
                },
                {
                  "id": "OPTION_D",
                  "label": "只保留轻量二次确认，不展示完整检查摘要",
                  "when_to_choose": "适合发布风险较低，检查规则已经在后台自动完成，运营只需要确认“我要发布”。",
                  "consequence": "下一轮模型会把抽屉缩小为简单确认区域，只显示问卷名称、发布对象摘要和确认按钮。",
                  "project_impact": "界面开发更快，但用户看不到完整风险清单，测试要确保后台拦截和错误提示足够可靠。",
                  "next_exit": "revise-local-and-continue: 简化为轻量发布确认"
                }
              ]
            },
            {
              "id": "ui-survey-tenant-filter",
              "label": "列表是否显示租户筛选",
              "plain_summary": "平台管理员可能同时管理多个租户，需要决定筛选是否直接出现在列表顶部。",
              "action_prompt": "请选择租户筛选的展示策略。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "ui.md#租户筛选",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "只给平台管理员显示租户筛选，普通运营不显示",
                  "when_to_choose": "适合普通运营只负责自己租户，而平台管理员需要跨租户查看问卷的权限结构。",
                  "consequence": "下一轮模型会把租户筛选放在列表顶部，但加上角色条件：管理员可见，普通运营界面隐藏。",
                  "project_impact": "页面对普通运营更干净，但开发和验收要覆盖不同角色看到不同控件。",
                  "next_exit": "continue: 按角色展示租户筛选",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补角色权限规则，再决定筛选放在哪里",
                  "when_to_choose": "适合当前还不清楚哪些角色能跨租户、普通运营是否可能临时管理多个租户。",
                  "consequence": "下一轮模型会暂停租户筛选界面定稿，先要求补充角色、可见租户范围和默认租户规则。",
                  "project_impact": "会影响列表顶部布局定稿，但能避免 UI 先做完后被权限规则推翻。",
                  "next_exit": "needs-decision: 补充租户筛选权限规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "所有角色都显示租户筛选，但普通运营默认只有一个租户",
                  "when_to_choose": "适合团队希望所有人看到一致界面，且普通运营未来可能被授权管理多个租户。",
                  "consequence": "下一轮模型会保留统一筛选控件，并写明普通运营通常只有一个可选租户，不能看到无权限数据。",
                  "project_impact": "实现和培训更统一，但普通运营会看到一个不常用控件，界面会稍微变重。",
                  "next_exit": "revise-local-and-continue: 所有角色显示租户筛选"
                },
                {
                  "id": "OPTION_D",
                  "label": "把租户筛选收进高级筛选，默认不占顶部空间",
                  "when_to_choose": "适合列表顶部已经有搜索、状态、时间等多个筛选项，不希望租户筛选抢占常用操作位置。",
                  "consequence": "下一轮模型会把租户筛选移到高级筛选区，并保留当前租户的文字提示，避免用户不知道自己正在看哪个租户。",
                  "project_impact": "主界面更简洁，但跨租户用户多点一次才能筛选，验收要关注高级筛选是否容易找到。",
                  "next_exit": "revise-local-and-continue: 租户筛选移入高级筛选"
                }
              ]
            },
            {
              "id": "ui-survey-count-marker",
              "label": "回收数量用动态标注说明",
              "plain_summary": "确认页不实现实时数字变化，只标出未来这里会自动更新。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "state",
              "source_ref": "ui.md#回收数量"
            }
          ],
          "edges": [
            {
              "from": "ui-survey-tenant-filter",
              "to": "ui-survey-publish-confirmation",
              "label": "找到目标问卷后发布"
            },
            {
              "from": "ui-survey-publish-confirmation",
              "to": "ui-survey-count-marker",
              "label": "发布后查看回收"
            }
          ],
          "trace_notes": [
            "UI 示例用 screen_regions 和 components 渲染中间预览，nodes 只负责右侧确认。"
          ]
        }
      ]
    },
    {
      "id": "document-ui",
      "title": "文档管理界面",
      "summary": "展示文档上传、解析状态和问卷关联入口。审核重点是解析失败时是否能被运营看懂。",
      "review_layer": "business",
      "must_confirm_total": 1,
      "screens": [
        {
          "id": "document-upload-status",
          "title": "文档上传与解析状态",
          "summary": "页面展示上传入口、解析状态和关联问卷按钮，让运营知道文档现在能不能使用。",
          "source_path": "specs/ask-survey/ui/document-upload-status.md",
          "item_type": "screen",
          "screen_layout": "dashboard",
          "screen_regions": [
            {
              "id": "document-upload-top",
              "title": "上传区",
              "purpose": "让运营上传说明文档，并看到文件格式要求。",
              "position": "top",
              "source_ref": "ui.md#文档上传",
              "components": [
                {
                  "id": "document-upload-button",
                  "kind": "button",
                  "label": "上传文档",
                  "purpose": "选择本地文档并提交解析。",
                  "source_ref": "ui.md#上传按钮"
                },
                {
                  "id": "document-format-note",
                  "kind": "text",
                  "label": "支持 PDF 和 Word",
                  "purpose": "提前告诉运营可上传的文件类型。",
                  "source_ref": "ui.md#格式说明"
                }
              ]
            },
            {
              "id": "document-status-main",
              "title": "解析状态",
              "purpose": "展示文档是否可搜索、是否解析失败，以及下一步怎么处理。",
              "position": "main",
              "source_ref": "ui.md#解析状态",
              "components": [
                {
                  "id": "document-status-card",
                  "kind": "card",
                  "label": "文档解析结果",
                  "purpose": "告诉运营文档能否被搜索和关联到问卷。",
                  "source_ref": "ui.md#解析结果",
                  "decision_node_id": "ui-document-failure-message"
                },
                {
                  "id": "document-link-button",
                  "kind": "button",
                  "label": "关联到问卷",
                  "purpose": "把文档作为问卷说明材料。",
                  "source_ref": "ui.md#关联问卷"
                }
              ]
            }
          ],
          "states": [
            {
              "id": "document-parse-loading",
              "label": "解析中",
              "state_type": "loading",
              "plain_note": "上传后短时间内显示正在解析，避免运营重复上传。",
              "source_ref": "ui.md#解析中"
            },
            {
              "id": "document-parse-error",
              "label": "解析失败",
              "state_type": "error",
              "plain_note": "解析失败时说明原文件仍已保存，并提示是否可以继续关联问卷。",
              "source_ref": "ui.md#解析失败"
            }
          ],
          "nodes": [
            {
              "id": "ui-document-failure-message",
              "label": "解析失败提示怎么写",
              "plain_summary": "现在需要先定解析失败提示，否则页面文案、开发和测试会混淆上传失败与解析失败。",
              "action_prompt": "请选择解析失败时的提示方式。",
              "review_layer": "business",
              "review_level": "must_confirm",
              "owner": "产品经理",
              "node_kind": "human_judgment",
              "source_ref": "ui.md#解析失败",
              "recommended_option": "OPTION_A",
              "options": [
                {
                  "id": "OPTION_A",
                  "label": "提示原文件还能用，但内容搜索暂时不可用",
                  "when_to_choose": "适合文档作为附件或说明材料，用户只要能打开原文件就能继续完成问卷相关工作。",
                  "consequence": "下一轮模型会把失败状态写成两句话：上传成功、解析失败；原文件可查看，搜索和内容引用暂不可用。",
                  "project_impact": "用户最容易理解当前状态，开发需要区分“上传失败”和“解析失败”两种提示。",
                  "next_exit": "continue: 按清晰失败提示继续设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "先补文档失败后的业务规则，再写界面文案",
                  "when_to_choose": "适合产品还没决定解析失败后原文件是否可用、是否允许继续关联、谁负责处理失败。",
                  "consequence": "下一轮模型会先生成待补问题，不再把失败文案定死，等业务规则明确后再更新 UI 数据。",
                  "project_impact": "会延后文档页细节开发，但能避免提示文案和真实业务规则不一致。",
                  "next_exit": "needs-decision: 补充文档解析失败后的业务规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "突出重试入口，让运营先重新上传或稍后重试",
                  "when_to_choose": "适合解析失败多数是临时问题，业务更希望运营尽快修复，而不是继续使用失败状态的文档。",
                  "consequence": "下一轮模型会把重试按钮放在失败提示旁边，并弱化继续关联入口，提示运营优先处理文档。",
                  "project_impact": "界面行动更明确，但如果原文件本来可以继续使用，用户可能误以为必须修好解析才能下一步。",
                  "next_exit": "revise-local-and-continue: 强化重试入口"
                },
                {
                  "id": "OPTION_D",
                  "label": "解析失败时禁止关联到问卷，并说明原因",
                  "when_to_choose": "适合问卷必须依赖文档内容，例如答题前必须阅读材料或系统要引用文档内容。",
                  "consequence": "下一轮模型会把关联按钮置为不可用，并在提示中说明必须换文件或等待解析成功后才能关联。",
                  "project_impact": "业务风险最低，但文档处理会成为发布前卡点，验收要覆盖失败、重试成功和换文件三种状态。",
                  "next_exit": "revise-local-and-continue: 解析失败时禁用关联"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "tenant-ui",
      "title": "租户管理界面",
      "summary": "展示租户列表、启停状态和管理员分配入口。示例中没有必须人工决策的界面点。",
      "review_layer": "business",
      "must_confirm_total": 0,
      "screens": [
        {
          "id": "tenant-list-status",
          "title": "租户列表与状态",
          "summary": "页面帮助平台管理员查看租户是否启用，以及谁负责该租户。",
          "source_path": "specs/ask-survey/ui/tenant-list-status.md",
          "item_type": "screen",
          "screen_layout": "dashboard",
          "screen_regions": [
            {
              "id": "tenant-main",
              "title": "租户列表",
              "purpose": "集中查看租户名称、状态、管理员和最近更新时间。",
              "position": "main",
              "source_ref": "ui.md#租户列表",
              "components": [
                {
                  "id": "tenant-table",
                  "kind": "table",
                  "label": "租户表格",
                  "purpose": "列出所有租户及其启停状态。",
                  "source_ref": "ui.md#租户表格"
                },
                {
                  "id": "tenant-status-badge",
                  "kind": "badge",
                  "label": "启用/停用",
                  "purpose": "用状态标记提醒管理员租户是否可以继续创建问卷。",
                  "source_ref": "ui.md#租户状态"
                },
                {
                  "id": "tenant-admin-button",
                  "kind": "button",
                  "label": "分配管理员",
                  "purpose": "为租户选择负责问卷和文档管理的人。",
                  "source_ref": "ui.md#分配管理员"
                }
              ]
            }
          ],
          "states": [
            {
              "id": "tenant-no-permission",
              "label": "无权限",
              "state_type": "permission",
              "plain_note": "没有平台管理权限时，不展示租户管理入口。",
              "source_ref": "ui.md#租户权限"
            }
          ],
          "nodes": [
            {
              "id": "ui-tenant-status-visible",
              "label": "租户状态清楚展示",
              "plain_summary": "租户启用或停用已由 PRD 确认，界面只需要清楚显示状态。",
              "review_layer": "business",
              "review_level": "verified",
              "owner": "产品经理",
              "node_kind": "ui",
              "source_ref": "ui.md#租户状态"
            }
          ]
        }
      ]
    }
  ],
  "schema_notes": [
    "示例用于验证 UI review data 与 flow review data 的差异：UI 中间区域由 screen_regions 和 components 生成。"
  ]
};
