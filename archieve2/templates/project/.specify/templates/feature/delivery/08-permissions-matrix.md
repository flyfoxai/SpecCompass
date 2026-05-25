# Permissions Matrix

| Role | Create | Review | Query | Follow-Up | Notes |
| --- | --- | --- | --- | --- | --- |
| `ROLE-PRIMARY-USER` | yes | no | own visible records | limited | initiating actor |
| `ROLE-REVIEWER` | no | yes | assigned or scoped records | yes | decision actor |
| `ROLE-OPERATOR` | no | no | support visibility only | limited | exceptional assistance only |
| `ROLE-SYSTEM` | no | internal | internal | internal | side-effect executor |
