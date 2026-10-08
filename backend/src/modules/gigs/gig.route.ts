// Gig routes are mounted at /api/v1/gigs (see modules/index.ts).
import { Router, Request, Response } from "express";
import { GigController } from "./gig.controller";
import { BookingController } from "./booking.controller";
import { GigApplicationController } from "./gig-application.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { adminAuthMiddleware } from "../../core/middleware/admin.middleware";
import { gigOrganizerMiddleware } from "./gig.middleware";
import { GigService } from "./gig.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";

const router = Router();
const gigCtrl = new GigController();
const bookingCtrl = new BookingController();
const applicationCtrl = new GigApplicationController();

// The gig module is mounted before global authentication; protect this router.
router.use(authMiddleware);

// Named worker routes before parameter routes.
router.get("/applications/mine", applicationCtrl.getMyApplications.bind(applicationCtrl));
router.get("/bookings/mine", bookingCtrl.getMyBookings.bind(bookingCtrl));

// Caterer / event-manager dashboards.
router.get("/stats", gigOrganizerMiddleware, gigCtrl.getGigStats.bind(gigCtrl));
router.get("/mine", gigOrganizerMiddleware, gigCtrl.getHotelGigs.bind(gigCtrl));

// Public authenticated gig marketplace.
router.get("/", gigCtrl.getPublicListings.bind(gigCtrl));
router.get("/:id", gigCtrl.getGigById.bind(gigCtrl));

// Gig creation and management — only caterer and event-manager accounts.
router.post("/", gigOrganizerMiddleware, gigCtrl.createGig.bind(gigCtrl));
router.put("/:id", gigOrganizerMiddleware, gigCtrl.updateGig.bind(gigCtrl));
router.patch("/:id/publish", gigOrganizerMiddleware, gigCtrl.publishGig.bind(gigCtrl));
router.patch("/:id/close", gigOrganizerMiddleware, gigCtrl.closeGig.bind(gigCtrl));
router.patch("/:id/cancel", gigOrganizerMiddleware, gigCtrl.cancelGig.bind(gigCtrl));

// Freelancer applications. /book remains as a backwards-compatible alias but
// now creates a pending application; it never hires without organizer approval.
router.post("/:id/apply", applicationCtrl.applyToGig.bind(applicationCtrl));
router.post("/:id/book", applicationCtrl.applyToGig.bind(applicationCtrl));
router.get(
  "/:id/applications",
  gigOrganizerMiddleware,
  applicationCtrl.getApplicationsForGig.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/withdraw",
  applicationCtrl.withdrawApplication.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/approve",
  gigOrganizerMiddleware,
  applicationCtrl.approveApplication.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/reject",
  gigOrganizerMiddleware,
  applicationCtrl.rejectApplication.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/vote",
  gigOrganizerMiddleware,
  applicationCtrl.voteForFreelancer.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/block",
  gigOrganizerMiddleware,
  applicationCtrl.blockFreelancer.bind(applicationCtrl),
);
router.patch(
  "/applications/:id/unblock",
  gigOrganizerMiddleware,
  applicationCtrl.unblockFreelancer.bind(applicationCtrl),
);

// Accepted applications become bookings. Worker and organizer actions are
// scoped to their own booking / tenant in the service layer.
router.get(
  "/:id/bookings",
  gigOrganizerMiddleware,
  bookingCtrl.getBookingsForGig.bind(bookingCtrl),
);
router.get("/bookings/:id", bookingCtrl.getBookingById.bind(bookingCtrl));
router.patch("/bookings/:id/cancel", bookingCtrl.cancelBooking.bind(bookingCtrl));
router.patch(
  "/bookings/:id/complete",
  gigOrganizerMiddleware,
  bookingCtrl.completeBooking.bind(bookingCtrl),
);
router.patch(
  "/bookings/:id/no-show",
  gigOrganizerMiddleware,
  bookingCtrl.noShowBooking.bind(bookingCtrl),
);
router.patch(
  "/bookings/:id/rate",
  gigOrganizerMiddleware,
  bookingCtrl.rateBooking.bind(bookingCtrl),
);
router.patch(
  "/bookings/:id/rate-organizer",
  bookingCtrl.rateOrganizer.bind(bookingCtrl),
);

// Mend-admin: block a hotel/caterer from posting gigs.
router.post(
  "/admin/hotels/:hotelId/block-gigs",
  adminAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const hotelId = req.params.hotelId as string;
      const { reason } = req.body as { reason: string };
      const result = await new GigService().blockHotelGigs(hotelId, reason);
      res.json(successResponse(result, "Hotel gigs blocked successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  },
);

export default router;
