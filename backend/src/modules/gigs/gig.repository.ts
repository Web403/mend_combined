// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/gig.repository.ts
// All Mongoose queries for Gig documents
// Requirements: 1.1–1.10, 7.1–7.7, 12.1–12.5
// ─────────────────────────────────────────────────────────────────────────────

import { GigModel } from "./gig.model";
import { IGig, GigListOptions } from "../../shared/interfaces/gigs.d";
import { GigStatus } from "../../shared/enums/recruitment";

const MAX_LIMIT = 100;

export class GigRepository {
  // ── Write ───────────────────────────────────────────────────────────────────

  async create(data: Partial<IGig>): Promise<IGig> {
    return GigModel.create(data);
  }

  async update(
    hotelId: any,
    gigId: string,
    data: Partial<IGig>,
  ): Promise<IGig | null> {
    return GigModel.findOneAndUpdate({ hotelId, id: gigId }, data, {
      new: true,
    }).lean();
  }

  async delete(hotelId: string, gigId: string): Promise<IGig | null> {
    return GigModel.findOneAndDelete({ hotelId, id: gigId }).lean();
  }

  /**
   * Atomically increments filledSlots by delta (+1 or -1).
   * Avoids race conditions via $inc (Requirements 8.1, 9.1).
   */
  async incrementFilledSlots(
    gigId: string,
    delta: 1 | -1,
  ): Promise<IGig | null> {
    return GigModel.findOneAndUpdate(
      { id: gigId },
      { $inc: { filledSlots: delta } },
      { new: true },
    ).lean();
  }

  /**
   * Bulk-cancels all OPEN and DRAFT gigs for a hotel with a block reason.
   * Requirement 14.1
   */
  async blockAllForHotel(hotelId: string, reason: string): Promise<number> {
    const result = await GigModel.updateMany(
      { hotelId, status: { $in: [GigStatus.OPEN, GigStatus.DRAFT] } },
      { status: GigStatus.CANCELLED, blockReason: reason },
    );
    return result.modifiedCount;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findById(gigId: string): Promise<IGig | null> {
    return GigModel.findOne({ id: gigId }).lean();
  }

  async findByIdAndHotel(hotelId: string, gigId: string): Promise<IGig | null> {
    return GigModel.findOne({ hotelId, id: gigId }).lean();
  }

  /**
   * Public marketplace: only OPEN gigs with startAt in the future.
   * Requirements: 7.1–7.7, 16.1
   * Max limit enforced at 100 (Requirement 7.7).
   */
  async findPublicListings(
    options: GigListOptions = {},
  ): Promise<{ gigs: IGig[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(options.limit ?? 25, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      status: GigStatus.OPEN,
      startAt: { $gt: new Date() }, // Requirement 7.1, 16.1 — exclude past gigs
    };

    if (filters.department) query.department = filters.department;
    if (filters.certificationRequired)
      query.certificationRequired = filters.certificationRequired;

    if (filters.startAfter || filters.startBefore) {
      const startAtFilter: Record<string, unknown> = { $gt: new Date() };
      if (filters.startAfter) startAtFilter.$gte = filters.startAfter; // Requirement 7.4
      if (filters.startBefore) startAtFilter.$lt = filters.startBefore; // Requirement 7.5
      query.startAt = startAtFilter;
    }

    const [gigs, total] = await Promise.all([
      GigModel.find(query)
        .sort({ startAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("hotelId", "name")
        .lean(), // Requirement 7.6
      GigModel.countDocuments(query),
    ]);

    return { gigs: gigs as IGig[], total };
  }

  /**
   * Hotel dashboard: all gigs for a hotel, any status.
   * Requirements: 12.1, 12.4–12.5, 16.3
   * Max limit enforced at 100 (Requirement 12.5).
   */
  async findByHotel(
    hotelId: string,
    options: GigListOptions = {},
  ): Promise<{ gigs: IGig[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(options.limit ?? 25, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { hotelId };

    if (filters.status) query.status = filters.status; // Requirement 12.4
    if (filters.department) query.department = filters.department;

    if (filters.startAfter || filters.startBefore) {
      const startAtFilter: Record<string, unknown> = {};
      if (filters.startAfter) startAtFilter.$gte = filters.startAfter;
      if (filters.startBefore) startAtFilter.$lt = filters.startBefore;
      query.startAt = startAtFilter;
    }

    const [gigs, total] = await Promise.all([
      GigModel.find(query)
        .sort({ startAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .populate("hotelId", "name"),
      GigModel.countDocuments(query),
    ]);

    return { gigs: gigs as IGig[], total };
  }

  /**
   * Aggregate count of gigs grouped by status for a hotel.
   * Requirement 12.3
   */
  async countByStatus(
    hotelId: string,
  ): Promise<{ status: string; count: number }[]> {
    return GigModel.aggregate([
      { $match: { hotelId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);
  }
}
