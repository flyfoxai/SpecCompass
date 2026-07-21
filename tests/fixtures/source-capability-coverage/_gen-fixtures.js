#!/usr/bin/env node
// Fixture generator for source-capability-coverage tests
const fs = require('fs');
const path = require('path');
const dir = __dirname;

// ─── Shared semantic values (atom↔chain must match) ───────────────────────────
const SEMANTICS = [
  {
    id: 'EXEC-MANUAL',
    label: '手动委托执行',
    trigger_kind: 'business_event',
    trigger_or_input: '交易员提交手动委托单',
    owned_state: '委托单状态变为已接收并等待执行',
    primary_outcome: 'OUT-ORDER-FILLED',
    downstream_handoff: '订单路由模块接管后续撮合'
  },
  {
    id: 'EXEC-STRATEGY',
    label: '策略自动执行',
    trigger_kind: 'business_event',
    trigger_or_input: '策略引擎触发自动下单信号',
    owned_state: '策略执行状态已记录并绑定策略ID',
    primary_outcome: 'OUT-STRATEGY-EXECUTED',
    downstream_handoff: '执行报告推送至策略监控模块'
  },
  {
    id: 'EXEC-GATEWAY',
    label: '网关路由分发',
    trigger_kind: 'business_event',
    trigger_or_input: '内部系统发出委托路由请求',
    owned_state: '委托已选定交易所网关并完成路由记录',
    primary_outcome: 'OUT-GATEWAY-ROUTED',
    downstream_handoff: '交易所确认回执传回执行核心'
  },
  {
    id: 'TRUST-FACTS',
    label: '交易事实核验',
    trigger_kind: 'governance_change',
    trigger_or_input: '合规系统发起交易事实核查请求',
    owned_state: '交易记录核验状态标记为已审核或存疑',
    primary_outcome: 'OUT-FACTS-VERIFIED',
    downstream_handoff: '核验结果推送至合规报告生成模块'
  },
  {
    id: 'TRUST-MARKET',
    label: '市场可信度追踪',
    trigger_kind: 'business_event',
    trigger_or_input: '市场数据服务推送最新行情更新',
    owned_state: '市场可信度评分已更新并持久化到评分存储',
    primary_outcome: 'OUT-MARKET-TRACKED',
    downstream_handoff: '可信度变化通知推送至风控预警模块'
  },
  {
    id: 'TRUST-OBS',
    label: '信任观测汇总',
    trigger_kind: 'exception_or_interruption',
    trigger_or_input: '观测调度器触发周期性信任汇总任务',
    owned_state: '信任汇总报告已生成并存入分析数据仓库',
    primary_outcome: 'OUT-TRUST-OBSERVED',
    downstream_handoff: '汇总报告触发管理层仪表盘刷新'
  }
];

const OBJECTS = [
  {object_id:'OBJ-ORDER', label:'委托单', summary:'交易员提交的买卖委托记录', source_status:'user', source_refs:['SRC-DOC-001']},
  {object_id:'OBJ-POSITION', label:'持仓记录', summary:'当前账户的股票持仓状态', source_status:'user', source_refs:['SRC-DOC-001']},
  {object_id:'OBJ-MARKET', label:'市场行情', summary:'交易所实时报价和深度数据', source_status:'doc', source_refs:['SRC-DOC-002']},
  {object_id:'OBJ-ACCOUNT', label:'交易账户', summary:'用于执行委托的资金账户', source_status:'user', source_refs:['SRC-DOC-001']},
  {object_id:'OBJ-RISK', label:'风险敞口', summary:'当前持仓的风险度量值', source_status:'ai-proposed', source_refs:['SRC-DOC-003']},
  {object_id:'OBJ-TRADE', label:'成交记录', summary:'已完成的交易结果数据', source_status:'user', source_refs:['SRC-DOC-001']}
];

