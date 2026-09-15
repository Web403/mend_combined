// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/booking.controller.ts
// HTTP adapter for all Booking operations — no business logic lives here.
// Requirements: 8, 9, 10, 11, 12, 13
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { BookingService } from "./booking.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { BookingStatus } from "../../shared/enums/recruitment";
import type {
  BookingListOptions,
  BookingListFilters,
} from "../../shared/interfaces/gigs.d";

// Narrows Express query values to plain string | undefined
const qs = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const service = new BookingService();

export class BookingController {
  // ── POST /gigs/:id/book ──────────────────────────────────────────────────────

  async bookGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const workerId = req.user?.id as string;
      const gigId    = req.params["id"] as string;

      const booking = await service.bookGig(workerId, gigId);
      res.status(201).json(successResponse(booking, "Gig booked successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /bookings/:id/cancel ───────────────────────────────────────────────

  async cancelBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const workerId  = req.user?.id as string;
      const bookingId = req.params["id"] as string;

      const booking = await service.cancelBooking(workerId, bookingId);
      res.json(successResponse(booking, "Booking cancelled successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /bookings/:id/complete ─────────────────────────────────────────────

  async completeBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewerId = req.hotelId as string;
      const bookingId  = req.params["id"] as string;

      const booking = await service.completeBooking(reviewerId, bookingId);
      res.json(successResponse(booking, "Booking marked as completed"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /bookings/:id/no-show ──────────────────────────────────────────────

  async noShowBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewerId = req.hotelId as string;
      const bookingId  = req.params["id"] as string;

      const booking = await service.noShowBooking(reviewerId, bookingId);
      res.json(successResponse(booking, "Booking marked as no-show"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /bookings/:id/rate ─────────────────────────────────────────────────

  async rateBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewerId = req.hotelId as string;
      const bookingId  = req.params["id"] as string;
      const { rating } = req.body as { rating: number };

      const booking = await service.rateBooking(reviewerId, bookingId, rating);
      res.json(successResponse(booking, "Booking rated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /gigs/:id/bookings ───────────────────────────────────────────────────

  async getBookingsForGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = req.hotelId as string;
      const gigId   = req.params["id"] as string;
      const page    = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit   = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);

      const options: BookingListOptions = { page, limit };

      const result = await service.getBookingsForGig(hotelId, gigId, options);
      res.json(successResponse(result.bookings, "Bookings retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /bookings/mine ───────────────────────────────────────────────────────

  async getMyBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const workerId  = req.user?.id as string;
      const page      = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit     = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);
      const statusRaw = qs(req.query.status);

      const filters: BookingListFilters = {
        ...(statusRaw && Object.values(BookingStatus).includes(statusRaw as BookingStatus)
          ? { status: statusRaw as BookingStatus }
          : {}),
      };

      const options: BookingListOptions = { page, limit, filters };

      const result = await service.getMyBookings(workerId, options);
      res.json(successResponse(result.bookings, "Bookings retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /bookings/:id ────────────────────────────────────────────────────────

  async getBookingById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const bookingId  = req.params["id"] as string;
      const isHotel    = !!req.hotelId;
      const requesterId = isHotel ? (req.hotelId as string) : (req.user?.id as string);

      const booking = await service.getBookingById(bookingId, requesterId, isHotel);
      res.json(successResponse(booking, "Booking retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}
