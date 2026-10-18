// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/day-off.repository.ts
// Database access for scheduled offs. Every query is scoped by `hotelId`.
// ─────────────────────────────────────────────────────────────────────────────

import { QueryFilter, Types } from "mongoose";
import { IDayOff } from "../../shared/interfaces/leave.d";
import { DayOffModel } from "./day-off.model";
import { DayOffListFilters } from "./leave.validation";

export interface DayOffRepository {
  /** Offs for the given employees within [from, to], used to exclude scheduled offs from leave days. */
  findByUsersInRange(
    hotelId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<IDayOff[]>;
  findPage(
    hotelId: string,
    filters: DayOffListFilters,
  ): Promise<{ items: IDayOff[]; total: number }>;
  findByIdInHotel(hotelId: string, id: string): Promise<IDayOff | null>;
  insertMany(docs: Partial<IDayOff>[]): Promise<IDayOff[]>;
  deleteById(hotelId: string, id: string): Promise<void>;
}

export const dayOffRepository: DayOffRepository = {
  async findByUsersInRange(hotelId, userIds, from, to) {
    if (userIds.length === 0) return [];
    return DayOffModel.find({
      hotelId,
      userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1, _id: 1 })
      .lean<IDayOff[]>();
  },

  async findPage(hotelId, filters) {
    const filter: QueryFilter<IDayOff> = {
      hotelId,
      date: { $gte: filters.from, $lte: filters.to },
    };
    if (filters.userId) filter.userId = new Types.ObjectId(filters.userId);
    if (filters.type) filter.type = filters.type;

    const [items, total] = await Promise.all([
      DayOffModel.find(filter)
        .sort({ date: 1, _id: 1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .lean<IDayOff[]>(),
      DayOffModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async findByIdInHotel(hotelId, id) {
    return DayOffModel.findOne({ _id: id, hotelId }).lean<IDayOff>();
  },

  async insertMany(docs) {
    // ordered:false so one duplicate does not stop the rest of the batch.
    const inserted = await DayOffModel.insertMany(docs, { ordered: false });
    return inserted as unknown as IDayOff[];
  },

  async deleteById(hotelId, id) {
    await DayOffModel.deleteOne({ _id: id, hotelId });
  },
};
