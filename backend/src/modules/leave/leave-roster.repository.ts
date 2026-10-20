// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-roster.repository.ts
//
// Leave approval removes an employee from the rosters they were assigned to in
// the approved date range. The request stores those roster ids so an HR veto can
// restore the same assignments without adding the employee to unrelated shifts.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { RosterModel } from "../rosters/roster.model";

export interface LeaveRosterRepository {
  /** Finds roster ids where the employee is currently assigned within [from, to]. */
  findEmployeeRosterIdsInRange(
    hotelId: string,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<string[]>;
  /** Removes the employee only from the given roster ids. Returns how many rosters changed. */
  removeEmployeeFromRosters(hotelId: string, userId: string, rosterIds: string[]): Promise<number>;
  /** Restores the employee to the captured roster ids still inside [from, to]. */
  restoreEmployeeToRosters(
    hotelId: string,
    userId: string,
    rosterIds: string[],
    from: Date,
    to: Date,
  ): Promise<number>;
}

export const leaveRosterRepository: LeaveRosterRepository = {
  async findEmployeeRosterIdsInRange(hotelId, userId, from, to) {
    const employee = new Types.ObjectId(userId);
    const rosters = await RosterModel.find({
      hotelId,
      date: { $gte: from, $lte: to },
      employees: employee,
    })
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();
    return rosters.map((roster) => String(roster._id));
  },

  async removeEmployeeFromRosters(hotelId, userId, rosterIds) {
    if (rosterIds.length === 0) return 0;
    const employee = new Types.ObjectId(userId);
    const result = await RosterModel.updateMany(
      {
        hotelId,
        _id: { $in: rosterIds.map((id) => new Types.ObjectId(id)) },
        employees: employee,
      },
      { $pull: { employees: employee } },
    );
    return result.modifiedCount;
  },

  async restoreEmployeeToRosters(hotelId, userId, rosterIds, from, to) {
    if (rosterIds.length === 0) return 0;
    const employee = new Types.ObjectId(userId);
    const result = await RosterModel.updateMany(
      {
        hotelId,
        _id: { $in: rosterIds.map((id) => new Types.ObjectId(id)) },
        date: { $gte: from, $lte: to },
      },
      { $addToSet: { employees: employee } },
    );
    return result.modifiedCount;
  },
};
