// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/day-off.model.ts
// Manager-scheduled non-working days. Collection: `dayoffs`.
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IDayOff } from "../../shared/interfaces/leave.d";
import { DayOffType } from "../../shared/enums/leave.enum";
import { MAX_DAY_OFF_NOTE_LENGTH } from "./leave.constants";

const DayOffSchema = new Schema<IDayOff>(
  {
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: Object.values(DayOffType), required: true },
    note: { type: String, trim: true, maxlength: MAX_DAY_OFF_NOTE_LENGTH },
    assignedBy: { type: String, required: true },
  },
  { timestamps: true },
);

// One off per employee per day. This is also the guard against double-assignment races.
DayOffSchema.index({ hotelId: 1, userId: 1, date: 1 }, { unique: true });
// Calendar view: every off in a hotel for a date window.
DayOffSchema.index({ hotelId: 1, date: 1 });

export const DayOffModel = model<IDayOff>("DayOff", DayOffSchema);
