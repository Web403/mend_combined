// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/booking.repository.ts
// All Mongoose queries for Booking documents
// Requirements: 2.1–2.4, 12.2, 13.1–13.4
// ─────────────────────────────────────────────────────────────────────────────

import { BookingModel } from "./booking.model";
import { IBooking, BookingListOptions } from "../../shared/interfaces/gigs.d";
import { BookingStatus } from "../../shared/enums/recruitment";

const MAX_LIMIT = 100;

export class BookingRepository {
  // ── Write ───────────────────────────────────────────────────────────────────

  async create(data: Partial<IBooking>): Promise<IBooking> {
    return BookingModel.create(data);
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    return BookingModel.findOneAndUpdate(
      { id },
      data,
      { new: true }
    ).lean();
  }

  /**
   * Bulk-cancel all CONFIRMED bookings for a gig (cascade on gig cancellation).
   * Requirement 5.3
   */
  async cancelAllConfirmedForGig(gigId: string): Promise<number> {
    const result = await BookingModel.updateMany(
      { gigId, status: BookingStatus.CONFIRMED },
      { status: BookingStatus.CANCELLED, cancelledAt: new Date() }
    );
    return result.modifiedCount;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IBooking | null> {
    return BookingModel.findOne({ id }).lean();
  }

  /**
   * Find an existing booking by gigId + workerId for duplicate-booking check.
   * Requirement 8.4
   */
  async findByGigAndWorker(
    gigId: string,
    workerId: string
  ): Promise<IBooking | null> {
    return BookingModel.findOne({ gigId, workerId, status: BookingStatus.CONFIRMED }).lean();
  }

  /**
   * All bookings for a specific gig — hotel manager view.
   * Requirement 12.2
   */
  async findByGig(
    gigId: string,
    options: BookingListOptions = {}
  ): Promise<{ bookings: IBooking[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(options.limit ?? 25, MAX_LIMIT);
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { gigId };
    if (filters.status) query.status = filters.status;

    const [bookings, total] = await Promise.all([
      BookingModel.find(query).sort({ confirmedAt: -1 }).skip(skip).limit(limit).lean().populate("workerId", "whatsappNumber id email role profession availability yearsOfExperience profile status"),
      BookingModel.countDocuments(query),
    ]);

    return { bookings: bookings as IBooking[], total };
  }

  /**
   * Worker's booking history sorted by confirmedAt descending.
   * Requirements: 13.1–13.4
   * Max limit 100 (Requirement 13.4).
   */
  async findByWorker(
    workerId: string,
    options: BookingListOptions = {}
  ): Promise<{ bookings: IBooking[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(options.limit ?? 25, MAX_LIMIT);
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { workerId };
    if (filters.status) query.status = filters.status;   // Requirement 13.2

    const [bookings, total] = await Promise.all([
      // Requirement 13.3 — sorted by confirmedAt descending
      BookingModel.find(query).sort({ confirmedAt: -1 }).skip(skip).limit(limit).lean(),
      BookingModel.countDocuments(query),
    ]);

    return { bookings: bookings as IBooking[], total };
  }
}
