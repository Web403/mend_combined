// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/application.model.ts
// Candidate application to a job posting (FR55–FR58)
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IApplication } from "../../shared/interfaces/recruitment.d";
import { ApplicationStatus } from "../../shared/enums/recruitment";

const ApplicationSchema = new Schema<IApplication>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    jobId: { type: String, required: true, index: true },
    jobHotelId: { type: String, required: true, index: true },
    applicantId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.APPLIED,
      index: true,
    },

    coverNote: { type: String, trim: true },
    recruiterNotes: { type: String, trim: true },

    /** Computed from passport data at application time (FR57) */
    rankScore: { type: Number, default: 0, min: 0, max: 100 },

    /** 1–5 star rating given after hire (FR58) */
    rating: { type: Number, min: 1, max: 5 },

    appliedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
  },
  { timestamps: true },
);

// One application per candidate per job
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
ApplicationSchema.index({ hotelId: 1, jobId: 1, status: 1 });
ApplicationSchema.index({ hotelId: 1, applicantId: 1, status: 1 });
// For candidate's own view — sorted by most recent
ApplicationSchema.index({ applicantId: 1, appliedAt: -1 });
// For recruiter ranking view (FR57)
ApplicationSchema.index({ jobId: 1, rankScore: -1 });

export const ApplicationModel = model<IApplication>(
  "Application",
  ApplicationSchema,
);
