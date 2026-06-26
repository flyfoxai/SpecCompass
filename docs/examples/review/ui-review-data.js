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
              "plain_summary": "发布会影响真实用户是否能填写问卷，因此页面需要让运营在发布前明确看到检查结果。",
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
                  "label": "使用右侧抽屉展示检查结果并确认发布",
                  "when_to_choose": "如果希望运营在不离开列表的情况下完成发布，同时看清风险，应选择这个。",
                  "consequence": "发布按钮打开抽屉，抽屉里展示检查结果和最终发布按钮。",
                  "project_impact": "开发需要实现抽屉和检查摘要，误发布风险较低。",
                  "next_exit": "continue: 按发布抽屉继续设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "暂不决定发布确认方式",
                  "when_to_choose": "如果发布前到底要展示哪些检查结果还没有定，先选这个。",
                  "consequence": "发布操作界面不能进入开发授权。",
                  "project_impact": "会延后问卷发布页开发，需要补充产品决策。",
                  "next_exit": "needs-decision: 产品经理确认发布前界面规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "点击发布后直接上线",
                  "when_to_choose": "只有在发布风险非常低、运营已在线下确认时才考虑。",
                  "consequence": "页面更简单，但用户容易误发布。",
                  "project_impact": "开发成本低，业务事故风险明显升高。",
                  "next_exit": "continue: 移除发布前抽屉"
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
                  "label": "管理员显示租户筛选，普通运营不显示",
                  "when_to_choose": "如果只有平台管理员需要跨租户查看，选择这个最清晰。",
                  "consequence": "不同角色看到的筛选项不同，页面更贴近职责。",
                  "project_impact": "需要开发按角色显示组件，但普通运营界面更简洁。",
                  "next_exit": "continue: 按角色展示租户筛选",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "暂不决定筛选展示规则",
                  "when_to_choose": "如果角色权限还没有定下来，可以先暂停这个界面决策。",
                  "consequence": "列表顶部筛选区域不能进入开发授权。",
                  "project_impact": "会影响列表布局和权限展示，需要补充角色规则。",
                  "next_exit": "needs-decision: 产品经理确认租户筛选规则"
                },
                {
                  "id": "OPTION_C",
                  "label": "所有人都显示租户筛选",
                  "when_to_choose": "如果所有用户都需要跨租户工作，可以选择这个。",
                  "consequence": "界面一致，但普通运营可能看到无用筛选项。",
                  "project_impact": "开发较简单，但日常操作噪音更大。",
                  "next_exit": "continue: 所有角色显示租户筛选"
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
              "plain_summary": "文档解析失败不一定代表上传失败，页面要说清楚原文件是否还可用。",
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
                  "label": "说明原文件可用，但暂不能搜索内容",
                  "when_to_choose": "如果业务允许文档继续作为附件使用，应选择这个。",
                  "consequence": "运营知道可以继续关联文档，但不要期待内容搜索马上可用。",
                  "project_impact": "开发需要区分上传成功和解析失败两个状态，用户理解成本低。",
                  "next_exit": "continue: 按清晰失败提示继续设计",
                  "recommended": true
                },
                {
                  "id": "OPTION_B",
                  "label": "暂不决定失败文案",
                  "when_to_choose": "如果文档失败后是否允许继续使用还没有定，选择这个。",
                  "consequence": "错误提示和关联按钮状态不能进入开发授权。",
                  "project_impact": "会影响文档页开发，需要补充业务规则。",
                  "next_exit": "needs-decision: 产品经理确认文档失败文案"
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
