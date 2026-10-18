// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-employee.repository.ts
// Read-only lookups of hotel staff (User records) needed by the leave module.
// ─────────────────────────────────────────────────────────────────────────────

import { UserModel } from "../users/user.model";
import { UserStatus } from "../../shared/enums/user";

export interface LeaveEmployeeRecord {
  _id: unknown;
  role: string;
  status: UserStatus;
  profile: { firstName: string; lastName: string };
}

const PROJECTION = "role status profile.firstName profile.lastName";

export interface LeaveEmployeeRepository {
  /** The user only if they belong to the hotel and are ACTIVE. */
  findActiveInHotel(hotelId: string, userId: string): Promise<LeaveEmployeeRecord | null>;
  /** Every listed user that belongs to the hotel, regardless of status. */
  findInHotel(hotelId: string, userIds: string[]): Promise<LeaveEmployeeRecord[]>;
}

export const leaveEmployeeRepository: LeaveEmployeeRepository = {
  async findActiveInHotel(hotelId, userId) {
    return UserModel.findOne({ _id: userId, hotelId, status: UserStatus.ACTIVE })
      .select(PROJECTION)
      .lean<LeaveEmployeeRecord>();
  },

  async findInHotel(hotelId, userIds) {
    if (userIds.length === 0) return [];
    return UserModel.find({ _id: { $in: userIds }, hotelId })
      .select(PROJECTION)
      .lean<LeaveEmployeeRecord[]>();
  },
};
