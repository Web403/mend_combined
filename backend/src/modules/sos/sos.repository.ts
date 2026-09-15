// ─────────────────────────────────────────────────────────────────────────────
// modules/sos/sos.repository.ts
//
// All MongoDB access for the SOS module.
// The service layer must not reference SOSModel directly.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from "uuid";
import { SOSModel } from "./sos.model";
import type { ISOS } from "../../shared/interfaces";

export class SOSRepository {
  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Find an SOS alert by ID.
   */
  async findById(id: string): Promise<ISOS | null> {
    return SOSModel.findOne({ id }).lean();
  }

  /**
   * Find SOS alerts by hotel ID and status.
   */
  async findByHotelAndStatus(
    hotelId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ISOS[]> {
    const query: any = { hotelId };
    if (status) query.status = status;

    return SOSModel.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Find open SOS alerts for a user.
   */
  async findOpenByUser(userId: string): Promise<ISOS[]> {
    return SOSModel.find({
      userId,
      status: { $in: ["OPEN", "ESCALATED"] }
    }).lean();
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Create a new SOS alert.
   */
  async create(data: Partial<ISOS>): Promise<ISOS> {
    const id = uuidv4();
    const sos = new SOSModel({ ...data, id });
    return sos.save();
  }

  /**
   * Update SOS status and escalation level.
   */
  async updateStatus(
    id: string,
    status: "OPEN" | "ESCALATED" | "RESOLVED",
    escalationLevel?: number
  ): Promise<ISOS | null> {
    const update: any = { status };
    if (escalationLevel !== undefined) update.escalationLevel = escalationLevel;

    return SOSModel.findOneAndUpdate(
      { id },
      update,
      { new: true }
    ).lean();
  }

  /**
   * Delete an SOS alert (for testing or admin purposes).
   */
  async delete(id: string): Promise<boolean> {
    const result = await SOSModel.deleteOne({ id });
    return result.deletedCount > 0;
  }
}