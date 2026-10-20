# Leave & Off Management API

Base path: `/api/v1/leave` · Auth: `Authorization: Bearer <JWT>`

This module covers two different things that look similar but behave differently:

| | **Leave** (`/requests`) | **Off** (`/offs`) |
|---|---|---|
| What it is | An absence the **employee asks for**: date range, type, reason | A non-working day the **manager schedules** |
| Who creates it | Employee | Manager / admin / hotel owner |
| Approval | Manager decisions take effect immediately; HR may override either decision | None; it takes effect when assigned |
| Types | `CASUAL`, `SICK`, `EARNED`, `UNPAID`, `OTHER` | `WEEKLY_OFF`, `COMP_OFF`, `HOLIDAY` |
| Effect on leave | Counts as leave days | Never counts as leave; removed from leave day counts |

**Leave days** of a request = inclusive calendar days from `fromDate` to `toDate`, minus any scheduled offs the employee has on those days. A Sat–Sun request where Sunday is a weekly off is 1 leave day.

## Who can do what

| Action | Employee (`EMPLOYEE`) | HR (`HR`) | Manager / Admin (`MANAGER`, `ADMIN`) | Hotel owner (`HOTEL`) | Gig worker (`STUDENT`, `PROFESSIONAL`) |
|---|---|---|---|---|---|
| Submit / list own / cancel own leave | Yes | Yes | Yes (managers can also be employees) | No | No (403) |
| List all leave in the hotel | No | Yes | Yes | Yes | No |
| Approve / reject leave | No | Yes; HR decision has highest priority | Yes, except their own requests | Yes | No |
| Assign / list all / remove offs | No | No (unless also manager/admin) | Yes | Yes | No |
| View own offs | Yes | Yes | Yes | No | No |

Rules that apply to everyone:

- **Tenant comes from the token only.** The hotel is `hotelId` in the JWT for staff, and the `sub` for the hotel-owner account. The `X-Hotel-Id` header is ignored by this module.
- A request that belongs to another hotel returns **404**, not 403, so ids cannot be probed across tenants.
- **Nobody reviews their own request.** Returns 403 `LEAVE_SELF_REVIEW_FORBIDDEN`.
- Only **ACTIVE** staff can request leave or review. Suspended accounts are refused.
- **HR has final authority.** A manager's approval or rejection takes effect immediately, but an HR approval or rejection overrides it. If HR votes first, a later manager vote is recorded for audit and cannot change the status. Each lane may decide once; an HR decision remains final.

## Conventions

- **Dates** are `YYYY-MM-DD` calendar dates and are inclusive. Invalid calendar dates such as `2026-02-30` are rejected.
- **"Today"** for business rules is computed in `Asia/Kolkata`.
- **Envelope:** `{ "success": boolean, "message": string, "data": any, "meta"?: object }`.
- **Errors:** `meta.code` is a stable machine-readable code. Branch on the code, not the message.
- **Pagination:** query `page` (default 1) and `limit` (default 20, max 100). Response `meta`: `{ page, limit, total, totalPages }`.
- **IDs** are 24-character hex strings. A malformed id returns 400 `LEAVE_VALIDATION_FAILED`.

## Lifecycle of a leave request

```
PENDING ──manager approve──▶ APPROVED
   │  ├──manager reject───▶ REJECTED
   │  └──employee cancel──▶ CANCELLED

PENDING / APPROVED / REJECTED ──HR approve──▶ APPROVED
PENDING / APPROVED / REJECTED ──HR reject───▶ REJECTED
APPROVED ──employee cancel──▶ CANCELLED  (only before the leave starts)
```

A manager's vote changes the status immediately. HR can later override either outcome: HR approval grants leave even after a manager rejection, while HR rejection declines leave even after a manager approval. When HR acts first, a later manager vote is retained in the response but does not change HR's outcome. `GET /leave/requests?pendingFor=HR` lists every request still awaiting HR, including manager-approved or manager-rejected requests; similarly use `pendingFor=MANAGER` for requests without a manager vote. Do not combine `pendingFor` with `status=PENDING` if the goal is to get the full lane queue.

**Nothing is backdated.** Leave cannot start before today (IST), and offs cannot be scheduled or removed for a past date. An approval that would grant leave is refused if its start date has passed; a rejection may still be recorded.

**Approval removes the employee from rosters.** Approving a leave takes the employee off the specific rosters they were assigned to in the leave's date range. If HR later vetoes a manager approval, those same roster assignments are restored. See "Rosters and leave" below.

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
- `fromDate` must not be before today (IST), otherwise 400 `LEAVE_BACKDATED`
- Rejected if it overlaps one of the employee's **PENDING or APPROVED** requests (409 `LEAVE_OVERLAP`), or if every day is an existing off (400 `LEAVE_NO_WORKING_DAYS`)
- `userId`, `hotelId`, `status` and similar fields in the body are ignored

