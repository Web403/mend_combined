// ─────────────────────────────────────────────────────────────────────────────
// modules/attendance/attendance.model.ts
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, model } from "mongoose";
import { IAttendance } from "../../shared/interfaces/attendance";

const AttendanceSchema = new Schema<IAttendance>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    userId: { type: String, required: true, index: true },
    shiftId: { type: String },

    clockIn: { type: Date, required: true, index: true },
    clockOut: { type: Date },
    workDurationMinutes: { type: Number },
    recoveryMinutes: { type: Number },

    geoValidated: { type: Boolean, required: true },

    violationFlags: {
      exceeds10Hours: { type: Boolean, default: false },
      insufficientRecovery: { type: Boolean, default: false },
    },

    deviceMeta: {
      offlineSync: { type: Boolean, default: false },
      deviceId: { type: String },
    },
  },
  { timestamps: true },
);

// Compound index for fast "latest shift for user within tenant" queries
AttendanceSchema.index({ hotelId: 1, userId: 1, clockIn: -1 });

// Partial index: quickly find the open (not yet clocked-out) record per user
AttendanceSchema.index(
  { hotelId: 1, userId: 1, clockOut: 1 },
  { partialFilterExpression: { clockOut: { $exists: false } } },
);

export const AttendanceModel = model<IAttendance>("Attendance", AttendanceSchema);