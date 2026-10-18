// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.mapper.ts
// Converts stored documents into the wire DTOs documented in LEAVE.md.
// ─────────────────────────────────────────────────────────────────────────────

import { DayOffDto, IDayOff, ILeaveRequest, LeaveEmployeeSummaryDto, LeaveRequestDto } from "../../shared/interfaces/leave.d";
import { LeaveEmployeeRecord } from "./leave-employee.repository";
import { toDateOnlyString } from "./leave.date";

const toIso = (value: Date | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

export function toEmployeeSummary(record: LeaveEmployeeRecord): LeaveEmployeeSummaryDto {
  return {
    id: String(record._id),
    firstName: record.profile.firstName,
    lastName: record.profile.lastName,
    role: record.role,
  };
}

export function toLeaveRequestDto(
  doc: ILeaveRequest,
  leaveDays: number,
  employee: LeaveEmployeeSummaryDto | null,
): LeaveRequestDto {
  return {
    id: String(doc._id),
    employeeId: String(doc.userId),
    employee,
    type: doc.type,
    status: doc.status,
    fromDate: toDateOnlyString(doc.fromDate),
    toDate: toDateOnlyString(doc.toDate),
    leaveDays,
    reason: doc.reason,
    reviewedBy: doc.reviewedBy ?? null,
    reviewedAt: toIso(doc.reviewedAt),
    reviewNote: doc.reviewNote ?? null,
    cancelledAt: toIso(doc.cancelledAt),
    createdAt: toIso(doc.createdAt) as string,
    updatedAt: toIso(doc.updatedAt) as string,
  };
}

export function toDayOffDto(doc: IDayOff): DayOffDto {
  return {
    id: String(doc._id),
    employeeId: String(doc.userId),
    date: toDateOnlyString(doc.date),
    type: doc.type,
    note: doc.note ?? null,
    assignedBy: doc.assignedBy,
    createdAt: toIso(doc.createdAt) as string,
  };
}
