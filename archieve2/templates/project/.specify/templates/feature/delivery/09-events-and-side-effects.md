# Events And Side Effects

| Event | Trigger | Downstream Effects | Compensation Question |
| --- | --- | --- | --- |
| `EVT-PRIMARY-CREATED` | `API-CREATE` succeeds | optional notification, list visibility refresh | does failure block the main transaction? |
| `EVT-DECISION-APPROVED` | `API-APPROVE` succeeds | notification, audit, ledger update | what is compensated versus retried? |
| `EVT-DECISION-REJECTED` | `API-REJECT` succeeds | notification, audit | what must remain user-visible immediately? |

## Notes

- Keep ordering, retry, idempotency, and compensation explicit.
