// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.error.ts
//
// Every failure the leave / off module can report, as a stable machine `code`
// plus a client-safe message. Extends AppError so the global error handler
// also understands it; controllers add `code` to the response meta.
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "../../core/middleware/error.middleware";

export class LeaveError extends AppError {
  constructor(
    public readonly code: string,
    message: string,
    statusCode = 400,
  ) {
    super(message, statusCode);
    this.name = "LeaveError";
  }
}

export const LeaveErrors = {
  // 400 — input
  validation: (reason: string) => new LeaveError("LEAVE_VALIDATION_FAILED", reason, 400),
  backdated: () =>
    new LeaveError(
      "LEAVE_BACKDATED",
      "Leave cannot start before today. Ask your manager to record past absences",
      400,
    ),
  dayOffBackdated: () =>
    new LeaveError(
      "DAY_OFF_BACKDATED",
      "Offs cannot be scheduled or removed for dates before today",
      400,
    ),
  noWorkingDays: () =>
    new LeaveError(
      "LEAVE_NO_WORKING_DAYS",
      "Every day in the requested range is already a scheduled off, so there is no leave to take",
      400,
    ),

  // 401 / 403 — who is asking
  unauthenticated: () => new LeaveError("UNAUTHENTICATED", "Authentication is required", 401),
  noHotelScope: () =>
    new LeaveError(
      "LEAVE_NO_HOTEL_SCOPE",
      "This session is not linked to a hotel. Sign in again to manage leave",
      403,
    ),
  requesterForbidden: () =>
    new LeaveError("LEAVE_REQUESTER_FORBIDDEN", "Your role cannot request leave", 403),
  approverForbidden: () =>
    new LeaveError(
      "LEAVE_APPROVER_FORBIDDEN",
      "Only managers and administrators can review leave or manage offs",
      403,
    ),
  inactiveEmployee: () =>
    new LeaveError(
      "LEAVE_EMPLOYEE_INACTIVE",
      "Your account must be active in this hotel to request or review leave",
      403,
    ),
  selfReviewForbidden: () =>
    new LeaveError("LEAVE_SELF_REVIEW_FORBIDDEN", "You cannot review your own leave request", 403),

  // 404
  requestNotFound: () => new LeaveError("LEAVE_REQUEST_NOT_FOUND", "Leave request not found", 404),
  dayOffNotFound: () => new LeaveError("DAY_OFF_NOT_FOUND", "Day off not found", 404),
  employeesNotFound: (ids: string[]) =>
    new LeaveError(
      "EMPLOYEE_NOT_FOUND",
      `Employees not found in this hotel: ${ids.join(", ")}`,
      404,
    ),

  // 409 — state / conflicts
  overlappingLeave: () =>
    new LeaveError(
      "LEAVE_OVERLAP",
      "This date range overlaps a leave request that is already pending or approved",
      409,
    ),
  notPending: (status: string) =>
    new LeaveError(
      "LEAVE_NOT_PENDING",
      `Only pending leave requests can be reviewed (current status: ${status})`,
      409,
    ),
  startDatePassed: () =>
    new LeaveError(
      "LEAVE_START_DATE_PASSED",
      "This leave's start date has passed, so it can no longer be approved. Reject it instead",
      409,
    ),
  notCancellable: () =>
    new LeaveError(
      "LEAVE_NOT_CANCELLABLE",
      "Only pending leave, or approved leave that has not started yet, can be cancelled",
      409,
    ),
  concurrentUpdate: () =>
    new LeaveError(
      "LEAVE_CONCURRENT_UPDATE",
      "This leave request was changed by someone else. Refresh and try again",
      409,
    ),
  dayOffsConcurrentUpdate: () =>
    new LeaveError(
      "DAY_OFF_CONCURRENT_UPDATE",
      "The schedule was changed while offs were being assigned. Refresh and try again",
      409,
    ),
};
