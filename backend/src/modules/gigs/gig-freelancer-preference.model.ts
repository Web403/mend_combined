import { Schema, Types, model } from "mongoose";
import { IGigFreelancerPreference } from "../../shared/interfaces/gigs.d";

const GigFreelancerPreferenceSchema = new Schema<IGigFreelancerPreference>(
  {
    organizerId: { type: String, required: true, index: true },
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    workerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    vote: { type: Number, enum: [-1, 0, 1], default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, trim: true, maxlength: 1000 },
    blockedAt: { type: Date },
    blockedBy: { type: String },
  },
  { timestamps: true },
);

// Reputation and blocking are private to the organizer who set them.
GigFreelancerPreferenceSchema.index(
  { organizerId: 1, workerId: 1 },
  { unique: true },
);

export const GigFreelancerPreferenceModel = model<IGigFreelancerPreference>(
  "GigFreelancerPreference",
  GigFreelancerPreferenceSchema,
);
