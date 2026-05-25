# Table Spec: TABLE-DECISION_RECORD

| Column | Meaning | Notes |
| --- | --- | --- |
| `id` | decision identifier | immutable |
| `request_id` | linked primary request | foreign-key style relationship |
| `decision` | approve or reject result | explicit enum or equivalent |
| `reviewer_id` | deciding actor | permission anchor |
| `decided_at` | decision timestamp | audit anchor |
