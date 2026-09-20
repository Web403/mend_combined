// ─────────────────────────────────────────────────────────────────────────────
// modules/review/review.route.ts
//
// Mounted at /api/v1/review, behind the global `authMiddleware` +
// `tenantMiddleware` (see modules/index.ts), so every route requires a valid
// JWT.
//
// Route map:
//  POST /create-review                     — create a review (relationship aware)
//  GET  /get-user-posted-gig-reviews       — gig reviews the caller posted
//  GET  /get-user-feedback-gig-reviews     — gig feedback about the caller
//  GET  /get-gig-reviews-for-hotel         — the caller's hotel: gig reviews
//  GET  /get-gig-review-posted-by-hotel    — the caller's hotel: hotel-side reviews
//  GET  /get-hotels-with-reviews           — hotels grouped with their reviews
//  GET  /get-user-received-reviews         — reviews where the caller is the reviewee
//  GET  /get-hotel-rating-summary          — computed hotel rating aggregate
//
// Authorization is enforced in the service/eligibility layer, not here: who may
// review whom depends on database relationships (hotel membership, completed gig
// bookings), which a route-level role guard cannot express.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { ReviewController } from "./review.controller";

const router = Router();

const reviewController = new ReviewController();

router.post(
  "/create-review",
  reviewController.createReview.bind(reviewController),
);

router.get(
  "/get-user-posted-gig-reviews",
  reviewController.getUserPostedGigReviews.bind(reviewController),
);

router.get(
  "/get-user-feedback-gig-reviews",
  reviewController.getUserFeedbackGigReviews.bind(reviewController),
);

router.get(
  "/get-gig-reviews-for-hotel",
  reviewController.getGigReviewsForHotel.bind(reviewController),
);

router.get(
  "/get-hotels-with-reviews",
  reviewController.getHotelsWithReviews.bind(reviewController)
)

router.get(
  "/get-gig-review-posted-by-hotel",
  reviewController.getGigReviewsPostedByHotel.bind(reviewController),
);

router.get(
  "/get-user-received-reviews",
  reviewController.getUserReceivedReviews.bind(reviewController),
);

router.get(
  "/get-hotel-rating-summary",
  reviewController.getHotelRatingSummary.bind(reviewController),
);

export default router;
