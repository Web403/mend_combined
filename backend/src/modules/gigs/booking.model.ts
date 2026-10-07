// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/booking.model.ts
// Booking links one Worker to one Gig
// Requirements: 2.1–2.4, 17.2
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { IBooking } from "../../shared/interfaces/gigs.d";
import { BookingStatus } from "../../shared/enums/recruitment";

const BookingSchema = new Schema<IBooking>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Types.ObjectId, required: true, index: true },
    schemaVersion: { type: Number, default: 1 },

    gigId: { type: String, required: true, index: true },
    gigHotelId: { type: Types.ObjectId, required: true, index: true },
    workerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: String },

    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.CONFIRMED,
      index: true,
    },

    cancelReason: { type: String },
    /** Caterer / event manager rating of the freelancer. */
    rating: { type: Number, min: 1, max: 5 },
    ratingReview: { type: String, trim: true, maxlength: 2000 },
    /** Freelancer rating of the caterer after a completed gig. */
    workerRating: { type: Number, min: 1, max: 5 },
    workerReview: { type: String, trim: true, maxlength: 2000 },
    workerRatingAt: { type: Date },
    workerRatingRequired: { type: Boolean, default: false, index: true },

    confirmedAt: { type: Date, required: true },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }, // Requirement 17.2
);

// Requirement 2.2 — unique index prevents duplicate bookings for same worker on same gig
BookingSchema.index({ gigId: 1, workerId: 1 }, { unique: true });
// Only application-generated bookings have this value; sparse preserves legacy rows.
BookingSchema.index({ applicationId: 1 }, { unique: true, sparse: true });
BookingSchema.index({ workerId: 1, status: 1, workerRatingRequired: 1, workerRating: 1 });

// Requirement 2.3 — hotel-scoped booking queries
BookingSchema.index({ hotelId: 1, gigId: 1, status: 1 });

// Requirement 2.4 — worker history sorted by confirmedAt desc
BookingSchema.index({ workerId: 1, confirmedAt: -1 });

export const BookingModel = model<IBooking>("Booking", BookingSchema);
