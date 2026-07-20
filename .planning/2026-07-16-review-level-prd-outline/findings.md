# Implementation Findings

- The renderer identity payload omitted option text and Outline view/authority content, so semantically different review data could share an ID.
- The Outline readiness gates compared two declared IDs but did not recompute the ID from the current `outline-review-data.json`.
- Schema v1 data is normalized with `confirmation_priority: normal`; this changes the new storage key and prevents reading drafts stored under the pre-v2 identity.
- The identity contract must use the same recursively key-sorted JSON serialization and FNV-1a/base36 hash in browser and Node CLI code.
- Legacy localStorage fallback must exactly preserve the pre-v2 identity payload and only apply when normalized data still declares `schema_version: 1`.

