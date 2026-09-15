// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/gig.model.ts
// Short-term Gig posting created by a hotel
// Requirements: 1.1–1.10, 15.3, 17.1
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IGig } from "../../shared/interfaces/gigs.d";
import {
  GigStatus,
  RateUnit,
  JobDepartment,
  CertificationLevel,
  EmploymentType,
} from "../../shared/enums/recruitment";

const GigSchema = new Schema<IGig>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, ref:"Hotel", required: true, index: true }, // Requirement 1.4
    schemaVersion: { type: Number, default: 1 },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    department: {
      type: String,
      enum: Object.values(JobDepartment),
      required: true,
      index: true,
    },

    // Requirement 1.8 — slots min 1
    slots: { type: Number, required: true, min: 1 },
    // Requirement 1.9 — filledSlots min 0, default 0
    filledSlots: { type: Number, default: 0, min: 0 },

    startAt: { type: Date, required: true }, // Requirement 1.2 — stored as UTC Date
    endAt: { type: Date, required: true }, // Requirement 1.3 — stored as UTC Date

    // Requirement 1.10 — rateAmount min 0
    rateAmount: { type: Number, required: true, min: 0 },
    rateUnit: {
      type: String,
      enum: Object.values(RateUnit),
      required: true,
    },

    certificationRequired: {
      type: String,
      enum: Object.values(CertificationLevel),
      default: CertificationLevel.NONE,
      required: true,
    },

    requiredSkills: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(GigStatus),
      default: GigStatus.DRAFT,
      index: true,
    },

    postedBy: { type: String, required: true, index: true },
    bookingCount: { type: Number, default: 0 },
    blockReason: { type: String },

    // Requirement 15.3 — always GIG for Gig documents
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      default: EmploymentType.GIG,
      required: true,
    },
  },
  { timestamps: true }, // Requirement 17.1
);

// Compound indexes for efficient querying (Requirements 1.5, 1.6, 1.7)
GigSchema.index({ hotelId: 1, status: 1 }); // Requirement 1.5
GigSchema.index({ hotelId: 1, startAt: 1 }); // Requirement 1.6
GigSchema.index({ status: 1, startAt: 1 }); // Requirement 1.7

export const GigModel = model<IGig>("Gig", GigSchema);