const OPERATIONS = [
  {operation_id:'OP-SUBMIT-ORDER', label:'提交委托单', summary:'交易员通过界面或API提交新的买卖委托', object_refs:['OBJ-ORDER','OBJ-ACCOUNT'], source_status:'user', source_refs:['SRC-DOC-001']},
  {operation_id:'OP-EXECUTE-STRATEGY', label:'执行策略下单', summary:'策略引擎自动生成并提交委托以执行量化策略', object_refs:['OBJ-ORDER','OBJ-POSITION'], source_status:'user', source_refs:['SRC-DOC-001']},
  {operation_id:'OP-ROUTE-GATEWAY', label:'路由至网关', summary:'将委托单分发至合适的交易所接入网关', object_refs:['OBJ-ORDER','OBJ-TRADE'], source_status:'doc', source_refs:['SRC-DOC-002']},
  {operation_id:'OP-VERIFY-FACTS', label:'核验交易事实', summary:'对成交记录进行合规性事实核查', object_refs:['OBJ-TRADE','OBJ-ACCOUNT'], source_status:'user', source_refs:['SRC-DOC-001']},
  {operation_id:'OP-TRACK-MARKET', label:'追踪市场可信度', summary:'实时更新并记录市场数据的可信度评分', object_refs:['OBJ-MARKET','OBJ-RISK'], source_status:'doc', source_refs:['SRC-DOC-002']},
  {operation_id:'OP-OBSERVE-TRUST', label:'汇总信任观测数据', summary:'周期性聚合各维度信任指标并生成汇总报告', object_refs:['OBJ-RISK','OBJ-TRADE'], source_status:'ai-proposed', source_refs:['SRC-DOC-003']}
];

const OUTCOMES = [
  {outcome_id:'OUT-ORDER-FILLED', label:'委托成功成交', summary:'委托单已匹配并完成成交，持仓更新', source_status:'user', source_refs:['SRC-DOC-001']},
  {outcome_id:'OUT-STRATEGY-EXECUTED', label:'策略执行完毕', summary:'量化策略完成一轮自动委托执行', source_status:'user', source_refs:['SRC-DOC-001']},
  {outcome_id:'OUT-GATEWAY-ROUTED', label:'委托路由完成', summary:'委托单已成功路由至目标网关', source_status:'doc', source_refs:['SRC-DOC-002']},
  {outcome_id:'OUT-FACTS-VERIFIED', label:'交易事实已核验', summary:'合规核查完成，结果记入审计日志', source_status:'user', source_refs:['SRC-DOC-001']},
  {outcome_id:'OUT-MARKET-TRACKED', label:'市场可信度已更新', summary:'最新可信度评分已持久化', source_status:'doc', source_refs:['SRC-DOC-002']},
  {outcome_id:'OUT-TRUST-OBSERVED', label:'信任观测已汇总', summary:'信任汇总报告已写入数据仓库', source_status:'ai-proposed', source_refs:['SRC-DOC-003']}
];

// Build chains (each matches one semantic entry)
const CHAINS = SEMANTICS.map((s, i) => ({
  chain_id: `CHAIN-${s.id}`,
  label: s.label,
  chain_kind: (i < 3) ? 'primary' : 'governance',
  trigger_kind: s.trigger_kind,
  trigger_or_input: s.trigger_or_input,
  owned_state: s.owned_state,
  object_refs: [OBJECTS[i].object_id],
  operation_refs: [OPERATIONS[i].operation_id],
  outcome_refs: [s.primary_outcome],
  primary_outcome_ref: s.primary_outcome,
  downstream_handoff: s.downstream_handoff,
  source_status: 'user',
  source_refs: ['SRC-DOC-001']
}));

// Build atoms (each references exactly one chain, matching semantic fields)
const ATOMS = SEMANTICS.map((s, i) => ({
  atom_id: `ATOM-${s.id}`,
  label: s.label,
  trigger_kind: s.trigger_kind,
  trigger_or_input: s.trigger_or_input,
  owned_state: s.owned_state,
  object_refs: [OBJECTS[i].object_id],
  operation_refs: [OPERATIONS[i].operation_id],
  outcome_refs: [s.primary_outcome],
  primary_outcome_ref: s.primary_outcome,
  downstream_handoff: s.downstream_handoff,
  business_chain_refs: [`CHAIN-${s.id}`],
  source_status: 'user',
  source_refs: ['SRC-DOC-001']
}));

