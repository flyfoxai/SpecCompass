# Progress

## 2026-07-19

- Completed Codex, Gemini, and Claude review of the current Level 1/2/3 text.
- User approved the synthesized contract-hardening approach.
- Added Task 5 to the existing implementation plan.
- Started the test-first contract phase.
- Added prompt-contract assertions to the methodology and installed Codex skill tests.
- RED evidence: both focused tests failed on the absent `Level 1 owns portfolio decomposition` contract; pytest exited 1 after collecting two tests.
- Implemented separate Level 1 portfolio-decomposition, Level 2 retained-product/child-framing, and Level 3 source-preserving compilation contracts.
- Added unique capability ownership, independently verifiable outcome, explicit handoff, narrow fallback, cross-domain substitution, and external-obligation classification rules.
- Aligned the methodology, command specification, and usage reference with the production command.
- First medium-step focused run exposed two stale phrase assertions; after updating them, all three focused contract/install tests passed.
- Claude review produced six findings. Codex accepted the retained-product event-scope ambiguity and the need to prohibit silent Level 2 merging; four findings duplicated rules already present and were rejected.
- Gemini's first review returned no conclusion after invoking an unavailable shell tool. A direct-diff retry completed and found one Important issue: the usage reference incorrectly said all three levels run substitution. Corrected it to Level 1 and Level 2.
- Full relevant regression initially reached 288 passing tests. Claude's final routing review then found that three older `/sp.prd` closeout paths could still send Level 1/2 boundary choices directly to `/sp.clarify`, and that one test still protected the old route.
- Added a failing routing-contract assertion, then classified repeated blockers, high-impact choices, and closeout evidence before routing. Level 1/2 boundary and ownership choices now remain in graphical Discovery with `NEXT_COMMAND_EXEC: None`; `/sp.clarify` is limited to focused non-boundary decisions the node-bound contract cannot express.
- Final relevant regression passed all 288 tests. Gemini and Claude both returned `无 Critical/Important` after reviewing the corrected routing contract and real assertions.
