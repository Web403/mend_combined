import mongoose, { Schema, model } from "mongoose";
import { IRoster } from "../../shared/interfaces/roster";

const RosterSchema = new Schema<IRoster>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: mongoose.Types.ObjectId, required: true, index: true },
    date: { type: Date, required: true },
    shiftId: { type: mongoose.Types.ObjectId, required: true, index: true ,ref:"Shift"},
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

// Compound index to quickly find a specific roster for a date and shift
RosterSchema.index({ hotelId: 1, date: 1, shiftId: 1 });

export const RosterModel = model<IRoster>("Roster", RosterSchema);
