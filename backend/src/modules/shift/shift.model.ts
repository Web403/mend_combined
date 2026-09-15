import mongoose, { Schema, model } from "mongoose";
import { IShift } from "../../shared/interfaces";
import { ShiftStatus } from "../../shared/enums";

const ShiftSchema = new Schema<IShift>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: mongoose.Types.ObjectId, required: true, index: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    actualAttendanceId: String,
    employees: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User"
      }
    ],
    schemaVersion: { type: Number, default: 1 }
  },
  { timestamps: true }
);

ShiftSchema.index({ hotelId: 1, userId: 1, date: 1 });

export const ShiftModel = model<IShift>("Shift", ShiftSchema);