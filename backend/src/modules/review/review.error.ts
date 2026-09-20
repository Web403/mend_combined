export class ReviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/**
 * Every failure mode of the review system, expressed as a stable machine code
 * plus a client-safe message. Internal details (driver errors, cast errors,
 * stack traces) are never exposed through these messages.
 */
export const ReviewErrors = {
  reviewNotFound: () =>
    new ReviewError(
      "REVIEW_NOT_FOUND",
      "Unable to find the requested review",
      404,
    ),

  reviewsNotFound: () => new ReviewError("NO_REVIEWS", "No reviews found", 404),

  // ── 401 ────────────────────────────────────────────────────────────────────
  unauthenticated: () =>
    new ReviewError("UNAUTHENTICATED", "Authentication is required", 401),

  // ── 403 ────────────────────────────────────────────────────────────────────
  forbiddenReviewerRole: (relationship: string) =>
    new ReviewError(
      "FORBIDDEN_REVIEWER_ROLE",
      `Your role is not allowed to submit a ${relationship} review`,
      403,
    ),

  /** Reviewer and reviewee are not legitimately related. */
  invalidRelationship: (reason: string) =>
    new ReviewError("INVALID_REVIEW_RELATIONSHIP", reason, 403),

  /** A hotel-scoped read was attempted without any resolvable hotel context. */
  noHotelScope: () =>
    new ReviewError(
      "NO_HOTEL_SCOPE",
      "A hotel context is required to read these reviews",
      403,
    ),

  /** Reviewer is not attached to any hotel / organisation. */
  noHotelMembership: () =>
    new ReviewError(
      "NO_HOTEL_MEMBERSHIP",
      "Your account is not linked to a hotel, so this review is not allowed",
      403,
    ),

  /** The authenticated account is not a review-capable user. */
  reviewerNotFound: () =>
    new ReviewError(
      "REVIEWER_NOT_FOUND",
      "The authenticated account cannot submit reviews",
      403,
    ),

  reviewerSuspended: () =>
    new ReviewError(
      "REVIEWER_SUSPENDED",
      "Suspended accounts cannot submit reviews",
      403,
    ),

  // ── 404 ────────────────────────────────────────────────────────────────────
  revieweeNotFound: () =>
    new ReviewError("REVIEWEE_NOT_FOUND", "The review target does not exist", 404),

  hotelNotFound: () =>
    new ReviewError("HOTEL_NOT_FOUND", "Hotel not found", 404),

  gigNotFound: () => new ReviewError("GIG_NOT_FOUND", "Gig not found", 404),

  bookingNotFound: () =>
    new ReviewError(
      "BOOKING_NOT_FOUND",
      "No gig assignment found for this reviewer and gig",
      404,
    ),

  // ── 400 / 409 ──────────────────────────────────────────────────────────────
  /** A gig-scoped review was attempted before the gig was completed. */
  gigNotCompleted: () =>
    new ReviewError(
      "GIG_NOT_COMPLETED",
      "This review is only allowed after the gig has been marked as completed",
      400,
    ),

  duplicateReview: () =>
    new ReviewError(
      "DUPLICATE_REVIEW",
      "You have already submitted this review",
      409,
    ),

  validationFailed: (reason: string) =>
    new ReviewError("REVIEW_VALIDATION_FAILED", reason, 400),

  invalidId: (field: string) =>
    new ReviewError(
      "REVIEW_VALIDATION_FAILED",
      `${field} is not a valid identifier`,
      400,
    ),

  unsupportedRelationship: () =>
    new ReviewError(
      "UNSUPPORTED_REVIEW_RELATIONSHIP",
      "Unsupported review relationship",
      400,
    ),
} as const;