// Build source_capability_coverage (6 entries, each unique atom ref)
const SRC_COVERAGE = SEMANTICS.map((s, i) => ({
  source_capability_id: `SRC-CAP-${String(i+1).padStart(3,'0')}`,
  label: `源能力：${s.label}`,
  trigger_or_input: s.trigger_or_input,
  owned_state: s.owned_state,
  observable_outcome: s.primary_outcome + ' 可被外部观测并记录到审计系统',
  disposition: 'atom',
  capability_atom_ref: `ATOM-${s.id}`,
  source_refs: ['SRC-DOC-001']
}));

const EVIDENCE_GAPS = [
  {
    gap_id: 'GAP-001',
    summary: '缺少异常委托取消场景的业务链证据，需补充用户访谈或系统日志',
    business_chain_refs: ['CHAIN-EXEC-MANUAL']
  }
];

// ─── Maps ─────────────────────────────────────────────────────────────────────
const MAPS = [
  {map_id:'MAP-OVERVIEW', title:'系统总览', summary:'股票交易执行系统顶层能力全景图', map_kind:'overview', root_node_id:'NODE-OVERVIEW-ROOT', parent_map_id:null},
  {map_id:'MAP-VS-TRADING', title:'交易执行价值流', summary:'从委托到成交的完整交易执行路径', map_kind:'value_stream', root_node_id:'NODE-VS-TRADING-ROOT', parent_map_id:'MAP-OVERVIEW'},
  {map_id:'MAP-VS-TRUST', title:'信任与合规价值流', summary:'市场可信度追踪与交易事实核验路径', map_kind:'value_stream', root_node_id:'NODE-VS-TRUST-ROOT', parent_map_id:'MAP-OVERVIEW'},
  {map_id:'MAP-EXEC-MANUAL', title:'手动委托执行分支', summary:'人工发起的委托执行流程', map_kind:'branch', root_node_id:'NODE-EXEC-MANUAL-ROOT', parent_map_id:'MAP-VS-TRADING'},
  {map_id:'MAP-EXEC-STRATEGY', title:'策略自动执行分支', summary:'量化策略驱动的自动执行流程', map_kind:'branch', root_node_id:'NODE-EXEC-STRATEGY-ROOT', parent_map_id:'MAP-VS-TRADING'},
  {map_id:'MAP-EXEC-GATEWAY', title:'网关路由分发分支', summary:'委托到交易所网关的路由逻辑', map_kind:'branch', root_node_id:'NODE-EXEC-GATEWAY-ROOT', parent_map_id:'MAP-VS-TRADING'},
  {map_id:'MAP-TRUST-FACTS', title:'交易事实核验分支', summary:'合规事实核查详细流程', map_kind:'branch', root_node_id:'NODE-TRUST-FACTS-ROOT', parent_map_id:'MAP-VS-TRUST'},
  {map_id:'MAP-TRUST-MARKET', title:'市场可信度追踪分支', summary:'实时市场数据可信度评估流程', map_kind:'branch', root_node_id:'NODE-TRUST-MARKET-ROOT', parent_map_id:'MAP-VS-TRUST'},
  {map_id:'MAP-TRUST-OBS', title:'信任观测汇总分支', summary:'周期性信任指标聚合报告流程', map_kind:'branch', root_node_id:'NODE-TRUST-OBS-ROOT', parent_map_id:'MAP-VS-TRUST'},
  {map_id:'MAP-CONSTRAINTS', title:'全局约束', summary:'适用于全系统的监管与运营约束', map_kind:'global_constraints', root_node_id:'NODE-CONSTRAINT-ROOT', parent_map_id:'MAP-OVERVIEW'}
];

