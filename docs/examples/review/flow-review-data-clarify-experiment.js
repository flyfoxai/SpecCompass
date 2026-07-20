(() => {
  const baseData = window.SPECCOMPASS_REVIEW_DATA;
  const data = JSON.parse(JSON.stringify(baseData || {}));
  if (!data || !Array.isArray(data.modules)) {
    window.SPECCOMPASS_REVIEW_DATA = data;
    return;
  }

  data.artifact_path = "docs/examples/review/flow-review-data-clarify-experiment.json";
  data.batch_id = "ask-survey-flow-clarify-experiment-2026-07-01";
  data.project = {
    ...data.project,
    business_overview:
      "这是一个实验版 flow 审核样例，用来比较 /sp.clarify 风格的决策选项是否更容易让产品经理拍板。旧规则和正式示例没有被覆盖。",
    review_goal:
      "检查每个必须确认点是否说清楚了背景、要拍的板、可选出口、后续谁处理，以及选择对开发、UI、测试和上线节奏的影响。"
  };
  data.schema_notes = [
    ...(data.schema_notes || []),
    "clarify-experiment: 仅用于人工检查新选项质量；不代表正式方法论已经替换旧规则。"
  ];

  const replacements = {
    "survey-draft-publish-readiness": {
      label: "发布前要拦住哪些问题",
      plain_summary:
        "这是问卷从草稿变成可填写前的一道门。现在要决定系统必须拦住哪些明显问题，否则运营可能把题目不完整、对象不清或截止时间缺失的问卷发出去。",
      action_prompt:
        "请直接定发布前必须检查到什么程度。这个决定会影响发布流程、页面提示、测试样例和运营培训口径。",
      recommended_option: "OPTION_A",
      options: [
        {
          id: "OPTION_A",
          label: "三项缺一不可：题目、发布对象、截止时间",
          when_to_choose:
            "适合 ASK 的问卷已经会发给真实用户，运营一旦选错对象或忘记截止时间，回收结果就很难补救。这里把三项都当成发布前必须过的门。",
          consequence:
            "模型把三项写进发布拦截规则。开发团队按“缺哪项就提示哪项”实现，测试团队补题目缺失、发布对象缺失、截止时间缺失三组样例。",
          project_impact:
            "这条作为默认推荐。相比只检查题目，它更能防住误发布；相比先拆很多问卷类型，它又能更快进入开发。UI 提示会多一点，但产品、运营和测试会使用同一套发布口径，返工风险最低。",
          next_exit: "continue: 写入题目、发布对象、截止时间三项发布门槛",
          recommended: true
        },
        {
          id: "OPTION_B",
          label: "问卷类型和例外场景先补清",
          when_to_choose:
            "适合 PRD 还没说清投票、报名、满意度调研是不是走不同发布规则，也没说测试问卷、匿名问卷这类例外能不能放宽要求。",
          consequence:
            "模型先不授权开发发布检查。产品经理需要补问卷类型、每类必填信息和例外处理；发布校验、发布页提示和验收样例先暂停。这个“问卷类型”决定也要给重复提交规则复用，不要在后面再拍一遍相互冲突的板。",
          project_impact:
            "开发排期会后移，但能避免把一种问卷的规则套到所有问卷上。代价是多一次产品拍板，收益是后续新增问卷类型时不容易推翻发布规则。",
          next_exit: "needs-decision: 产品经理补充问卷类型和发布门槛"
        },
        {
          id: "OPTION_C",
          label: "一期只卡题目完整，投放靠运营清单",
          when_to_choose:
            "适合一期只想先跑通创建和发布，团队也接受运营在系统外用检查清单确认发布对象和截止时间。",
          consequence:
            "模型只把题目和选项完整性做成系统拦截，发布对象和截止时间写进运营检查说明，由运营在发布前人工确认。",
          project_impact:
            "开发和 UI 工作量最小，上线会更快；代价是发错对象或忘记截止时间的风险转给运营，培训材料和验收备注必须写清楚，否则后续很难追责。",
          next_exit: "revise-local-and-continue: 缩小一期发布检查范围"
        },
        {
          id: "OPTION_D",
          label: "按角色拆成内容检查和投放检查",
          when_to_choose:
            "适合发布动作已经涉及两个角色：内容负责人看题目是否能让用户看懂，运营负责人看发布对象和回收时间是否正确。",
          consequence:
            "模型拆成两条短流程：一条给内容负责人确认题目和选项是否合格，另一条给运营负责人确认投放对象和回收时间是否合格。发布失败后的提示和补齐路径仍由下一组确认点单独决定。",
          project_impact:
            "审核材料会变多，但每个审核人只看自己负责的部分。适合复杂项目；如果只是一期小范围试用，这个选择会增加流程、UI 和测试成本。",
          next_exit: "split-flow: 拆分内容检查和投放检查"
        }
      ]
    },
    "survey-draft-publish-gap": {
      label: "发布失败时怎么让运营补齐",
      plain_summary:
        "这一步只处理已经被系统拦住的发布问题：运营看到什么、回到哪里补、补完后怎么继续。它不负责决定哪些问题必须拦截；拦截范围要看上一组发布前检查的选择。",
      action_prompt:
        "请定发布失败后怎么提示、怎么返回修改、怎么再次发布。这个选择会影响失败分支、页面提示、测试样例和运营处理效率。",
      recommended_option: "OPTION_A",
      options: [
        {
          id: "OPTION_A",
          label: "缺项清单一次列全，并跳回编辑位置",
          when_to_choose:
            "适合运营需要一次看懂所有问题的场景。比如题目说明、发布对象和截止时间同时缺失，系统不要让运营改一处、发布一次、再看到下一处错误。",
          consequence:
            "模型把发布失败提示写成缺项清单。开发团队把每个缺项连接到对应编辑区，测试团队覆盖多项同时缺失和补齐后再次发布。",
          project_impact:
            "这条更适合一期落地：相比只提示第一项，运营少走弯路；相比先暂停补文案，它能更快形成可验收页面。UI 和测试工作会增加，但发布失败的解释成本最低。",
          next_exit: "continue: 生成缺项清单和返回编辑路径",
          recommended: true
        },
        {
          id: "OPTION_B",
          label: "失败文案和拦截边界先由产品补清",
          when_to_choose:
            "适合团队还没说清哪些缺项必须系统拦截、哪些只提醒运营，或者错误文案到底由产品、运营还是客服维护。",
          consequence:
            "模型生成待确认清单。产品经理需要补缺项优先级、提示文案和人工处理口径；发布失败页、返回编辑位置和验收样例先暂停。",
          project_impact:
            "开发会延后，但能避免上线后出现“系统说失败，但没人知道该补什么”的情况。测试不会提前按错误口径写用例，运营培训也不会被返工。",
          next_exit: "needs-decision: 产品经理补充失败文案和责任边界"
        },
        {
          id: "OPTION_C",
          label: "最严重缺项先提示，其他缺项后续补",
          when_to_choose:
            "适合一期时间紧，只想先防住最严重的问题，比如题目为空或没有发布对象，团队可以接受运营多改几次才发布成功。",
          consequence:
            "模型只保留一个最高优先级错误提示。开发团队按固定顺序先拦最严重缺项；产品经理把剩余缺项写进二期发布体验清单，明确负责人和补做时间，不让它变成没人接的尾巴。",
          project_impact:
            "开发更快、页面更简单；代价是运营可能反复试错，上线说明要明确这是一期体验限制，否则产品验收时容易被认为提示不完整。",
          next_exit: "revise-local-and-continue: 先做单项阻断提示"
        },
        {
          id: "OPTION_D",
          label: "失败处理拆成看什么和怎么改两段",
          when_to_choose:
            "适合失败场景很多，但审核人不想一次看完所有细节。先分清两件事：运营到底看到哪些失败信息，以及运营从哪里改完再发布。",
          consequence:
            "模型拆成两条短流程：一条确认失败信息展示规则，也就是运营能看懂什么；另一条确认补救路径，也就是怎么返回编辑、怎么重新发布。每条短流程都单独列确认点。",
          project_impact:
            "前期审核更慢，但 UI、测试和运营培训可以直接复用这两条路径。适合失败分支多的项目；如果只是快速验证一期闭环，这个选择会增加审核和页面设计成本。",
          next_exit: "split-flow: 拆分发布失败处理流程"
        }
      ]
    },
    "survey-response-duplicate": {
      label: "同一个人能不能重复提交",
      plain_summary:
        "这一步决定同一个用户第二次提交答卷时，系统是覆盖、拒绝，还是当成新的答卷。现在必须先定，否则统计数量和报表口径会不一致。",
      action_prompt:
        "请定同一个人再次提交时系统怎么处理。这个决定会直接影响回收流程、统计口径、提示文案和测试样例。",
      recommended_option: "OPTION_A",
      options: [
        {
          id: "OPTION_A",
          label: "一人一份，后一次覆盖前一次",
          when_to_choose:
            "适合满意度、报名、投票这类一人只有一个最终答案的问卷，同时也允许用户发现填错后重新提交一次。",
          consequence:
            "模型把重复提交写成“更新原答卷”。开发团队记录最后修改时间，报表只统计最后一份有效答卷，测试团队验证第二次提交后总数不增加。",
          project_impact:
            "这条更适合普通问卷。它比提交后锁死更友好，也比多次都计数更容易解释统计结果。开发需要识别提交人，但运营看到的回收数量最稳定。",
          next_exit: "continue: 按最后一份有效答卷设计",
          recommended: true
        },
        {
          id: "OPTION_B",
          label: "问卷类型先分清，再定重复提交规则",
          when_to_choose:
            "适合 ASK 后续既有一次性投票，也有每日反馈、巡检记录或培训打卡，一条重复提交规则明显不够用。",
          consequence:
            "模型暂停重复提交规则。产品经理需要补充问卷类型，以及每类默认按覆盖、拦截还是新增处理；回收统计、导出字段和重复提交提示先暂停。如果发布前检查已经选择了“问卷类型先补清”，这里要复用同一份分类，不要另起一套。",
          project_impact:
            "开发会延后，但能避免现在随便定一条规则，后面为了每日反馈或打卡再推翻统计和报表设计。代价是产品需要多补一轮分类决策。",
          next_exit: "needs-decision: 产品经理补充问卷类型和重复提交规则"
        },
        {
          id: "OPTION_C",
          label: "提交后锁定，第二次直接拦截",
          when_to_choose:
            "适合考试、正式投票或合规要求较高的问卷，业务不希望用户提交后再改答案，也不希望运营解释哪次答案有效。",
          consequence:
            "模型加入重复提交拦截和提示文案。开发团队按已提交状态拒绝第二次提交，产品经理需要说明填错后的人工处理办法。",
          project_impact:
            "统计和审计最简单；代价是用户填错后只能找人工处理，客服和运营压力会上升。适合严肃问卷，不适合普通满意度调研。",
          next_exit: "revise-local-and-continue: 改为一次提交后锁定"
        },
        {
          id: "OPTION_D",
          label: "多次提交都计入回收结果",
          when_to_choose:
            "适合每日反馈、巡检打卡、培训签到这类场景。同一个人多次提交不是错误，而是业务本来就需要多条记录。这条和“一人一份，后一次覆盖前一次”不是同一条主线，不能同时采用。",
          consequence:
            "模型把回收数量改成按提交次数统计。开发团队和报表都保留同一用户的多条答卷，导出时要能看出同一人提交了多次。",
          project_impact:
            "业务更灵活，但报表解释、导出字段和验收样例都要重做。产品经理要确认运营是否能接受“人数”和“提交次数”不是同一个数字。",
          next_exit: "continue: 按多份答卷继续设计"
        }
      ]
    },
    "document-link-failure-policy": {
      label: "文档解析失败后问卷能不能发布",
      plain_summary:
        "这一步决定说明文档暂时解析不了时，问卷是继续发布、分情况发布，还是直接拦住。现在要先定，避免技术失败变成业务误放行。",
      action_prompt:
        "请定文档解析失败时问卷能不能发布。这个决定会影响发布门槛、文档状态提示、验收样例和运营排期。",
      recommended_option: "OPTION_A",
      options: [
        {
          id: "OPTION_A",
          label: "原文件能看就允许发布，搜索状态单独提示",
          when_to_choose:
            "适合文档只是辅助说明，用户能打开或下载原文件即可完成填写，不要求马上按文档内容搜索。",
          consequence:
            "模型保留问卷发布路径。开发团队在页面上显示“原文件可见、内容搜索暂不可用”，后台继续重试解析，测试团队验证提示是否清楚。",
          project_impact:
            "这条更适合文档只是辅助材料的场景。它不像一律拦截那样拖慢发布，也不会像静默放行那样让用户误以为搜索已经可用。UI 和验收要把文档状态说清楚，运营也要知道解析失败不等于文件不可看。",
          next_exit: "continue: 按可发布但提示解析状态设计",
          recommended: true
        },
        {
          id: "OPTION_B",
          label: "文档用途先补清，再定失败策略",
          when_to_choose:
            "适合 PRD 还没说清文档到底是普通附件、必读材料，还是问卷填写必须依赖的资料，现在无法判断解析失败时该不该拦截发布。",
          consequence:
            "模型先让产品经理补文档用途、用户是否必须阅读、解析失败由谁处理；发布门槛、文档状态提示和验收样例先暂停。",
          project_impact:
            "文档关联开发会延后，但能避免把辅助附件误做成发布门槛，也能避免把真正必读的材料错误放行。代价是产品要先补清文档在业务里的位置。",
          next_exit: "needs-decision: 产品经理补充文档用途和失败策略"
        },
        {
          id: "OPTION_C",
          label: "必读文档拦截，普通附件放行",
          when_to_choose:
            "适合有些问卷必须依赖说明文档，有些问卷只是附带参考资料，不能用同一条失败策略处理所有文档。",
          consequence:
            "模型增加文档重要性判断：必读文档解析失败就拦截发布，普通附件解析失败只显示提醒。产品经理需要补文档类型定义。",
          project_impact:
            "业务风险控制更细，但开发和测试要覆盖两条发布路径。适合文档用途差异明显的项目，不适合一期只想保持流程简单的项目。",
          next_exit: "revise-local-and-continue: 增加文档重要性分层规则"
        },
        {
          id: "OPTION_D",
          label: "解析成功前一律不允许发布",
          when_to_choose:
            "适合问卷填写必须依赖文档内容，例如政策阅读确认、考试材料或合同说明。文档内容不可用时，用户不应该开始填写。",
          consequence:
            "模型把文档解析状态写入发布前检查。开发团队要求运营换文件或等待解析成功后再发布，测试团队覆盖解析失败、重试成功和重新发布。",
          project_impact:
            "用户看到错误材料的风险最低；代价是发布节奏会依赖解析服务，排期要预留重试、失败提示和人工处理办法。这个选择更保守，适合高风险问卷。",
          next_exit: "continue: 发布前强制检查文档解析状态"
        }
      ]
    }
  };

  for (const module of data.modules) {
    for (const diagram of module.diagrams || []) {
      for (const node of diagram.nodes || []) {
        if (replacements[node.id]) {
          Object.assign(node, replacements[node.id]);
        }
      }
    }
  }

  window.SPECCOMPASS_REVIEW_DATA = data;
})();
