# UI Index

## Module Index

| Module | Screens | Linked Flows | Notes |
| --- | --- | --- | --- |
| `MODULE-PRIMARY` | `SCREEN-PRIMARY`, `SCREEN-LIST`, `SCREEN-DETAIL`, `SCREEN-REVIEW` | `FLOW-001`, `FLOW-STATE-001` | base UI asset map for `__FEATURE_TITLE__` |

## Screen Catalog

| Screen ID | Canonical Name | Alias Keywords | Linked Flows | Key Action IDs | Notes |
| --- | --- | --- | --- | --- | --- |
| `SCREEN-PRIMARY` | primary entry screen | create page, main form | `FLOW-001`, `FLOW-STATE-001` | `ACTION-PRIMARY-SAVE`, `ACTION-PRIMARY-SUBMIT` | entry and submission surface |
| `SCREEN-LIST` | result list screen | list page, search page | `FLOW-001`, `FLOW-STATE-001` | `ACTION-LIST-FILTER`, `ACTION-LIST-OPEN` | query and visibility surface |
| `SCREEN-DETAIL` | detail screen | detail page, result page | `FLOW-001`, `FLOW-STATE-001` | `ACTION-DETAIL-FOLLOWUP` | state detail and follow-up surface |
| `SCREEN-REVIEW` | review screen | approval page, review page | `FLOW-001`, `FLOW-STATE-001` | `ACTION-REVIEW-APPROVE`, `ACTION-REVIEW-REJECT` | decision surface |

## JSON Forms Scope

- `ui/jsonforms/*` is reserved for the primary input surface.
- Keep non-form screens documented as screen specs rather than fake forms.