// ─── Outline Nodes ────────────────────────────────────────────────────────────
const NODES = [
  // Overview root + 3 map_links
  {node_id:'NODE-OVERVIEW-ROOT', parent_node_id:null, map_id:'MAP-OVERVIEW', node_kind:'root', label:'股票交易执行系统', summary:'系统顶层入口节点', source_status:'user'},
  {node_id:'NODE-LINK-TO-TRADING', parent_node_id:'NODE-OVERVIEW-ROOT', map_id:'MAP-OVERVIEW', node_kind:'map_link', label:'交易执行价值流', summary:'链接到交易执行价值流图', source_status:'user', child_map_id:'MAP-VS-TRADING'},
  {node_id:'NODE-LINK-TO-TRUST', parent_node_id:'NODE-OVERVIEW-ROOT', map_id:'MAP-OVERVIEW', node_kind:'map_link', label:'信任与合规价值流', summary:'链接到信任与合规价值流图', source_status:'user', child_map_id:'MAP-VS-TRUST'},
  {node_id:'NODE-LINK-TO-CONSTRAINTS', parent_node_id:'NODE-OVERVIEW-ROOT', map_id:'MAP-OVERVIEW', node_kind:'map_link', label:'全局约束', summary:'链接到全局约束图', source_status:'user', child_map_id:'MAP-CONSTRAINTS'},

  // VS-TRADING root + 3 map_links
  {node_id:'NODE-VS-TRADING-ROOT', parent_node_id:null, map_id:'MAP-VS-TRADING', node_kind:'root', label:'交易执行价值流', summary:'从委托到成交的核心价值流', source_status:'user'},
  {node_id:'NODE-LINK-TO-EXEC-MANUAL', parent_node_id:'NODE-VS-TRADING-ROOT', map_id:'MAP-VS-TRADING', node_kind:'map_link', label:'手动委托执行', summary:'链接到手动委托执行分支', source_status:'user', child_map_id:'MAP-EXEC-MANUAL'},
  {node_id:'NODE-LINK-TO-EXEC-STRATEGY', parent_node_id:'NODE-VS-TRADING-ROOT', map_id:'MAP-VS-TRADING', node_kind:'map_link', label:'策略自动执行', summary:'链接到策略自动执行分支', source_status:'user', child_map_id:'MAP-EXEC-STRATEGY'},
  {node_id:'NODE-LINK-TO-EXEC-GATEWAY', parent_node_id:'NODE-VS-TRADING-ROOT', map_id:'MAP-VS-TRADING', node_kind:'map_link', label:'网关路由分发', summary:'链接到网关路由分发分支', source_status:'user', child_map_id:'MAP-EXEC-GATEWAY'},

  // VS-TRUST root + 3 map_links
  {node_id:'NODE-VS-TRUST-ROOT', parent_node_id:null, map_id:'MAP-VS-TRUST', node_kind:'root', label:'信任与合规价值流', summary:'信任评估与合规核查核心路径', source_status:'user'},
  {node_id:'NODE-LINK-TO-TRUST-FACTS', parent_node_id:'NODE-VS-TRUST-ROOT', map_id:'MAP-VS-TRUST', node_kind:'map_link', label:'交易事实核验', summary:'链接到交易事实核验分支', source_status:'user', child_map_id:'MAP-TRUST-FACTS'},
  {node_id:'NODE-LINK-TO-TRUST-MARKET', parent_node_id:'NODE-VS-TRUST-ROOT', map_id:'MAP-VS-TRUST', node_kind:'map_link', label:'市场可信度追踪', summary:'链接到市场可信度追踪分支', source_status:'user', child_map_id:'MAP-TRUST-MARKET'},
  {node_id:'NODE-LINK-TO-TRUST-OBS', parent_node_id:'NODE-VS-TRUST-ROOT', map_id:'MAP-VS-TRUST', node_kind:'map_link', label:'信任观测汇总', summary:'链接到信任观测汇总分支', source_status:'user', child_map_id:'MAP-TRUST-OBS'},

  // Branch roots (each with business_chain_refs + capability_atom_refs)
  {node_id:'NODE-EXEC-MANUAL-ROOT', parent_node_id:null, map_id:'MAP-EXEC-MANUAL', node_kind:'root', label:'手动委托执行', summary:'人工委托接收与执行的详细流程', source_status:'user', business_chain_refs:['CHAIN-EXEC-MANUAL'], capability_atom_refs:['ATOM-EXEC-MANUAL']},
  {node_id:'NODE-EXEC-STRATEGY-ROOT', parent_node_id:null, map_id:'MAP-EXEC-STRATEGY', node_kind:'root', label:'策略自动执行', summary:'量化策略触发自动下单的流程', source_status:'user', business_chain_refs:['CHAIN-EXEC-STRATEGY'], capability_atom_refs:['ATOM-EXEC-STRATEGY']},
  {node_id:'NODE-EXEC-GATEWAY-ROOT', parent_node_id:null, map_id:'MAP-EXEC-GATEWAY', node_kind:'root', label:'网关路由分发', summary:'委托单路由至交易所网关的流程', source_status:'user', business_chain_refs:['CHAIN-EXEC-GATEWAY'], capability_atom_refs:['ATOM-EXEC-GATEWAY']},
  {node_id:'NODE-TRUST-FACTS-ROOT', parent_node_id:null, map_id:'MAP-TRUST-FACTS', node_kind:'root', label:'交易事实核验', summary:'合规事实核查的完整流程', source_status:'user', business_chain_refs:['CHAIN-TRUST-FACTS'], capability_atom_refs:['ATOM-TRUST-FACTS']},
  {node_id:'NODE-TRUST-MARKET-ROOT', parent_node_id:null, map_id:'MAP-TRUST-MARKET', node_kind:'root', label:'市场可信度追踪', summary:'市场数据实时可信度评估流程', source_status:'user', business_chain_refs:['CHAIN-TRUST-MARKET'], capability_atom_refs:['ATOM-TRUST-MARKET']},
  {node_id:'NODE-TRUST-OBS-ROOT', parent_node_id:null, map_id:'MAP-TRUST-OBS', node_kind:'root', label:'信任观测汇总', summary:'周期性信任指标聚合流程', source_status:'user', business_chain_refs:['CHAIN-TRUST-OBS'], capability_atom_refs:['ATOM-TRUST-OBS']},

  // Global constraints root
  {node_id:'NODE-CONSTRAINT-ROOT', parent_node_id:null, map_id:'MAP-CONSTRAINTS', node_kind:'root', label:'全局约束', summary:'监管合规与系统运营的全局约束汇总', source_status:'user'}
];

