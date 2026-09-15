// ─────────────────────────────────────────────────────────────────────────────
// modules/wellbeing/wellbeing.model.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IWellbeing } from "../../shared/interfaces/wellbeing.d";
import { FatigueRisk } from "../../shared/enums/wellbeing.enum";

const WellbeingSchema = new Schema<IWellbeing>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    userId: { type: String, required: true, index: true },
    rating: { type: Number, required: true },
    sleepHours: Number,
    stressLevel: Number,
    fatigueScore: { type: Number, default: 0 },
    fatigueRiskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
      index: true,
    },
    fatigueReasons: [String],
    alertManagers: { type: Boolean, default: false, index: true },
    alertStatus: {
      type: String,
      enum: ["NONE", "OPEN", "ACKNOWLEDGED", "RESOLVED"],
      default: "NONE",
      index: true,
    },
    alertedAt: Date,
    acknowledgedAt: Date,
    acknowledgedBy: String,
    resolvedAt: Date,
    resolvedBy: String,
  },
  { timestamps: true },
);

// One wellbeing submission per user per day (FR15)
WellbeingSchema.index({ hotelId: 1, userId: 1, date: 1 }, { unique: true });

// Manager dashboard queries (FR18, FR19)
WellbeingSchema.index({ hotelId: 1, fatigueRisk: 1, date: 1 });
WellbeingSchema.index({ hotelId: 1, userId: 1, createdAt: -1 });
WellbeingSchema.index({
  hotelId: 1,
  alertManagers: 1,
  alertStatus: 1,
  createdAt: -1,
});

export const WellbeingModel = model<IWellbeing>("Wellbeing", WellbeingSchema);
