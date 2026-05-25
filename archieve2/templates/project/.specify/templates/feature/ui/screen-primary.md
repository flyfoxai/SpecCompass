# Screen Spec: SCREEN-PRIMARY

## Purpose

Capture the primary input journey for `__FEATURE_TITLE__`.

## Sections

| Section ID | Purpose | Key Fields | Key Actions |
| --- | --- | --- | --- |
| `SECTION-PRIMARY-INPUT` | collect required inputs | `FIELD-PRIMARY-001`, `FIELD-PRIMARY-002`, `FIELD-PRIMARY-003` | `ACTION-PRIMARY-SAVE`, `ACTION-PRIMARY-SUBMIT` |
| `SECTION-PRIMARY-FEEDBACK` | show validation and status feedback | `FIELD-PRIMARY-ERROR`, `FIELD-PRIMARY-STATUS` | none |

## Action Notes

- `ACTION-PRIMARY-SAVE`: stores or preserves in-progress content if the feature supports draft behavior.
- `ACTION-PRIMARY-SUBMIT`: triggers `API-CREATE` and enters the mainline flow.