// ─── Question Groups ──────────────────────────────────────────────────────────
const QUESTION_GROUPS = [
  {
    id: 'QG-EXEC-MANUAL-001',
    title: '手动委托执行范围确认',
    summary: '确认手动委托执行功能的业务边界和实现策略',
    map_id: 'MAP-EXEC-MANUAL',
    questions: [
      {
        id: 'Q-EXEC-BOUNDARY',
        outline_node_id: 'NODE-EXEC-MANUAL-ROOT',
        target_kind: 'capability',
        prompt: '手动委托执行的核心能力边界应如何定义？',
        context: '当前文档描述了委托提交流程，但对撮合和清算边界尚不明确',
        selection_mode: 'single',
        candidates: [
          {
            id: 'CAND-BOUNDARY-A',
            label: '仅管理委托接收与状态',
            value: '手动委托执行仅负责接收委托、验证参数、更新状态至"已提交"，撮合由独立模块处理',
            rationale: '职责边界清晰，易于单独测试和部署',
            business_chain_refs: ['CHAIN-EXEC-MANUAL'],
            capability_atom_refs: ['ATOM-EXEC-MANUAL']
          },
          {
            id: 'CAND-BOUNDARY-B',
            label: '包含路由分发逻辑',
            value: '手动委托执行同时负责委托接收和路由至网关，统一管理委托生命周期前半段',
            rationale: '减少模块间交互，适合单体架构',
            business_chain_refs: ['CHAIN-EXEC-MANUAL', 'CHAIN-EXEC-GATEWAY'],
            capability_atom_refs: ['ATOM-EXEC-MANUAL', 'ATOM-EXEC-GATEWAY']
          }
        ],
        recommended_candidate_ids: ['CAND-BOUNDARY-A'],
        recommendation_reason: '职责分离更利于后续策略执行和网关路由复用相同的路由层',
        allow_none_of_the_above: true,
        free_input: {
          enabled: true,
          label: '补充或改写能力边界描述',
          allowed_operations: ['confirm_candidate', 'add', 'replace', 'exclude', 'context_note']
        }
      }
    ]
  }
];

// ─── Constitution Snapshot ────────────────────────────────────────────────────
const CONSTITUTION_SNAPSHOT = {
  source_path: '.specify/memory/constitution.md',
  availability: 'missing',
  display_mode: 'read_only',
  application_scope: 'governance_only',
  clauses: []
};

