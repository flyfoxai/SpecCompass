# Screen Spec: SCREEN-LIST

## Purpose

Provide searchable visibility into previously created records.

## Sections

| Section ID | Purpose | Key Fields | Key Actions |
| --- | --- | --- | --- |
| `SECTION-LIST-FILTER` | capture filter criteria | `FIELD-LIST-STATUS`, `FIELD-LIST-DATE` | `ACTION-LIST-FILTER` |
| `SECTION-LIST-RESULTS` | render matching records | `FIELD-LIST-ROW-STATE`, `FIELD-LIST-ROW-OWNER` | `ACTION-LIST-OPEN` |

## Notes

- Keep visibility rules aligned with `delivery/08-permissions-matrix.md`.
