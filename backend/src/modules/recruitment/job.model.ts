// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/job.model.ts
// Job posting created by a hotel (FR53, FR54, FR59–FR61)
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, model } from "mongoose";
import { IJob } from "../../shared/interfaces/recruitment.d";
import {
  JobStatus,
  JobDepartment,
  EmploymentType,
  CertificationLevel,
} from "../../shared/enums/recruitment";

const JobSchema = new Schema<IJob>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: mongoose.Types.ObjectId, ref:"Hotel", required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    department: {
      type: String,
      enum: Object.values(JobDepartment),
      required: true,
      index: true,
    },

    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      required: true,
      index: true,
    },

    vacancies: { type: Number, required: true, min: 1 },

    // Compliance display fields (FR54)
    shiftPolicy: { type: String, required: true },
    recoveryPolicy: { type: String, required: true },
    certificationRequired: {
      type: String,
      enum: Object.values(CertificationLevel),
      required: true,
      index: true,
    },

    requiredSkills: { type: [String], default: [] },
    experienceRequired: { type: String, default: "" },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.DRAFT,
      index: true,
    },

    expiresAt: { type: Date },
    postedBy: { type: String, required: true, index: true },
    applicationCount: { type: Number, default: 0 },
    blockReason: { type: String },
  },
  { timestamps: true },
);

// Compound indexes for common query patterns
JobSchema.index({ hotelId: 1, status: 1 });
JobSchema.index({ hotelId: 1, department: 1, status: 1 });
JobSchema.index({ status: 1, certificationRequired: 1 });
JobSchema.index({ hotelId: 1, createdAt: -1 });

export const JobModel = model<IJob>("Job", JobSchema);