// ─── Density Budget ───────────────────────────────────────────────────────────
const DENSITY_BUDGET = {
  max_visible_nodes_per_map: 18,
  max_depth: 3,
  layer_balance_min_nodes: 8,
  max_layer_share: 0.6
};

// ─── Build valid fixture ──────────────────────────────────────────────────────
const validFixture = {
  schema_version: 3,
  review_type: 'outline_discovery',
  interaction_mode: 'discovery',
  artifact_path: 'specs/valid-test/prd/review/outline-discovery-data.json',
  outline_maturity: 'explore',
  batch_id: 'TEST-VALID-COVERAGE-001',
  project: {
    name: '股票交易执行系统',
    feature: 'stock-trading-execution',
    current_understanding: '系统需要支持手动委托执行、策略自动执行、网关路由分发三条核心交易路径，并提供市场可信度追踪和交易事实核验两条合规保障路径。',
    discovery_goal: '确认六个核心能力原子的业务边界，明确各能力的状态所有权和可观测结果，为Level 1图谱提供完整的原子分解基础。'
  },
  source_snapshot: [
    {path: 'specs/stock-trading/prd.md', source_type: 'user_document', anchors: ['System Overview', 'Trading Execution']}
  ],
  business_context: {
    product_subject: {
      label: '股票交易执行系统',
      summary: '面向机构投资者的股票委托执行与合规核查平台，覆盖手动委托、策略自动执行和市场信任评估',
      source_status: 'user',
      source_refs: ['SRC-DOC-001']
    },
    source_capability_coverage: SRC_COVERAGE,
    business_objects: OBJECTS,
    operations: OPERATIONS,
    outcomes: OUTCOMES,
    capability_atoms: ATOMS,
    business_chains: CHAINS,
    evidence_gaps: EVIDENCE_GAPS
  },
  constitution_snapshot: CONSTITUTION_SNAPSHOT,
  density_budget: DENSITY_BUDGET,
  maps: MAPS,
  outline_nodes: NODES,
  question_groups: QUESTION_GROUPS,
  authorization_effect: 'none',
  next_route: '/sp.prd'
};

// ─── Write fixtures ───────────────────────────────────────────────────────────
fs.writeFileSync(path.join(dir, 'valid-full-coverage.json'), JSON.stringify(validFixture, null, 2));

// Fixture B: invalid-density-merge (only change current_understanding)
const densityMergeFixture = JSON.parse(JSON.stringify(validFixture));
densityMergeFixture.project.current_understanding = '为满足 Level 1 图的可读密度，当前只提出三个候选项目边界，等待图形化确认。';
fs.writeFileSync(path.join(dir, 'invalid-density-merge.json'), JSON.stringify(densityMergeFixture, null, 2));

// Fixture C: invalid-multi-ref (first two src coverage entries both point to ATOM-EXEC-MANUAL)
const multiRefFixture = JSON.parse(JSON.stringify(validFixture));
multiRefFixture.business_context.source_capability_coverage[1] = Object.assign(
  {}, multiRefFixture.business_context.source_capability_coverage[1],
  { capability_atom_ref: 'ATOM-EXEC-MANUAL' }
);
fs.writeFileSync(path.join(dir, 'invalid-multi-ref.json'), JSON.stringify(multiRefFixture, null, 2));

// Fixture D: invalid-missing-coverage (remove last coverage entry so ATOM-TRUST-OBS has no coverage)
const missingCoverageFixture = JSON.parse(JSON.stringify(validFixture));
missingCoverageFixture.business_context.source_capability_coverage =
  missingCoverageFixture.business_context.source_capability_coverage.slice(0, 5);
fs.writeFileSync(path.join(dir, 'invalid-missing-coverage.json'), JSON.stringify(missingCoverageFixture, null, 2));

console.log('All fixtures generated.');
console.log('valid-full-coverage atoms:', validFixture.business_context.capability_atoms.length);
console.log('density-merge src_coverage count:', densityMergeFixture.business_context.source_capability_coverage.length);
console.log('multi-ref second entry atom_ref:', multiRefFixture.business_context.source_capability_coverage[1].capability_atom_ref);
console.log('missing-coverage src_coverage count:', missingCoverageFixture.business_context.source_capability_coverage.length);
