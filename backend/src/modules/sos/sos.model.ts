import { Schema, Types, model } from "mongoose";
import { ISOS } from "../../shared/interfaces";

const SOSSchema = new Schema<ISOS>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    userId: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true
      },
      coordinates: { type: [Number], required: true }
    },
    status: { type: String, default: "OPEN" },
    escalationLevel: { type: Number, default: 0 }
  },
  { timestamps: true }
);

SOSSchema.index({ location: "2dsphere" });
SOSSchema.index({ hotelId: 1, status: 1 });

export const SOSModel = model<ISOS>("SOS", SOSSchema);