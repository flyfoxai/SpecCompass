# Findings & Decisions

## Confirmed Evidence
- Global executable: `/Users/hula/.local/bin/specify`.
- Global version: `0.11.2`, the latest formal release under investigation.
- Installed integration in stockprofits: `codex`.
- Project skill `.agents/skills/sp-prd/SKILL.md` contains the v0.11.2 atom-first, one-atom/one-chain/one-project, and no-initial-merge rules.
- Skill install timestamp: 2026-07-19 15:20:13.
- Generated Discovery timestamp: 2026-07-19 16:48:24, so it was generated after refresh.
- The current Discovery passes the deterministic validator but contains only three broad atoms: execution, governance, and trusted facts/observability.
- The three atoms combine multiple independently accepted outcomes and responsibilities, contrary to the semantic intent of the prompt.

## Working Diagnosis
- Not an old global CLI.
- Not simply an old project-local `/sp.prd` file.
- Not an old JSON generated before the visible template refresh.
- Possible fresh-session distinction: the host conversation may have retained an earlier loaded skill/context even though the file on disk was refreshed.
- Confirmed mechanism gap: structural validation can verify references and 1:1 cardinality only after the model chooses atom granularity; it cannot currently prove that a broad atom should have been split semantically.

## Refresh Safety
- `specify init --here --force --integration codex` is the documented project refresh path.
- `specs/` is excluded from template packages.
- `.specify/memory/constitution.md` must be backed up and restored because refresh overwrites it.
