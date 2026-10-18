// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-roster.repository.ts
//
// The leave module's only write into the roster. When leave is approved, the
// employee is taken off every roster they were assigned to in the leave's date
// range. Pulling is idempotent, so retrying after a failure is safe.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { RosterModel } from "../rosters/roster.model";

export interface LeaveRosterRepository {
  /** Removes the employee from every roster of the hotel in [from, to]. Returns how many rosters changed. */
  removeEmployeeFromRange(hotelId: string, userId: string, from: Date, to: Date): Promise<number>;
}

export const leaveRosterRepository: LeaveRosterRepository = {
  async removeEmployeeFromRange(hotelId, userId, from, to) {
    const employee = new Types.ObjectId(userId);
    const result = await RosterModel.updateMany(
      { hotelId, date: { $gte: from, $lte: to }, employees: employee },
      { $pull: { employees: employee } },
    );
    return result.modifiedCount;
  },
};
