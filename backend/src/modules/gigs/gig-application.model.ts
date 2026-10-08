import { Schema, Types, model } from "mongoose";
import { IGigApplication } from "../../shared/interfaces/gigs.d";
import { GigApplicationStatus } from "../../shared/enums/recruitment";

const GigApplicationSchema = new Schema<IGigApplication>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    schemaVersion: { type: Number, default: 1 },
    gigId: { type: String, required: true, index: true },
    gigHotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    organizerId: { type: String, required: true, index: true },
    applicantId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: Object.values(GigApplicationStatus),
      default: GigApplicationStatus.APPLIED,
      index: true,
    },
    coverNote: { type: String, trim: true, maxlength: 2000 },
    recruiterNotes: { type: String, trim: true, maxlength: 2000 },
    appliedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    bookingId: { type: String, index: true },
    priorityVote: { type: Number, enum: [-1, 0, 1], default: 0, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockReason: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

// One application per freelancer per gig. A withdrawn application may be
// submitted again by updating the existing document rather than duplicating it.
GigApplicationSchema.index({ gigId: 1, applicantId: 1 }, { unique: true });
GigApplicationSchema.index({ hotelId: 1, gigId: 1, status: 1, priorityVote: -1, appliedAt: 1 });
GigApplicationSchema.index({ gigId: 1, priorityVote: -1, appliedAt: 1 });
GigApplicationSchema.index({ applicantId: 1, appliedAt: -1 });
GigApplicationSchema.index({ organizerId: 1, applicantId: 1, status: 1 });

export const GigApplicationModel = model<IGigApplication>(
  "GigApplication",
  GigApplicationSchema,
);
