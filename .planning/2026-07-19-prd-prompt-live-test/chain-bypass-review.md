# Review request: Level 1 primary-chain aggregation bypass

We are improving a generic `/sp.prd` Level 1 product-decomposition mechanism.
The user wants a large product divided into small, single-responsibility,
loosely coupled candidate projects. Level 1 is a non-authorizing graphical
Discovery in which the user confirms, merges, splits, defers, or excludes
candidate boundaries.

Current structured contract:

- extract source-backed business objects, operations, outcomes, capability
  atoms, and business chains before drawing maps;
- a Level 1 candidate project references exactly one business chain;
- each business chain declares `chain_kind`, `trigger_kind`, `owned_state`, one
  `primary_outcome_ref`, and `downstream_handoff`;
- normal events, interruption recovery, and governance changes cannot share a
  chain;
- one chain has exactly one primary outcome and two chains cannot own the same
  primary outcome.

Live QMT result:

- Gemini produced six candidates: fact capture, strategy intention, risk
  decision, order execution, interruption reconciliation, configuration
  governance.
- Claude separated recovery and governance but put fact capture, strategy
  intention, risk decision, order submission, and broker lifecycle fact update
  into one `Live-trading core loop`. It treated their independently observable
  results as intermediate steps and declared only terminal order disposition as
  the chain primary outcome.

Evaluate these options:

A. Prompt wording only: emphasize that an independently accepted intermediate
   state is a project boundary.
B. Atom-first deterministic exploration: define a Level 1 capability atom as
   the smallest source-backed responsibility with one trigger class, one owned
   state, one independently accepted result, and one handoff. In the initial
   Level 1 Discovery, every atom must map one-to-one to one business chain and
   one candidate project. The model may show a merge only as a user decision
   option; it cannot auto-merge atoms before the user responds.
C. Conditional model merge: allow multiple atoms in one chain when the model
   supplies a structured merge justification claiming the intermediate results
   are not independently useful.

Please return concise JSON only, without Markdown:

{
  "recommended_option": "A|B|C",
  "why": "...",
  "risks": ["..."],
  "required_prompt_rules": ["..."],
  "required_deterministic_checks": ["..."],
  "generalization_check": "how this behaves outside trading projects",
  "qmt_expected_candidates": ["..."]
}
