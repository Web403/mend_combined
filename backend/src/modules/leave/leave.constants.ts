// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.constants.ts
//
// Policy knobs and access lists for the leave / off module. Keep every limit
// here so product changes are a one-line edit with a clear review diff.
// ─────────────────────────────────────────────────────────────────────────────

import { AuthRole } from "../../shared/enums/common";
import { UserRole } from "../../shared/enums/user";

/**
 * Business timezone used to decide "today" (e.g. whether an approved leave has
 * already started and can therefore no longer be cancelled by the employee).
 * Dates are calendar dates, not instants, so this is the only place timezone
 * matters.
 */
export const LEAVE_TIMEZONE = "Asia/Kolkata";

/** Longest single leave request, in inclusive calendar days. */
export const LEAVE_REQUEST_MAX_SPAN_DAYS = 90;

/** Longest range a manager can schedule offs over in one call. */
export const DAY_OFF_ASSIGN_MAX_SPAN_DAYS = 92;

/** Upper bound on employees × calendar days in one off-assignment call. */
export const DAY_OFF_ASSIGN_MAX_CELLS = 2000;

/** Upper bound on employees named in one off-assignment call. */
export const DAY_OFF_ASSIGN_MAX_EMPLOYEES = 200;

/** Widest from/to window accepted by any list endpoint. */
export const LIST_MAX_SPAN_DAYS = 366;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const MAX_REASON_LENGTH = 500;
export const MAX_REVIEW_NOTE_LENGTH = 500;
export const MAX_DAY_OFF_NOTE_LENGTH = 300;

/**
 * Roles that may request leave. Only tenant-bound accounts qualify: gig workers
 * (STUDENT / PROFESSIONAL) are not employees of a hotel and are excluded.
 */
export const LEAVE_REQUESTER_ROLES: readonly string[] = [
  UserRole.EMPLOYEE,
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.HR,
];

/**
 * Roles that may review leave and manage offs for their hotel. The hotel owner
 * account (AuthRole.HOTEL) is always an approver for its own tenant.
 *
 * The data model has no reporting line between managers and employees, so an
 * approver's authority is tenant-wide. Narrowing it requires adding a
 * manager → reports relationship first.
 */
export const LEAVE_APPROVER_ROLES: readonly string[] = [
  UserRole.MANAGER,
  UserRole.ADMIN,
  AuthRole.HOTEL,
];
