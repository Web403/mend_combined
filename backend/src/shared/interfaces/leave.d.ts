// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/leave.d.ts
// Leave requests (employee-initiated absence) and day offs (manager-scheduled
// non-working days). See shared/enums/leave.enum.ts for the distinction.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import {
  DayOffType,
  LeaveRequestStatus,
  LeaveReviewDecision,
  LeaveReviewerRole,
  LeaveType,
} from "../enums/leave.enum";

/** A separate review record for the manager and HR decision lanes. */
export interface ILeaveReview {
  decision: LeaveReviewDecision;
  /** Actor id of the reviewer (User._id, or Hotel._id for owner accounts). */
  reviewedBy: string;
  reviewedAt: Date;
  note?: string;
}

/** Mongoose document shape — `leaverequests` collection. */
export interface ILeaveRequest {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  /** The employee who asked for the leave (User._id). */
  userId: Types.ObjectId;
  type: LeaveType;
  /** Stored as UTC midnight of the calendar date (date-only semantics). */
  fromDate: Date;
  /** Inclusive. Stored as UTC midnight of the calendar date. */
  toDate: Date;
  reason: string;
  status: LeaveRequestStatus;
  /** Independent votes; HR's vote is the effective decision when present. */
  managerReview?: ILeaveReview;
  hrReview?: ILeaveReview;
  /** Roster ids removed when approval took effect, for HR-veto restoration. */
  approvalRosterIds?: string[];
  /** Backwards-compatible effective-decision fields (HR takes precedence). */
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewedByRole?: LeaveReviewerRole;
  reviewNote?: string | null;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Mongoose document shape — `dayoffs` collection. */
export interface IDayOff {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  userId: Types.ObjectId;
  /** UTC midnight of the calendar date. */
  date: Date;
  type: DayOffType;
  note?: string;
  /** Actor id of the manager who scheduled the off. */
  assignedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Response DTOs (wire format — dates are YYYY-MM-DD strings) ────────────────

export interface LeaveEmployeeSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LeaveReviewDto {
  decision: LeaveReviewDecision;
  reviewedBy: string;
  reviewedAt: string;
  note: string | null;
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  employee: LeaveEmployeeSummaryDto | null;
  type: LeaveType;
  status: LeaveRequestStatus;
  fromDate: string;
  toDate: string;
  /** Inclusive calendar days in the range, minus the employee's scheduled offs. */
  leaveDays: number;
  reason: string;
  /** Effective decision fields retained for clients that used the single-review API. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewedByRole: LeaveReviewerRole | null;
  reviewNote: string | null;
  /** The manager and HR votes are both returned; HR's decision controls `status`. */
  managerReview: LeaveReviewDto | null;
  hrReview: LeaveReviewDto | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayOffDto {
  id: string;
  employeeId: string;
  date: string;
  type: DayOffType;
  note: string | null;
  assignedBy: string;
  createdAt: string;
}
