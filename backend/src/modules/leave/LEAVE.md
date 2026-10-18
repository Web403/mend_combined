# Leave & Off Management API

Base path: `/api/v1/leave` · Auth: `Authorization: Bearer <JWT>`

This module covers two different things that look similar but behave differently:

| | **Leave** (`/requests`) | **Off** (`/offs`) |
|---|---|---|
| What it is | An absence the **employee asks for**: date range, type, reason | A non-working day the **manager schedules** |
| Who creates it | Employee | Manager / admin / hotel owner |
| Approval | Required: `PENDING` → `APPROVED` / `REJECTED` | None; it takes effect when assigned |
| Types | `CASUAL`, `SICK`, `EARNED`, `UNPAID`, `OTHER` | `WEEKLY_OFF`, `COMP_OFF`, `HOLIDAY` |
| Effect on leave | Counts as leave days | Never counts as leave; removed from leave day counts |

**Leave days** of a request = inclusive calendar days from `fromDate` to `toDate`, minus any scheduled offs the employee has on those days. A Sat–Sun request where Sunday is a weekly off is 1 leave day.

## Who can do what

| Action | Employee (`EMPLOYEE`, `HR`) | Manager / Admin (`MANAGER`, `ADMIN`) | Hotel owner (`HOTEL`) | Gig worker (`STUDENT`, `PROFESSIONAL`) |
|---|---|---|---|---|
| Submit / list own / cancel own leave | Yes | Yes (managers can also be employees) | No | No (403) |
| List all leave in the hotel | No | Yes | Yes | No |
| Approve / reject | No | Yes, except their own requests | Yes | No |
| Assign / list all / remove offs | No | Yes | Yes | No |
| View own offs | Yes | Yes | No | No |

Rules that apply to everyone:

- **Tenant comes from the token only.** The hotel is `hotelId` in the JWT for staff, and the `sub` for the hotel-owner account. The `X-Hotel-Id` header is ignored by this module.
- A request that belongs to another hotel returns **404**, not 403, so ids cannot be probed across tenants.
- **Nobody reviews their own request.** Returns 403 `LEAVE_SELF_REVIEW_FORBIDDEN`.
- Only **ACTIVE** staff can request leave or review. Suspended accounts are refused.

## Conventions

- **Dates** are `YYYY-MM-DD` calendar dates and are inclusive. Invalid calendar dates such as `2026-02-30` are rejected.
- **"Today"** for business rules is computed in `Asia/Kolkata`.
- **Envelope:** `{ "success": boolean, "message": string, "data": any, "meta"?: object }`.
- **Errors:** `meta.code` is a stable machine-readable code. Branch on the code, not the message.
- **Pagination:** query `page` (default 1) and `limit` (default 20, max 100). Response `meta`: `{ page, limit, total, totalPages }`.
- **IDs** are 24-character hex strings. A malformed id returns 400 `LEAVE_VALIDATION_FAILED`.

## Lifecycle of a leave request

```
PENDING ──approve──▶ APPROVED
   │  ├──reject───▶ REJECTED         (note required)
   │  └──cancel───▶ CANCELLED        (by employee)
APPROVED ──cancel──▶ CANCELLED       (by employee, only if fromDate is after today in IST)
```

## Endpoints

### Leave requests

#### 1. Submit a leave request — employee
`POST /leave/requests` → **201**

Body:
```json
{ "type": "CASUAL", "fromDate": "2026-11-02", "toDate": "2026-11-04", "reason": "Family function" }
```
- `type`: `CASUAL | SICK | EARNED | UNPAID | OTHER`
- `reason`: required, 1–500 characters
- Range: `toDate >= fromDate`, at most 90 days
- Rejected if it overlaps one of the employee's **PENDING or APPROVED** requests (409 `LEAVE_OVERLAP`), or if every day is an existing off (400 `LEAVE_NO_WORKING_DAYS`)
- `userId`, `hotelId`, `status` and similar fields in the body are ignored

