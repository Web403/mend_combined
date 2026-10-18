// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/leave.d.ts
// Leave requests (employee-initiated absence) and day offs (manager-scheduled
// non-working days). See shared/enums/leave.enum.ts for the distinction.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { DayOffType, LeaveRequestStatus, LeaveType } from "../enums/leave.enum";

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
  /** Actor id of the approver/rejecter (User._id, or Hotel._id for owner accounts). */
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
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
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
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
