# Level 1 QMT evaluation fixture

This is an offline prompt-quality evaluation. Do not edit files, run commands,
or create artifacts. Apply the preceding `/sp.prd` contract to the sourced
business facts below and return only one compact JSON object. Do not include
Markdown fences or explanatory prose.

## Sourced business facts

- Product subject: an A-share QMT controlled-trading product for a strategy
  operator who needs a traceable live-trading core loop.
- Market data, account funds, positions, orders, trades, and broker-reported
  state must be captured and retained as business facts.
- A strategy turns confirmed market/account facts into a trade intention.
- Risk rules independently decide whether a trade intention is released or
  blocked and must retain the decision reason.
- Released intentions are submitted as orders; order acknowledgements, fills,
  rejections, and cancellations update the authoritative trading facts.
- When the process is interrupted, restarted, or local and broker facts
  diverge, the product must reconcile orders, trades, positions, and funds
  before normal trading can resume.
- Strategy parameters, risk limits, and trading switches change through an
  explicit controlled change, approval, activation, and audit trail.
- Low latency, QMT APIs, storage technology, process topology, deployment, and
  team ownership are implementation concerns rather than Level 1 product
  boundaries.

## Required evaluation output

Return this shape:

{
  "capability_atoms": [
    {
      "label": "source-grounded domain action and result",
      "trigger_kind": "business_event | exception_or_interruption | governance_change",
      "owned_state": "one state this atom is responsible for",
      "primary_outcome": "one independently accepted result"
    }
  ],
  "business_chains": [
    {
      "label": "source-grounded business chain",
      "chain_kind": "primary | recovery | governance",
      "trigger_kind": "business_event | exception_or_interruption | governance_change",
      "trigger_or_input": "concrete trigger",
      "owned_state": "one exclusive business state",
      "primary_outcome": "one independently accepted result",
      "downstream_handoff": "named business handoff"
    }
  ],
  "candidate_projects": [
    {
      "label": "business responsibility, not a technical container",
      "business_chain": "exactly one business chain label",
      "capability_atoms": ["exactly one capability atom label"],
      "independence_reason": "why this owns one result without private-state coupling"
    }
  ],
  "rejected_merges": [
    {
      "items": ["chain label", "chain label"],
      "reason": "different trigger, state, or independently accepted result"
    }
  ]
}

Hard evaluation rules:

1. Extract atoms before grouping chains; do not invent a broad chain merely to
   reduce the number of candidate projects.
2. Every chain owns exactly one trigger class, one exclusive state, and one
   independently accepted primary result.
3. Normal business events use `primary`; interruptions and reconciliation use
   `recovery`; controlled parameter/rule changes use `governance`.
4. Normal fact capture and interruption recovery must be separate even when
   both read or update orders, trades, positions, or funds.
5. Controlled parameter/rule changes must be separate when they have their own
   change trigger, approval, activation, or audit result.
6. Each candidate project references exactly one chain and exactly one atom.
   Do not impose a target project count.
