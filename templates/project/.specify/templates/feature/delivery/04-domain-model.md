# Domain Model

| Domain Object | Purpose | Key Relationships |
| --- | --- | --- |
| `OBJ-PRIMARY-REQUEST` | main business record | owns status and user-facing lifecycle |
| `OBJ-DECISION-RECORD` | reviewer outcome record | references the primary request |
| `OBJ-SIDE-EFFECT` | downstream execution unit | references the decision result |
