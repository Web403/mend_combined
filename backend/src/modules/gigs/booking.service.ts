// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/booking.service.ts
//
// Implements Booking lifecycle business logic:
//   Requirement 8  — Book a Gig (Instant Accept)
//   Requirement 9  — Cancel a Booking
//   Requirement 10 — Mark Booking Outcomes (complete / no-show)
//   Requirement 11 — Rate a Worker on a Gig
//   Requirement 12 — Hotel Gig Dashboard (bookings view)
//   Requirement 13 — Worker Booking History
//   Requirement 16 — Gig Expiry enforcement on booking
//   Requirement 17 — Audit Trail timestamps
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { BookingRepository } from "./booking.repository";
import { GigRepository } from "./gig.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { BookingStatus, GigStatus } from "../../shared/enums/recruitment";
import type {
  IBooking,
  BookingResponseDto,
  BookingListOptions,
} from "../../shared/interfaces/gigs.d";

export class BookingService {
  private bookingRepo = new BookingRepository();
  private gigRepo = new GigRepository();

  // ── DTO mapper ──────────────────────────────────────────────────────────────

  private toDto(booking: IBooking): BookingResponseDto {
    return {
      id: booking.id,
      hotelId: booking.hotelId,
      gigId: booking.gigId,
      gigHotelId: booking.gigHotelId,
      workerId: booking.workerId,
      status: booking.status,
      cancelReason: booking.cancelReason,
      rating: booking.rating,
      confirmedAt:
        booking.confirmedAt instanceof Date
          ? booking.confirmedAt.toISOString()
          : booking.confirmedAt,
      cancelledAt:
        booking.cancelledAt instanceof Date
          ? booking.cancelledAt.toISOString()
          : booking.cancelledAt,
      completedAt:
        booking.completedAt instanceof Date
          ? booking.completedAt.toISOString()
          : booking.completedAt,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  // ── Book a Gig (Requirements 8.1–8.6, 16.2, 17.3) ──────────────────────────

  async bookGig(workerId: any, gigId: string): Promise<BookingResponseDto> {
    const gig = await this.gigRepo.findById(gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    // Requirement 8.5 — gig must be OPEN
    if (gig.status !== GigStatus.OPEN) {
      throw new AppError("This Gig is not accepting bookings.", 400);
    }

    // Requirement 8.6, 16.2 — gig must not have already started
    if (gig.startAt <= new Date()) {
      throw new AppError("This Gig has already started.", 400);
    }

    // Requirement 8.2 — no slots remaining
    if (gig.filledSlots >= gig.slots) {
      throw new AppError("This Gig is fully booked.", 409);
    }

    // Requirement 8.4 — prevent duplicate booking by same worker
    const existing = await this.bookingRepo.findByGigAndWorker(gigId, workerId);
    if (existing) {
      throw new AppError("You have already booked this Gig.", 409);
    }

    // Requirement 8.1, 17.3 — create booking with CONFIRMED status and confirmedAt timestamp
    const booking = await this.bookingRepo.create({
      id: `BKG_${nanoid(10)}`,
      hotelId: gig.hotelId,
      schemaVersion: 1,
      gigId,
      gigHotelId: gig.hotelId,
      workerId,
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    // Requirement 8.1 — atomically increment filledSlots
    const updatedGig = await this.gigRepo.incrementFilledSlots(gigId, 1);

    // Requirement 8.3 — if now full, transition gig OPEN → FULL
    if (updatedGig && updatedGig.filledSlots >= updatedGig.slots) {
      await this.gigRepo.update(gig.hotelId, gigId, { status: GigStatus.FULL });
    }

    return this.toDto(booking);
  }

  // ── Cancel a Booking (Requirements 9.1–9.5, 17.4) ───────────────────────────

  async cancelBooking(
    workerId: string,
    bookingId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    // Requirement 9.3 — worker can only cancel their own booking
    if (booking.workerId.toString() !== workerId) {
      throw new AppError("Forbidden.", 403);
    }

    // Requirement 9.4 — can only cancel CONFIRMED bookings
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      throw new AppError("This booking cannot be cancelled.", 400);
    }

    // Requirement 9.5 — cannot cancel after gig has started
    const gig = await this.gigRepo.findById(booking.gigId);
    if (!gig) throw new AppError("Associated Gig not found.", 404);

    if (gig.startAt <= new Date()) {
      throw new AppError(
        "Bookings cannot be cancelled after the Gig has started.",
        400,
      );
    }

    // Requirement 9.1, 17.4 — transition to CANCELLED with cancelledAt timestamp
    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    // Requirement 9.1 — atomically decrement filledSlots
    const updatedGig = await this.gigRepo.incrementFilledSlots(
      booking.gigId,
      -1,
    );

    // Requirement 9.2 — if gig was FULL, transition back to OPEN
    if (gig.status === GigStatus.FULL && updatedGig) {
      await this.gigRepo.update(gig.hotelId, booking.gigId, {
        status: GigStatus.OPEN,
      });
    }

    return this.toDto(updated!);
  }

  // ── Complete a Booking (Requirements 10.1, 10.3, 10.5, 17.5) ────────────────

  async completeBooking(
    reviewerId: string,
    bookingId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    // Requirement 10.5 — must be CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        "Only confirmed bookings can be marked as completed or no-show.",
        400,
      );
    }

    // Requirement 10.3 — gig must have ended
    const gig = await this.gigRepo.findById(booking.gigId);
    if (!gig) throw new AppError("Associated Gig not found.", 404);

    if (gig.endAt > new Date()) {
      throw new AppError("Gig has not ended yet.", 400);
    }

    // Requirement 10.1, 17.5 — transition to COMPLETED with completedAt timestamp
    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.COMPLETED,
      completedAt: new Date(),
    });

    return this.toDto(updated!);
  }

