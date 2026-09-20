import { nanoid } from "nanoid";
import {
  CreateReviewInput,
  HotelRatingSummary,
  HotelRatingSummaryBucket,
  IReview,
  ResolvedReviewContext,
  ReviewActor,
} from "../../shared/interfaces";
import { ReviewRelationship, ReviewType, UserRole } from "../../shared/enums";
import { ReviewRepository, HotelRatingSummaryRow } from "./review.repository";
import {
  ReviewEligibilityService,
  DuplicateReviewKey,
} from "./review.eligibility";
import { MongooseReviewDataGateway } from "./review.gateway";
import { ReviewError, ReviewErrors } from "./review.error";

/**
 * Review business flow:
 *
 *   ReviewController
 *        ↓
 *   ReviewService            (orchestration + persistence + error normalisation)
 *        ↓
 *   ReviewEligibilityService (relationship resolution, authorization,
 *                             relationship verification, validation)
 *
 * The service holds no role conditionals — every "may this reviewer review this
 * reviewee, because of which hotel/gig/booking" decision lives in the
 * eligibility engine.
 */
export class ReviewService {
  private repo = new ReviewRepository();
  private gateway = new MongooseReviewDataGateway();
  private eligibility = new ReviewEligibilityService({
    gateway: this.gateway,
    findExistingReview: (key: DuplicateReviewKey) =>
      this.repo.findExistingRelationshipReview(key),
  });

  // ── Write ───────────────────────────────────────────────────────────────────

  /**
   * Creates a review.
   *
   * `actor` is built by the controller exclusively from the authenticated
   * request, and `input` contains only client-controlled *content*: identity,
   * role, hotel, gig and reviewee are all re-derived and verified server-side,
   * so a body can never assert an authorization it does not have.
   */
  async createReview(
    actor: ReviewActor,
    input: CreateReviewInput,
  ): Promise<IReview> {
    const context = await this.eligibility.validateReviewEligibility(
      actor,
      input,
    );

    return this.persistReview(context);
  }

  private async persistReview(context: ResolvedReviewContext): Promise<IReview> {
    try {
      return await this.repo.create({
        id: `review_${nanoid(8)}`,
        userId: context.userId,
        postedBy: context.postedBy,
        revieweeId: context.revieweeId,
        revieweeRef: context.revieweeRef,
        revieweeRole: context.revieweeRole,
        reviewRelationship: context.reviewRelationship,
        hotelId: context.hotelId,
        gigId: context.gigId,
        bookingId: context.bookingId,
        jobId: context.jobId,
        reviewType: context.reviewType,
        rating: context.rating,
        review: context.review,
        feedbackRating: context.feedbackRating,
        feedbackReview: context.feedbackReview,
      } as Partial<IReview>);
    } catch (error) {
      throw this.mapPersistenceError(error);
    }
  }

  /**
   * Translates driver/schema failures into the module's own error vocabulary so
   * no internal database detail reaches the client.
   *
   * E11000 is the race-condition path: two identical submissions both pass the
   * pre-check, one wins the partial unique index, the loser becomes a 409.
   */
  private mapPersistenceError(error: any): ReviewError {
    if (error instanceof ReviewError) {
      return error;
    }

    if (error?.code === 11000) {
      return ReviewErrors.duplicateReview();
    }

    if (error?.name === "ValidationError") {
      const first = Object.values(error.errors ?? {})[0] as any;
      return ReviewErrors.validationFailed(
        first?.message ?? "The submitted review is not valid",
      );
    }

    if (error?.name === "CastError") {
      return ReviewErrors.validationFailed(
        "The submitted review contains an invalid identifier",
      );
    }

    return new ReviewError(
      "REVIEW_CREATE_FAILED",
      "Unable to save the review",
      500,
    );
  }

  /**
   * Hotel-scoped reads must always resolve to a concrete hotel. Mongoose drops
   * `undefined` filter values, so an unscoped query would silently widen to
   * every hotel — a cross-tenant leak.
   */
  private assertHotelScope(hotelId?: string) {
    if (!hotelId) {
      throw ReviewErrors.noHotelScope();
    }
  }

