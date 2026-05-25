# Screen Map

| Screen ID | Purpose | Entry From | Main Actions | Next Handoff |
| --- | --- | --- | --- | --- |
| `SCREEN-PRIMARY` | capture or edit the primary request | feature entry, draft, deep link | save, submit | `SCREEN-REVIEW`, `SCREEN-DETAIL` |
| `SCREEN-LIST` | query records and open details | navigation, search, post-submit view | filter, open detail | `SCREEN-DETAIL` |
| `SCREEN-DETAIL` | show current status and follow-up actions | list or notification entry | inspect, optional follow-up | `SCREEN-REVIEW` or final state |
| `SCREEN-REVIEW` | review and decide on a pending request | task list, direct link | approve, reject | `SCREEN-DETAIL`, side effects |
