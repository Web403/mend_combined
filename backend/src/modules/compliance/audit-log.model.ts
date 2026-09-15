// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/audit-log.model.ts
// Immutable append-only audit trail (FR36, FR62)
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, model } from "mongoose";
import { AuditAction } from "../../shared/enums/compliance.enum";

export interface IAuditLog {
  _id:       any;
  id:        string;
  hotelId:   string;
  action:    AuditAction;
  actorId:   string;
  actorRole: string;
  meta?:     Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    id:        { type: String, required: true, unique: true, index: true },
    hotelId:   { type: String, required: true, index: true },
    action:    { type: String, enum: Object.values(AuditAction), required: true, index: true },
    actorId:   { type: String, required: true },
    actorRole: { type: String, required: true },
    meta:      { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    // Audit logs are immutable — no updates permitted at the DB layer
  }
);

AuditLogSchema.index({ hotelId: 1, createdAt: -1 });
AuditLogSchema.index({ hotelId: 1, action: 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLog>("AuditLog", AuditLogSchema);
