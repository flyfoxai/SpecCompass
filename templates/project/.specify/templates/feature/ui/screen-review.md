# Screen Spec: SCREEN-REVIEW

## Purpose

Support reviewer-side decision making with explicit permission and audit anchors.

## Sections

| Section ID | Purpose | Key Fields | Key Actions |
| --- | --- | --- | --- |
| `SECTION-REVIEW-CONTEXT` | show the request under review | `FIELD-REVIEW-STATE`, `FIELD-REVIEW-SCOPE` | none |
| `SECTION-REVIEW-DECISION` | capture review decision input | `FIELD-REVIEW-COMMENT`, `FIELD-REVIEW-REASON` | `ACTION-REVIEW-APPROVE`, `ACTION-REVIEW-REJECT` |

## Notes

- Keep rejection reason and permission rules visible in both UI and delivery docs.
