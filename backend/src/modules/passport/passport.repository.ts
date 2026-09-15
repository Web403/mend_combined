// ─────────────────────────────────────────────────────────────────────────────
// modules/passport/passport.repository.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PassportModel } from "./passport.model";
import type { IPassport } from "../../shared/interfaces/passport";

export class PassportRepository {
  async create(data: Partial<IPassport>): Promise<IPassport> {
    return PassportModel.create(data);
  }

  async findByUserId(userId: string): Promise<IPassport | null> {
    return PassportModel.findOne({ userId }).lean();
  }

  async findByCredentialNumber(credentialNumber: string): Promise<IPassport | null> {
    return PassportModel.findOne({ credentialNumber }).lean();
  }

  async findByHotel(
    hotelId: string,
    opts: { page?: number; limit?: number } = {}
  ): Promise<{ passports: IPassport[]; total: number }> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const [passports, total] = await Promise.all([
      PassportModel.find({ hotelId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PassportModel.countDocuments({ hotelId }),
    ]);

    return { passports: passports as IPassport[], total };
  }

  async update(userId: string, data: Partial<IPassport>): Promise<IPassport | null> {
    return PassportModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true }
    ).lean();
  }

  /** Append a compliance history entry (called after a hotel evaluation). */
  async pushComplianceHistory(
    userId: string,
    entry:  IPassport["complianceHistory"][number]
  ): Promise<void> {
    await PassportModel.updateOne(
      { userId },
      { $push: { complianceHistory: { $each: [entry], $position: 0 } } }
    );
  }
}
