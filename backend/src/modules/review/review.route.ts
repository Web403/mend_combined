import { Router } from "express";
import { ReviewController } from "./review.controller";
import { UserRole } from "../../shared/enums";
import { AdminRole } from "../../shared/enums/admin";

const router = Router();

const reviewController = new ReviewController();

const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];

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

export default router;
