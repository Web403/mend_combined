// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/booking.service.ts
// Booking lifecycle for approved gig applications.
// ─────────────────────────────────────────────────────────────────────────────

import { BookingRepository } from "./booking.repository";
import { GigRepository } from "./gig.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { BookingStatus, GigStatus } from "../../shared/enums/recruitment";
import type {
  IBooking,
  BookingResponseDto,
  BookingListOptions,
} from "../../shared/interfaces/gigs.d";

export interface BookingServiceDependencies {
  bookingRepo: Pick<
    BookingRepository,
    "findById" | "update" | "findByGig" | "findByWorker"
  >;
  gigRepo: Pick<
    GigRepository,
    "findById" | "findByIdAndHotel" | "incrementFilledSlots" | "update"
  >;
}

export class BookingService {
  private bookingRepo: BookingServiceDependencies["bookingRepo"];
  private gigRepo: BookingServiceDependencies["gigRepo"];

  constructor(deps: Partial<BookingServiceDependencies> = {}) {
    this.bookingRepo = deps.bookingRepo ?? new BookingRepository();
    this.gigRepo = deps.gigRepo ?? new GigRepository();
  }

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
      ratingReview: booking.ratingReview,
      workerRating: booking.workerRating,
      workerReview: booking.workerReview,
      workerRatingAt:
        booking.workerRatingAt instanceof Date
          ? booking.workerRatingAt.toISOString()
          : booking.workerRatingAt,
      workerRatingRequired: booking.workerRatingRequired ?? false,
      applicationId: booking.applicationId,
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

