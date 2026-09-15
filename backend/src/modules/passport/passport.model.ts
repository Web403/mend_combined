// ─────────────────────────────────────────────────────────────────────────────
// modules/passport/passport.model.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IPassport } from "../../shared/interfaces/passport";

const CareerEntrySchema = new Schema(
  {
    title: { type: String, required: true },
    hotel: { type: String },
    from: { type: Date, required: true },
    to: { type: Date },
  },
  { _id: false },
);

const ComplianceHistorySchema = new Schema(
  {
    hotelId: { type: String, required: true },
    hotelName: { type: String, required: true },
    score: { type: Number, required: true },
    from: { type: Date, required: true },
    to: { type: Date },
  },
  { _id: false },
);

const PassportSchema = new Schema<IPassport>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    userId: { type: String, required: true, unique: true, index: true },

    credentialNumber: { type: String, required: true, unique: true },

    skills: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    efficiencyScore: { type: Number, default: 0, min: 0, max: 100 },

    complianceHistory: { type: [ComplianceHistorySchema], default: [] },
    careerProgression: { type: [CareerEntrySchema], default: [] },

    lastSyncedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PassportSchema.index({ hotelId: 1, userId: 1 });
// PassportSchema.index({ credentialNumber: 1 });

export const PassportModel = model<IPassport>("Passport", PassportSchema);
