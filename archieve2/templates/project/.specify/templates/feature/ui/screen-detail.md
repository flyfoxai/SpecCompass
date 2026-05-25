# Screen Spec: SCREEN-DETAIL

## Purpose

Show the latest lifecycle state, trace context, and any valid follow-up actions.

## Sections

| Section ID | Purpose | Key Fields | Key Actions |
| --- | --- | --- | --- |
| `SECTION-DETAIL-SUMMARY` | current state and business summary | `FIELD-DETAIL-STATE`, `FIELD-DETAIL-OWNER` | none |
| `SECTION-DETAIL-TRACE` | show workflow and decision history | `FIELD-DETAIL-HISTORY` | none |
| `SECTION-DETAIL-ACTIONS` | expose valid follow-up actions | `FIELD-DETAIL-NEXT-STEP` | `ACTION-DETAIL-FOLLOWUP` |