  async cancelBooking(
    workerId: string,
    bookingId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    if (booking.workerId.toString() !== workerId) {
      throw new AppError("Forbidden.", 403);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError("This booking cannot be cancelled.", 400);
    }

    const gig = await this.gigRepo.findById(booking.gigId);
    if (!gig) throw new AppError("Associated Gig not found.", 404);
    if (gig.startAt <= new Date()) {
      throw new AppError(
        "Bookings cannot be cancelled after the Gig has started.",
        400,
      );
    }

    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    });
    const updatedGig = await this.gigRepo.incrementFilledSlots(booking.gigId, -1);
    if (gig.status === GigStatus.FULL && updatedGig) {
      await this.gigRepo.update(gig.hotelId, booking.gigId, {
        status: GigStatus.OPEN,
      });
    }

    if (!updated) throw new AppError("Booking not found.", 404);
    return this.toDto(updated);
  }

  /** Mark a confirmed assignment completed; the worker must then rate the organizer. */
  async completeBooking(
    reviewerId: string,
    hotelId: string,
    bookingId: string,
    canManageAllTenantGigs = false,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);
    const gig = await this.assertBookingBelongsToHotel(
      booking,
      hotelId,
      reviewerId,
      canManageAllTenantGigs,
    );

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        "Only confirmed bookings can be marked as completed or no-show.",
        400,
      );
    }

    if (gig.endAt > new Date()) {
      throw new AppError("Gig has not ended yet.", 400);
    }

    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.COMPLETED,
      completedAt: new Date(),
      // Only newly completed bookings enforce the new two-way rating rule;
      // legacy completed bookings do not block a freelancer's next application.
      workerRatingRequired: true,
    });
    if (!updated) throw new AppError("Booking not found.", 404);
    return this.toDto(updated);
  }

  async noShowBooking(
    reviewerId: string,
    hotelId: string,
    bookingId: string,
    canManageAllTenantGigs = false,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);
    const gig = await this.assertBookingBelongsToHotel(
      booking,
      hotelId,
      reviewerId,
      canManageAllTenantGigs,
    );

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        "Only confirmed bookings can be marked as completed or no-show.",
        400,
      );
    }

    if (gig.startAt > new Date()) {
      throw new AppError("Gig has not started yet.", 400);
    }

    const updated = await this.bookingRepo.update(bookingId, {
      status: BookingStatus.NO_SHOW,
    });
    if (!updated) throw new AppError("Booking not found.", 404);
    return this.toDto(updated);
  }

  /** Caterer / event manager rates the freelancer after a completed gig. */
  async rateBooking(
    reviewerId: string,
    hotelId: string,
    bookingId: string,
    rating: number,
    review?: string,
    canManageAllTenantGigs = false,
  ): Promise<BookingResponseDto> {
    this.validateRating(rating);
    const ratingReview = this.normalizeReview(review);
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);
    await this.assertBookingBelongsToHotel(
      booking,
      hotelId,
      reviewerId,
      canManageAllTenantGigs,
    );

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError("Only completed bookings can be rated.", 400);
    }
    if (booking.rating !== undefined && booking.rating !== null) {
      throw new AppError("This booking has already been rated.", 400);
    }

    const updated = await this.bookingRepo.update(bookingId, {
      rating,
      ratingReview,
    });
    if (!updated) throw new AppError("Booking not found.", 404);
    return this.toDto(updated);
  }

  /** Freelancer rates the caterer / venue after completion. */
  async rateOrganizer(
    workerId: string,
    bookingId: string,
    rating: number,
    review?: string,
  ): Promise<BookingResponseDto> {
    this.validateRating(rating);
    const workerReview = this.normalizeReview(review);
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);
    if (booking.workerId.toString() !== workerId) {
      throw new AppError("Forbidden.", 403);
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError("Only completed bookings can be rated.", 400);
    }
    if (booking.workerRating !== undefined && booking.workerRating !== null) {
      throw new AppError("You have already rated this caterer for this gig.", 400);
    }

    const updated = await this.bookingRepo.update(bookingId, {
      workerRating: rating,
      workerReview,
      workerRatingAt: new Date(),
    });
    if (!updated) throw new AppError("Booking not found.", 404);
    return this.toDto(updated);
  }

  async getBookingsForGig(
    actorId: string,
    hotelId: string,
    gigId: string,
    canManageAllTenantGigs: boolean,
    options: BookingListOptions = {},
  ): Promise<{ bookings: BookingResponseDto[]; pagination: object }> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);
    if (!canManageAllTenantGigs && String(gig.postedBy) !== actorId) {
      throw new AppError("You can view only bookings for gigs posted by your account.", 403);
    }

    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const { bookings, total } = await this.bookingRepo.findByGig(gigId, {
      ...options,
      page,
      limit,
    });

    return {
      bookings: bookings.map((booking) => this.toDto(booking)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyBookings(
    workerId: string,
    options: BookingListOptions = {},
  ): Promise<{ bookings: BookingResponseDto[]; pagination: object }> {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const { bookings, total } = await this.bookingRepo.findByWorker(workerId, {
      ...options,
      page,
      limit,
    });

    return {
      bookings: bookings.map((booking) => this.toDto(booking)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBookingById(
    bookingId: string,
    requesterId: string,
    requesterHotelId?: string,
    canManageAllTenantGigs = false,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new AppError("Booking not found.", 404);

    const isWorker = booking.workerId.toString() === requesterId;
    const isOrganizer =
      !!requesterHotelId && booking.hotelId.toString() === requesterHotelId;
    if (!isWorker && !isOrganizer) throw new AppError("Forbidden.", 403);
    if (isOrganizer && !isWorker) {
      await this.assertBookingBelongsToHotel(
        booking,
        requesterHotelId!,
        requesterId,
        canManageAllTenantGigs,
      );
    }

    return this.toDto(booking);
  }

  private async assertBookingBelongsToHotel(
    booking: IBooking,
    hotelId: string,
    organizerId: string,
    canManageAllTenantGigs: boolean,
  ) {
    if (booking.hotelId.toString() !== hotelId) {
      throw new AppError("Forbidden.", 403);
    }
    const gig = await this.gigRepo.findById(booking.gigId);
    if (!gig) throw new AppError("Associated Gig not found.", 404);
    if (String(gig.hotelId) !== hotelId) {
      throw new AppError("Forbidden.", 403);
    }
    if (!canManageAllTenantGigs && String(gig.postedBy) !== organizerId) {
      throw new AppError("You can manage only bookings for gigs posted by your account.", 403);
    }
    return gig;
  }

  private validateRating(rating: number): void {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError("rating must be an integer between 1 and 5.", 400);
    }
  }

  private normalizeReview(review?: string): string | undefined {
    if (review !== undefined && typeof review !== "string") {
      throw new AppError("review must be a string.", 400);
    }
    const trimmed = review?.trim();
    if (trimmed && trimmed.length > 2000) {
      throw new AppError("review cannot exceed 2000 characters.", 400);
    }
    return trimmed;
  }
}