  // ── No-Show a Booking (Requirements 10.2, 10.4, 10.5) ───────────────────────

  async noShowBooking(
    reviewerId: string,
    bookingId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    // Requirement 10.5 — must be CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        "Only confirmed bookings can be marked as completed or no-show.",
        400,
      );
    }

    // Requirement 10.4 — gig must have already started
    const gig = await this.gigRepo.findById(booking.gigId);
    if (!gig) throw new AppError("Associated Gig not found.", 404);

    if (gig.startAt > new Date()) {
      throw new AppError("Gig has not started yet.", 400);
    }

    // Requirement 10.2 — transition to NO_SHOW
    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.NO_SHOW,
    });

    return this.toDto(updated!);
  }

  // ── Rate a Booking (Requirements 11.1–11.4) ──────────────────────────────────

  async rateBooking(
    reviewerId: string,
    bookingId: string,
    rating: number,
  ): Promise<BookingResponseDto> {
    // Requirement 11.2 — rating must be integer 1–5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError("rating must be an integer between 1 and 5.", 400);
    }

    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    // Requirement 11.3 — booking must be COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError("Only completed bookings can be rated.", 400);
    }

    // Requirement 11.4 — cannot rate twice
    if (booking.rating !== undefined && booking.rating !== null) {
      throw new AppError("This booking has already been rated.", 400);
    }

    // Requirement 11.1 — store rating
    const updated = await this.bookingRepo.update(bookingId, { rating });
    return this.toDto(updated!);
  }

  // ── Read: bookings for a gig (Requirement 12.2) ──────────────────────────────

  async getBookingsForGig(
    hotelId: string,
    gigId: string,
    options: BookingListOptions = {},
  ): Promise<{ bookings: BookingResponseDto[]; pagination: object }> {
    // Confirm gig belongs to this hotel
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 25, 100);

    const { bookings, total } = await this.bookingRepo.findByGig(gigId, {
      ...options,
      page,
      limit,
    });

    return {
      bookings: bookings.map((b) => this.toDto(b)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Read: worker booking history (Requirements 13.1–13.4) ───────────────────

  async getMyBookings(
    workerId: string,
    options: BookingListOptions = {},
  ): Promise<{ bookings: BookingResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 25, 100); // Requirement 13.4

    const { bookings, total } = await this.bookingRepo.findByWorker(workerId, {
      ...options,
      page,
      limit,
    });

    return {
      bookings: bookings.map((b) => this.toDto(b)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Read: single booking ─────────────────────────────────────────────────────

  async getBookingById(
    bookingId: string,
    requesterId: string,
    isHotel: boolean,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    // Non-hotel requesters can only see their own bookings
    if (!isHotel && booking.workerId.toString() !== requesterId) {
      throw new AppError("Forbidden.", 403);
    }

    return this.toDto(booking);
  }
}