Response `data`: a **LeaveRequestDto** (see below).

#### 2. List my leave requests — employee
`GET /leave/requests/mine?status=&type=&from=&to=&page=&limit=`

- `from` and `to` must be given together and filter for overlap with the range.
- Returns only the caller's requests.
- Response: `data: LeaveRequestDto[]`, plus `meta` pagination.

#### 3. List all leave requests — manager / admin / hotel owner
`GET /leave/requests?status=&type=&userId=&from=&to=&page=&limit=`

- `status` filters: `PENDING` to see the approval queue.
- `userId` narrows to one employee.
- Response: `data: LeaveRequestDto[]` with `employee` names filled in, plus `meta` pagination.

#### 4. Get one leave request — owner or manager
`GET /leave/requests/:id` → 200 · 404 `LEAVE_REQUEST_NOT_FOUND` if it doesn't exist or isn't visible to the caller.

#### 5. Cancel my leave request — employee
`PATCH /leave/requests/:id/cancel` → 200

Allowed when the request is `PENDING`, or `APPROVED` with `fromDate` later than today (IST). Otherwise 409 `LEAVE_NOT_CANCELLABLE`. Another employee's id returns 404.

#### 6. Approve — manager / admin / hotel owner
`PATCH /leave/requests/:id/approve`

Body (optional): `{ "note": "Covered by Deepak" }` (max 500 characters)

Re-checks overlaps at approval time. If two overlapping requests are approved at the same moment, the second one is rolled back to `PENDING` and gets 409 `LEAVE_OVERLAP`.

#### 7. Reject — manager / admin / hotel owner
`PATCH /leave/requests/:id/reject`

Body (**required**): `{ "note": "Two chefs already off that week" }` (1–500 characters)

### Day offs

#### 8. Assign offs — manager / admin / hotel owner
`POST /leave/offs` → **201**