Response `data`: a **LeaveRequestDto** (see below).

#### 2. List my leave requests — employee
`GET /leave/requests/mine?status=&type=&from=&to=&page=&limit=`

- `from` and `to` must be given together and filter for overlap with the range.
- Returns only the caller's requests.
- Response: `data: LeaveRequestDto[]`, plus `meta` pagination.

#### 3. List all leave requests — manager / HR / admin / hotel owner
`GET /leave/requests?status=&pendingFor=&type=&userId=&from=&to=&page=&limit=`

- HR and managers can see every request in the hotel, whatever its effective status.
- `status` filters by the effective request status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
- `pendingFor=HR|MANAGER` filters for non-cancelled requests that have not yet received a vote in that review lane. This is the recommended queue filter and may include requests whose effective `status` is already `APPROVED` or `REJECTED`.
- `userId` narrows to one employee.
- Response: `data: LeaveRequestDto[]` with `employee` names filled in, plus `meta` pagination.

#### 4. Get one leave request — owner, manager, or HR
`GET /leave/requests/:id` → 200 · 404 `LEAVE_REQUEST_NOT_FOUND` if it doesn't exist or isn't visible to the caller.

#### 5. Cancel my leave request — employee
`PATCH /leave/requests/:id/cancel` → 200

Allowed when the request is `PENDING`, or `APPROVED` with `fromDate` later than today (IST). Otherwise 409 `LEAVE_NOT_CANCELLABLE`. Another employee's id returns 404.

#### 6. Approve — manager / HR / admin / hotel owner
`PATCH /leave/requests/:id/approve`

Body (optional): `{ "note": "Covered by Deepak" }` (max 500 characters)

Managers/admins/hotel owners record the manager-lane vote. HR records the HR-lane vote. The endpoint returns both votes; the request `status` reflects the effective result, with HR's vote taking precedence. The other lane may still vote once after the first decision.

An approval that would grant leave is refused with 409 `LEAVE_START_DATE_PASSED` if `fromDate` is before today (IST). Approval checks for overlapping approved leave both before and after the conditional update; a conflict is rolled back to the prior review state and returns 409 `LEAVE_OVERLAP`.

When an approval takes effect, the employee is removed only from the rosters they were assigned to in the date range. If HR later rejects a manager-approved request, those assignments are restored. The roster write is not transactional; a failed roster update rolls the review back so it can be retried.

#### 7. Reject — manager / HR / admin / hotel owner
`PATCH /leave/requests/:id/reject`

Body (**required**): `{ "note": "Two chefs already off that week" }` (1–500 characters)

Managers and HR each get one vote per request. An HR rejection can change an already-approved request to `REJECTED`; an HR approval can change a manager-rejected request to `APPROVED`. A later manager vote cannot change an already-recorded HR outcome.

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
- `fromDate` must not be before today (IST), otherwise 400 `DAY_OFF_BACKDATED`. The whole batch is refused.
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
`DELETE /leave/offs/:id` → 200 `{ "id": "…", "deleted": true }` · 404 `DAY_OFF_NOT_FOUND` · 400 `DAY_OFF_BACKDATED` if the off's date has passed (IST)

### Rosters and leave

Roster create and update check each assigned employee against their offs and leave. They **warn but do not block**: the assignment is saved, and the response lists what was overridden.

- `POST /api/v1/roster/create-roster` → 201 · `PUT /api/v1/roster/update-roster/:id` → 200

The response keeps its usual `data` shape. `meta.warnings` is always present and is an array (empty when there are no conflicts):

```json
{
  "success": true,
  "message": "Success",
  "data": [ { "_id": "…", "date": "2026-11-03T00:00:00.000Z", "shiftId": "…", "employees": ["…"] } ],
  "meta": {
    "warnings": [
      { "kind": "DAY_OFF", "employeeId": "65a1…", "date": "2026-11-03", "offType": "COMP_OFF" },
      { "kind": "APPROVED_LEAVE", "employeeId": "65a2…", "date": "2026-11-03", "leaveId": "…", "leaveType": "SICK" },
      { "kind": "PENDING_LEAVE", "employeeId": "65a2…", "date": "2026-11-04", "leaveId": "…", "leaveType": "CASUAL" }
    ]
  }
}
```

