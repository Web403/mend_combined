// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/gig.route.ts
//
// Route map:
//
//  BOOKING — worker's own bookings (no tenant)
//  GET    /bookings/mine                     — worker's bookings
//
//  HOTEL GIG MANAGEMENT (tenant-scoped)
//  GET    /gigs/stats                        — gig + booking stats
//  GET    /gigs/mine                         — hotel's own listings
//
//  PUBLIC MARKETPLACE (any authenticated user)
//  GET    /gigs                              — browse open listings
//
//  HOTEL GIG WRITE (tenant-scoped)
//  POST   /gigs                              — create gig
//  PUT    /gigs/:id                          — update gig
//  PATCH  /gigs/:id/publish                  — publish DRAFT → OPEN
//  PATCH  /gigs/:id/close                    — close gig
//  PATCH  /gigs/:id/cancel                   — cancel gig
//
//  PUBLIC GIG DETAIL (any authenticated user)
//  GET    /gigs/:id                          — single gig detail
//
//  BOOKING — nested under gig
//  POST   /gigs/:id/book                     — worker books a gig
//  GET    /gigs/:id/bookings                 — hotel views bookings for a gig
//
//  BOOKING ACTIONS
//  GET    /bookings/:id                      — single booking detail
//  PATCH  /bookings/:id/cancel               — worker cancels booking
//  PATCH  /bookings/:id/complete             — hotel marks completed
//  PATCH  /bookings/:id/no-show              — hotel marks no-show
//  PATCH  /bookings/:id/rate                 — hotel rates worker
//
//  ADMIN
//  POST   /admin/hotels/:hotelId/block-gigs  — block hotel from posting gigs
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import { GigController } from "./gig.controller";
import { BookingController } from "./booking.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { adminAuthMiddleware } from "../../core/middleware/admin.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import { GigService } from "./gig.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";

const router      = Router();
const gigCtrl     = new GigController();
const bookingCtrl = new BookingController();

// All routes in this file require a valid JWT
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// Static / named routes — MUST come before /:id to avoid shadowing
// ─────────────────────────────────────────────────────────────────────────────

// Worker: my bookings (no tenant required)
// Final URL: GET /api/v1/bookings/mine
router.get(
  "/bookings/mine",
  bookingCtrl.getMyBookings.bind(bookingCtrl)
);

// Hotel: gig stats
// Final URL: GET /api/v1/gigs/stats
router.get(
  "/gigs/stats",
  tenantMiddleware,
  gigCtrl.getGigStats.bind(gigCtrl)
);

// Hotel: own gig listings
// Final URL: GET /api/v1/gigs/mine
router.get(
  "/gigs/mine",
  tenantMiddleware,
  gigCtrl.getHotelGigs.bind(gigCtrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Public marketplace
// ─────────────────────────────────────────────────────────────────────────────

// Final URL: GET /api/v1/gigs
router.get("/", gigCtrl.getPublicListings.bind(gigCtrl));

// ─────────────────────────────────────────────────────────────────────────────
// Hotel gig management (tenant-scoped write operations)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/gigs",
  tenantMiddleware,
  gigCtrl.createGig.bind(gigCtrl)
);

router.put(
  "/gigs/:id",
  tenantMiddleware,
  gigCtrl.updateGig.bind(gigCtrl)
);

router.patch(
  "/gigs/:id/publish",
  tenantMiddleware,
  gigCtrl.publishGig.bind(gigCtrl)
);

router.patch(
  "/gigs/:id/close",
  tenantMiddleware,
  gigCtrl.closeGig.bind(gigCtrl)
);

router.patch(
  "/gigs/:id/cancel",
  tenantMiddleware,
  gigCtrl.cancelGig.bind(gigCtrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Gig detail (public read — no tenant required)
// ─────────────────────────────────────────────────────────────────────────────

// Final URL: GET /api/v1/gigs/:id
router.get("/gigs/:id", gigCtrl.getGigById.bind(gigCtrl));

// ─────────────────────────────────────────────────────────────────────────────
// Bookings nested under gig
// ─────────────────────────────────────────────────────────────────────────────

// Worker: book a gig (no tenant required)
// Final URL: POST /api/v1/gigs/:id/book
router.post(
  "/gigs/:id/book",
  bookingCtrl.bookGig.bind(bookingCtrl)
);

// Hotel: view bookings for a specific gig
// Final URL: GET /api/v1/gigs/:id/bookings
router.get(
  "/gigs/:id/bookings",
  tenantMiddleware,
  bookingCtrl.getBookingsForGig.bind(bookingCtrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Booking actions
// ─────────────────────────────────────────────────────────────────────────────

// Single booking detail (no tenant required)
// Final URL: GET /api/v1/bookings/:id
router.get(
  "/bookings/:id",
  bookingCtrl.getBookingById.bind(bookingCtrl)
);

// Worker: cancel their own booking (no tenant required)
router.patch(
  "/bookings/:id/cancel",
  bookingCtrl.cancelBooking.bind(bookingCtrl)
);

// Hotel: mark booking as completed
router.patch(
  "/bookings/:id/complete",
  tenantMiddleware,
  bookingCtrl.completeBooking.bind(bookingCtrl)
);

// Hotel: mark booking as no-show
router.patch(
  "/bookings/:id/no-show",
  tenantMiddleware,
  bookingCtrl.noShowBooking.bind(bookingCtrl)
);

// Hotel: rate worker after booking
router.patch(
  "/bookings/:id/rate",
  tenantMiddleware,
  bookingCtrl.rateBooking.bind(bookingCtrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// MENDADMIN: block hotel from posting gigs
// Final URL: POST /api/v1/admin/hotels/:hotelId/block-gigs
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/admin/hotels/:hotelId/block-gigs",
  adminAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const hotelId = req.params["hotelId"] as string;
      const { reason }  = req.body as { reason: string };

      const gigService = new GigService();
      const result     = await gigService.blockHotelGigs(hotelId, reason);

      res.json(successResponse(result, "Hotel gigs blocked successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
);

export default router;