Body:
```json
{
  "userIds": ["65a1…", "65a2…"],
  "fromDate": "2026-11-01",
  "toDate": "2026-11-14",
  "weekdays": [0],
  "type": "WEEKLY_OFF",
  "note": "Rota rest day"
}
```
- `userIds`: 1–200 employees, all must belong to the hotel (404 `EMPLOYEE_NOT_FOUND` lists any that don't).
- `weekdays` (optional): 0 = Sunday … 6 = Saturday. Omit for every day in the range. For example, `[0]` gives every Sunday.
- `type` defaults to `WEEKLY_OFF`.
- Limits: range up to 92 days, and employees × days up to 2,000 per call.
- Idempotent: a day that already has an off for that employee is skipped, not duplicated.

Response `data`:
```json
{
  "created": [ DayOffDto, … ],
  "skipped": [ { "employeeId": "…", "date": "2026-11-08", "reason": "ALREADY_OFF" } ],
  "summary": { "employees": 2, "requestedDays": 2, "createdCount": 4, "skippedCount": 0 }
}
```

#### 9. Calendar of offs — manager / admin / hotel owner
`GET /leave/offs?from=2026-11-01&to=2026-11-30&userId=&type=&page=&limit=`

- `from` and `to` are required, up to 366 days.
- Each item is a DayOffDto with an `employee` summary attached.

#### 10. My offs — employee
`GET /leave/offs/mine?from=&to=`

- Defaults to today through the next 30 days (IST) if not given. Up to 366 days.
- Not paginated, returns `data: DayOffDto[]`.

#### 11. Remove an off — manager / admin / hotel owner
`DELETE /leave/offs/:id` → 200 `{ "id": "…", "deleted": true }` · 404 `DAY_OFF_NOT_FOUND`

## DTOs

**LeaveRequestDto**
```ts
{
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; role: string } | null;
  type: "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "OTHER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  fromDate: string;          // YYYY-MM-DD
  toDate: string;            // YYYY-MM-DD, inclusive
  leaveDays: number;         // working days in the range, excluding scheduled offs
  reason: string;
  reviewedBy: string | null; // id of the approver (User or Hotel id)
  reviewedAt: string | null; // ISO timestamp
  reviewNote: string | null;
  cancelledAt: string | null;
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}
```

**DayOffDto**
```ts
{
  id: string;
  employeeId: string;
  date: string;              // YYYY-MM-DD
  type: "WEEKLY_OFF" | "COMP_OFF" | "HOLIDAY";
  note: string | null;
  assignedBy: string;        // id of the manager who scheduled it
  createdAt: string;         // ISO timestamp
}
```

## Error codes

| HTTP | `meta.code` | When |
|---|---|---|
| 400 | `LEAVE_VALIDATION_FAILED` | Bad field, date format, range, id, or pagination value |
| 400 | `LEAVE_NO_WORKING_DAYS` | Every day in the requested leave range is already an off |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `LEAVE_NO_HOTEL_SCOPE` | Token has no hotel (e.g. a gig worker, or a stale session) |
| 403 | `LEAVE_REQUESTER_FORBIDDEN` | Role cannot request leave |
| 403 | `LEAVE_APPROVER_FORBIDDEN` | Role cannot review leave or manage offs |
| 403 | `LEAVE_EMPLOYEE_INACTIVE` | Requester or reviewer is not ACTIVE in this hotel |
| 403 | `LEAVE_SELF_REVIEW_FORBIDDEN` | Trying to approve or reject your own request |
| 404 | `LEAVE_REQUEST_NOT_FOUND` | Request missing, in another hotel, or not visible to the caller |
| 404 | `DAY_OFF_NOT_FOUND` | Off missing or in another hotel |
| 404 | `EMPLOYEE_NOT_FOUND` | An employee in `userIds` is not in this hotel |
| 409 | `LEAVE_OVERLAP` | Overlaps a pending or approved request |
| 409 | `LEAVE_NOT_PENDING` | Already approved, rejected, or cancelled |
| 409 | `LEAVE_NOT_CANCELLABLE` | Rejected/cancelled, or approved and already started |
| 409 | `LEAVE_CONCURRENT_UPDATE` | Changed by someone else at the same moment. Refresh and retry |
| 409 | `DAY_OFF_CONCURRENT_UPDATE` | Schedule changed during assignment. Refresh and retry |

## Frontend notes

- **Approval queue:** `GET /leave/requests?status=PENDING`. Use `meta.total` for the badge count.
- **Show the cancel button** only when `status === "PENDING"`, or `status === "APPROVED"` and `fromDate` is later than today in IST.
- **Reject dialog:** make the note field required. The API rejects an empty note.
- **Show `leaveDays`**, not the calendar length, as the number of days taken. `leaveDays` is recalculated when offs change.
- **Off assignment results:** show `skipped` to the manager, so they know which employees already had that day.
- **Calendar view:** request `GET /leave/offs?from&to` for the visible month. Leave in the same window comes from `GET /leave/requests?status=APPROVED&from&to`.

## Known limits and follow-ups

- **No leave balances or entitlements.** Requests are not checked against a quota. This needs a product decision and a balance model.
- **Approval does not change the roster.** An approved leave does not remove the employee from a shift. Roster assignment also does not warn about offs yet. Both are follow-ups.
- **Approver scope is the whole hotel.** The data model has no manager → employee reporting line, so every manager can review every employee in the hotel.
- **Backdating is allowed.** A request may cover past dates, for example to record sick leave. The manager's approval is the control.
- **Permissions are by role.** These routes use role lists in `leave.constants.ts`, not the RBAC permission table.
- **Race handling** uses conditional updates, a deterministic tie-break on submit, and a rollback on approve. It does not use multi-document transactions, so if the server crashes in the middle of a submit or approve, a rare inconsistency can persist. Submit can leave a duplicate `PENDING` request, and approve can leave two overlapping `APPROVED` requests. Managers can spot the second case in `GET /leave/requests?status=APPROVED` and reject one. Transactions would close this gap, but they need a replica set.
