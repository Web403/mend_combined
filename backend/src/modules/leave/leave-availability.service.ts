// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-availability.service.ts
//
// Answers "is this employee unavailable on this day, and why?" for the roster.
// Offs and leave are kept separate because they mean different things to a
// manager:
//   DAY_OFF         scheduled non-working day (always a conflict)
//   APPROVED_LEAVE  leave the manager has approved (a conflict)
//   PENDING_LEAVE   leave still awaiting a decision (worth knowing before assigning)
// ─────────────────────────────────────────────────────────────────────────────

import { DayOffType, LeaveRequestStatus, LeaveType } from "../../shared/enums/leave.enum";
import { DayOffRepository, dayOffRepository } from "./day-off.repository";
import { LeaveRequestRepository, leaveRequestRepository } from "./leave-request.repository";
import { enumerateDays, toDateOnlyString, utcMidnight } from "./leave.date";

export type AvailabilityConflict =
  | { kind: "DAY_OFF"; employeeId: string; date: string; offType: DayOffType }
  | { kind: "APPROVED_LEAVE"; employeeId: string; date: string; leaveId: string; leaveType: LeaveType }
  | { kind: "PENDING_LEAVE"; employeeId: string; date: string; leaveId: string; leaveType: LeaveType };

export interface LeaveAvailabilityDeps {
  dayOffs: Pick<DayOffRepository, "findByUsersInRange">;
  requests: Pick<LeaveRequestRepository, "findLiveInRangeForUsers">;
}

/** Key used by `findConflicts`: `<employeeId>|<YYYY-MM-DD>`. */
export const availabilityKey = (employeeId: string, date: string): string => `${employeeId}|${date}`;

export class LeaveAvailabilityService {
  constructor(private readonly deps: LeaveAvailabilityDeps = {
    dayOffs: dayOffRepository,
    requests: leaveRequestRepository,
  }) {}

  /**
   * Every conflict for the employees on each calendar day in [from, to],
   * grouped by `availabilityKey`. Days without a conflict are absent from the map.
   */
  async findConflicts(
    hotelId: string,
    employeeIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, AvailabilityConflict[]>> {
    const conflicts = new Map<string, AvailabilityConflict[]>();
    const start = utcMidnight(from);
    const end = utcMidnight(to);
    if (employeeIds.length === 0 || end.getTime() < start.getTime()) return conflicts;

    const add = (employeeId: string, date: string, conflict: AvailabilityConflict) => {
      const key = availabilityKey(employeeId, date);
      const list = conflicts.get(key) ?? [];
      list.push(conflict);
      conflicts.set(key, list);
    };

    const [offs, leaves] = await Promise.all([
      this.deps.dayOffs.findByUsersInRange(hotelId, employeeIds, start, end),
      this.deps.requests.findLiveInRangeForUsers({ hotelId, userIds: employeeIds, from: start, to: end }),
    ]);

    for (const off of offs) {
      const employeeId = String(off.userId);
      const date = toDateOnlyString(off.date);
      add(employeeId, date, { kind: "DAY_OFF", employeeId, date, offType: off.type });
    }

    for (const leave of leaves) {
      const employeeId = String(leave.userId);
      const kind = leave.status === LeaveRequestStatus.APPROVED ? "APPROVED_LEAVE" : "PENDING_LEAVE";
      const overlapStart = leave.fromDate > start ? leave.fromDate : start;
      const overlapEnd = leave.toDate < end ? leave.toDate : end;
      for (const day of enumerateDays(overlapStart, overlapEnd)) {
        const date = toDateOnlyString(day);
        add(employeeId, date, {
          kind,
          employeeId,
          date,
          leaveId: String(leave._id),
          leaveType: leave.type,
        } as AvailabilityConflict);
      }
    }

    return conflicts;
  }
}

export const leaveAvailabilityService = new LeaveAvailabilityService();