  // ── Existing reads (behaviour preserved) ────────────────────────────────────

  async getUserPostedGigReviews(userId: string) {
    const reviews = await this.repo.findByUser(userId, {
      filters: {
        postedBy: UserRole.STUDENT,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getUserFeedbackGigReviews(userId: string) {
    const reviews = await this.repo.findByUserOrReviewee(userId, {
      filters: {
        postedBy: UserRole.MANAGER,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getGigReviewsForHotel(hotelId: string) {
    // Guard: `hotelId` is optional in the query filter, and Mongoose strips
    // `undefined` values when casting — without this check a caller with no
    // hotel membership (any student) would receive every hotel's gig reviews.
    this.assertHotelScope(hotelId);

    const reviews = await this.repo.findByHotel(hotelId, {
      filters: {
        postedBy: UserRole.STUDENT,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getHotelsWithReviews(searchQuery?: string) {
    // find hotels with search query and return list of hotels with reviews
    const hotels = await this.repo.findHotelsWithReviews(searchQuery);
    return hotels;
  }

  async getGigReviewsPostedByHotel(hotelId: string) {
    this.assertHotelScope(hotelId);

    const reviews = await this.repo.findByHotel(hotelId, {
      filters: {
        postedBy: UserRole.HR,
        reviewType: ReviewType.GIG,
      },
    });
    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  // ── New reads ───────────────────────────────────────────────────────────────

  /**
   * Reviews about the caller as the *reviewee* — how an employee, manager or
   * student reads the feedback HR wrote about them, and how a hotel reads the
   * reviews its staff wrote about it.
   */
  async getUserReceivedReviews(
    revieweeId: string,
    filters: { reviewRelationship?: ReviewRelationship; hotelId?: string } = {},
  ) {
    const { reviews, total } = await this.repo.findByReviewee(revieweeId, {
      filters: {
        reviewRelationship: filters.reviewRelationship,
        hotelId: filters.hotelId,
      },
    });

    if (reviews.length === 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return { reviews, total };
  }

  /**
   * Computed hotel rating summary (average, total and 1–5 distribution).
   *
   * Deliberately read-only: `Hotel` has no stored rating field and nothing in
   * the codebase folded review ratings into a hotel score, so no aggregate is
   * persisted and existing rating semantics are unchanged.
   */
  async getHotelRatingSummary(hotelId: string): Promise<HotelRatingSummary> {
    const hotel = await this.gateway.findHotelById(hotelId);
    if (!hotel) {
      throw ReviewErrors.hotelNotFound();
    }

    const rows = await this.repo.aggregateHotelRatingSummary(hotel._id);
    return mapHotelRatingSummary(hotel._id, rows);
  }
}

/**
 * Pure mapping from aggregation rows to the API summary shape.
 * Exported for unit testing independently of MongoDB.
 */
export function mapHotelRatingSummary(
  hotelId: string,
  rows: HotelRatingSummaryRow[],
): HotelRatingSummary {
  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  let totalReviews = 0;
  let ratedReviews = 0;
  let ratingSum = 0;

  const byRelationship: HotelRatingSummaryBucket[] = [];

  for (const row of rows ?? []) {
    const ratings = (row.ratings ?? []).filter(
      (value): value is number => typeof value === "number" && value >= 1,
    );

    for (const value of ratings) {
      const star = String(Math.min(5, Math.max(1, Math.round(value))));
      distribution[star] = (distribution[star] ?? 0) + 1;
    }

    totalReviews += row.totalReviews ?? 0;
    ratedReviews += ratings.length;
    ratingSum += ratings.reduce((sum, value) => sum + value, 0);

    byRelationship.push({
      reviewRelationship: row._id as ReviewRelationship | "LEGACY",
      totalReviews: row.totalReviews ?? 0,
      averageRating: ratings.length
        ? roundToTwo(
            ratings.reduce((sum, value) => sum + value, 0) / ratings.length,
          )
        : null,
    });
  }

  return {
    hotelId,
    totalReviews,
    ratedReviews,
    averageRating: ratedReviews ? roundToTwo(ratingSum / ratedReviews) : null,
    distribution,
    byRelationship,
  };
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
