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
    gigHotelId: { type:  Types.ObjectId, required: true, index: true },
    workerId: { type: Types.ObjectId, ref:"User", required: true, index: true },

    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.CONFIRMED,
      index: true,
    },

    cancelReason: { type: String },
    rating: { type: Number, min: 1, max: 5 },

    confirmedAt: { type: Date, required: true },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }, // Requirement 17.2
);

// Requirement 2.2 — unique index prevents duplicate bookings for same worker on same gig
BookingSchema.index({ gigId: 1, workerId: 1 }, { unique: true });

// Requirement 2.3 — hotel-scoped booking queries
BookingSchema.index({ hotelId: 1, gigId: 1, status: 1 });

// Requirement 2.4 — worker history sorted by confirmedAt desc
BookingSchema.index({ workerId: 1, confirmedAt: -1 });

export const BookingModel = model<IBooking>("Booking", BookingSchema);
