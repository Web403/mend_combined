// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/compliance.repository.ts
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { ComplianceModel } from "./compliance.model";
import { AuditLogModel, IAuditLog } from "./audit-log.model";
import { AuditAction } from "../../shared/enums/compliance.enum";
import type { ICompliance } from "../../shared/interfaces/compliance.d";

export class ComplianceRepository {
  // ── Compliance record ──────────────────────────────────────────────────────

  async upsertCompliance(
    hotelId: string,
    data: Partial<ICompliance>
  ): Promise<ICompliance> {
    return ComplianceModel.findOneAndUpdate(
      { hotelId },
      { $set: data },
      { new: true, upsert: true }
    ).lean() as Promise<ICompliance>;
  }

  async findByHotel(hotelId: string): Promise<ICompliance | null> {
    return ComplianceModel.findOne({ hotelId }).lean();
  }

  async findAll(opts: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ records: ICompliance[]; total: number }> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      ComplianceModel.find()
        .sort({ complianceScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ComplianceModel.countDocuments(),
    ]);

    return { records: records as ICompliance[], total };
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async appendAuditLog(data: {
    hotelId:   string;
    action:    AuditAction;
    actorId:   string;
    actorRole: string;
    meta?:     Record<string, unknown>;
  }): Promise<IAuditLog> {
    return AuditLogModel.create({
      id:        `audit_${nanoid(12)}`,
      hotelId:   data.hotelId,
      action:    data.action,
      actorId:   data.actorId,
      actorRole: data.actorRole,
      meta:      data.meta ?? {},
    });
  }

  async findAuditLogs(
    hotelId: string,
    opts: { page?: number; limit?: number; action?: AuditAction } = {}
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(opts.limit ?? 25, 100);
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { hotelId };
    if (opts.action) query.action = opts.action;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return { logs: logs as IAuditLog[], total };
  }
}
