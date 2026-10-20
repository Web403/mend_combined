// ─────────────────────────────────────────────────────────────────────────────
// shared/enums/leave.enum.ts
//
// Leave vs Off — the distinction this module is built on:
//
//   • LEAVE  — an absence the EMPLOYEE asks for (a date range, a type, a reason).
//              It is reviewed by a manager and/or HR; an HR decision takes precedence.
//              Leave days are the working days inside the range.
//
//   • OFF    — a non-working day the MANAGER schedules for an employee (weekly
//              rest day, compensatory off, hotel-declared holiday). It is part
//              of the schedule, so it needs no approval and it is never counted
//              against an employee's leave.
// ─────────────────────────────────────────────────────────────────────────────

/** Category of an employee-requested absence. */
export enum LeaveType {
  CASUAL = "CASUAL",
  SICK = "SICK",
  EARNED = "EARNED",
  UNPAID = "UNPAID",
  OTHER = "OTHER",
}

/** Lifecycle of a leave request. */
export enum LeaveRequestStatus {
  /** Submitted by the employee, with no effective manager or HR decision yet. */
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  /** Withdrawn by the employee before it started (or while still pending). */
  CANCELLED = "CANCELLED",
}

/** A manager or HR decision recorded on a leave request. */
export enum LeaveReviewDecision {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/** Review lane; HR has the higher-priority decision. */
export enum LeaveReviewerRole {
  MANAGER = "MANAGER",
  HR = "HR",
}

/** Kind of scheduled non-working day assigned by a manager. */
export enum DayOffType {
  WEEKLY_OFF = "WEEKLY_OFF",
  COMP_OFF = "COMP_OFF",
  HOLIDAY = "HOLIDAY",
}
