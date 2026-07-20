# Findings

- `templates/commands/prd.md` currently applies the same Stage A/B/C pipeline to both Level 1 and Level 2.
- Current maturity gates rely on subjective words including `clear`, `unstable`, and `source-backed enough`.
- The container-title blacklist is currently a hard rejection even when the underlying business boundary may be valid.
- Current runtime-topology guidance incorrectly classifies all transactional consistency and bidirectional exchange as delivery-only risks.
- Level 3 has a strong prohibition list but lacks an equally explicit input/process/output/pass/fallback contract.
- Existing schema and response operations can carry the improved semantics; no protocol change is planned.
- Claude identified the retained-product Level 2 event source as potentially ambiguous. The contract now limits it to accepted events targeting the confirmed retained-product scope and keeps decomposition events as boundary history.
- Gemini found that the usage reference said all three levels run the cross-domain substitution test. This contradicted Level 3's source-preserving role; the reference now limits the test to Level 1 and Level 2.
- A local ownership conflict may involve one named boundary or a pair of boundaries. Level 2 keeps unaffected siblings stable, routes only the affected boundaries to Level 1, and may not silently merge children.
- Claude's Constitution-inference, Level 2 substitution, sanitization/test, and provenance findings were rejected because the production command and command specification already contain explicit prohibitions or provenance rules. No duplicate rules were added.
- Claude found that repeated-blocker escalation, high-impact choice handling, and the general closeout recommendation still listed `/sp.clarify` without first classifying Level 1/2 boundary or ownership choices. These paths now apply the same Discovery-first routing contract as the maturity-specific rules.
- The old graphical-confirmation test asserted only that `/sp.clarify` appeared somewhere after a scope fork. It now locks the classifier, graphical Discovery route, ownership condition, and closeout evidence classification instead.
- Gemini's final no-tools review and Claude's corrected final review found no unresolved Critical or Important issue in the routing rules.
