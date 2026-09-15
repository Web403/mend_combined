// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/compliance.model.ts
// One compliance record per hotel — updated on every evaluation run (FR34–FR39)
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, model } from "mongoose";
import { ICompliance } from "../../shared/interfaces/compliance.d";
import { CertificationLevel } from "../../shared/enums/recruitment";
import { ComplianceStatus } from "../../shared/enums/compliance.enum";

const ComplianceSchema = new Schema<ICompliance>(
  {
    id:            { type: String, required: true, unique: true, index: true },
    hotelId:       { type: String, required: true, unique: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    complianceScore: { type: Number, required: true, min: 0, max: 100, default: 0 },

    certificationLevel: {
      type:    String,
      enum:    Object.values(CertificationLevel),
      default: CertificationLevel.NONE,
      index:   true,
    },

    breakdown: {
      attendanceScore: { type: Number, default: 0 },
      wellbeingScore:  { type: Number, default: 0 },
      fatigueScore:    { type: Number, default: 0 },
      efficiencyScore: { type: Number, default: 0 },
    },

    hesViolationCount: { type: Number, default: 0 },
    shiftCount:        { type: Number, default: 0 },
    lastEvaluatedAt:   { type: Date, required: true },
    windowDays:        { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const ComplianceModel = model<ICompliance>("Compliance", ComplianceSchema);
