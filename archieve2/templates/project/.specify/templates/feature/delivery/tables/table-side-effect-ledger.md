# Table Spec: TABLE-SIDE_EFFECT_LEDGER

| Column | Meaning | Notes |
| --- | --- | --- |
| `id` | ledger identifier | immutable |
| `request_id` | linked primary request | trace anchor |
| `effect_type` | emitted side-effect type | notification, audit, ledger update, etc. |
| `status` | execution state | queued, done, failed, compensated |
| `compensated_at` | compensation timestamp | blank until needed |
