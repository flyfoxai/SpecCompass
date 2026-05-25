# Table Spec: TABLE-PRIMARY_RECORD

| Column | Meaning | Notes |
| --- | --- | --- |
| `id` | primary identifier | immutable |
| `owner_id` | initiating actor | used for visibility |
| `state` | lifecycle state | must align with the UI |
| `created_at` | creation timestamp | audit anchor |
| `updated_at` | latest change timestamp | trace anchor |