| `kind` | Meaning |
|---|---|
| `DAY_OFF` | The employee has a scheduled off that day. Carries `offType`. |
| `APPROVED_LEAVE` | The employee has approved leave covering that day. Carries `leaveId`, `leaveType`. |
| `PENDING_LEAVE` | The employee has leave awaiting a decision that day. Carries `leaveId`, `leaveType`. |

Warnings are sorted by date, then employee, then kind. Rejected and cancelled leave produce no warning.

Create (`create-roster`) takes `fromDate`, `toDate` (inclusive, one roster per calendar day, stored at UTC midnight), `shiftId` and `employees`. Update (`update-roster`) takes any of `date`, `shiftId` and `employees`. Other fields in the body, including `hotelId`, are ignored. The warnings describe the roster as stored after the change.

Errors from the roster module use the standard envelope with `meta.code`: 400 `INVALID_DATE` (unparseable date, or `toDate` before `fromDate`), 404 `ROSTER_NOT_FOUND`.

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
  reviewedBy: string | null; // id of the effective reviewer (HR when HR has voted)
  reviewedAt: string | null; // ISO timestamp
  reviewedByRole: "MANAGER" | "HR" | null;
  reviewNote: string | null;
  managerReview: {
    decision: "APPROVED" | "REJECTED";
    reviewedBy: string;
    reviewedAt: string; // ISO timestamp
    note: string | null;
  } | null;
  hrReview: {
    decision: "APPROVED" | "REJECTED";
    reviewedBy: string;
    reviewedAt: string; // ISO timestamp
    note: string | null;
  } | null;
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
| 400 | `LEAVE_BACKDATED` | Leave request starts before today (IST) |
| 400 | `DAY_OFF_BACKDATED` | Off assigned or removed for a date before today (IST) |
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
| 409 | `LEAVE_NOT_PENDING` | This reviewer lane already voted, or the request was cancelled |
| 409 | `LEAVE_START_DATE_PASSED` | An approval that would grant leave was attempted after its start date |
| 409 | `LEAVE_NOT_CANCELLABLE` | Rejected/cancelled, or approved and already started |
| 409 | `LEAVE_CONCURRENT_UPDATE` | Changed by someone else at the same moment. Refresh and retry |
| 409 | `DAY_OFF_CONCURRENT_UPDATE` | Schedule changed during assignment. Refresh and retry |

## Frontend notes

- **Manager queue:** `GET /leave/requests?pendingFor=MANAGER`. **HR queue:** `GET /leave/requests?pendingFor=HR`. Use `meta.total` for each lane's badge count; HR's queue can contain manager-approved or manager-rejected requests.
- **Show the cancel button** only when `status === "PENDING"`, or `status === "APPROVED"` and `fromDate` is later than today in IST.
- **Reject dialog:** make the note field required. The API rejects an empty note.
- **Show `leaveDays`**, not the calendar length, as the number of days taken. `leaveDays` is recalculated when offs change.
- **Off assignment results:** show `skipped` to the manager, so they know which employees already had that day.
- **Calendar view:** request `GET /leave/offs?from&to` for the visible month. Leave in the same window comes from `GET /leave/requests?status=APPROVED&from&to`.

## Known limits and follow-ups

- **No leave balances or entitlements.** Requests are not checked against a quota. This needs a product decision and a balance model.
- **Cancelling an approved leave does not restore the roster.** Approval removes the employee from rostered shifts. If the leave is then cancelled, the manager must add the employee back by hand.
- **A roster write can race an approval.** If someone adds the employee to a roster at the same moment as approval, they can briefly be on both. The roster warnings show it as `APPROVED_LEAVE` on the next roster write for that day.
- **Rosters can be created for past dates.** Only leave and offs are refused for past dates. Roster creation is not checked.
- **Approver scope is the whole hotel.** The data model has no manager → employee reporting line, so every manager can review every employee in the hotel.
- **Recording past sick leave needs a separate path.** Backdating is refused, so a sick day that has already passed cannot be entered as leave. A manager-recorded past absence needs a product decision and is not built.
- **Permissions are by role.** These routes use role lists in `leave.constants.ts`, not the RBAC permission table.
- **Race handling** uses conditional writes and a deterministic tie-break on submit, but request and roster writes are not covered by a MongoDB transaction. A server crash between those writes can leave a rare inconsistency; retry the same-lane decision after checking the request and roster state.
- **Pre-existing approvals have no roster snapshot.** New approvals store the roster ids needed to restore assignments after an HR veto. An already-approved legacy record created before this change has no such snapshot, so HR can change its status but the backend cannot reconstruct which prior roster assignments to restore.
